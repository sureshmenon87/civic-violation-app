// src/services/reportService.ts
import { ReportModel } from "../models/Report.js";
import mongoose from "mongoose";
import { saveFile } from "./storage.js";
import { logger } from "../lib/logger.js";
import { deleteFile } from "./storage.js";
// src/controllers/reportController.ts
import { Request, Response } from "express";

export async function createReportWithOptionalFile(opts: {
  title: string;
  description?: string;
  categories?: string[] | string;
  reporterId: string;
  lng: number;
  lat: number;
  file?: Express.Multer.File; // optional
}) {
  const { title, description, categories, reporterId, lng, lat, file } = opts;
  const photos: any[] = [];

  if (file) {
    const stored = await saveFile(file);
    photos.push({
      storage: stored.storage,
      key: stored.key,
      url: stored.url || null,
      mime: stored.mime || null,
      size: stored.size || null,
      uploadedAt: new Date(),
    });
  }

  const report = await ReportModel.create({
    title,
    description,
    reporterId: new mongoose.Types.ObjectId(reporterId),
    location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
    categories: categories
      ? Array.isArray(categories)
        ? categories
        : [categories]
      : [],
    photos,
    status: "open",
  });

  logger.info("Created report", {
    id: report._id.toString(),
    createdBy: reporterId,
  });
  return report;
}

export const listReports = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(100, parseInt(String(req.query.limit || "10"), 10));
    const sort = String(req.query.sort || "newest"); // newest | oldest
    const category = req.query.category ? String(req.query.category) : null;

    const skip = (page - 1) * limit;
    const sortObj = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const match: any = { deletedAt: null };
    if (category) match.categories = category; // categories is array; match element

    const [data, total] = await Promise.all([
      ReportModel.find(match)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      ReportModel.countDocuments(match).exec(),
    ]);

    res.json({
      data,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("listReports error", err);
    res.status(500).json({ error: "Failed to list reports" });
  }
};

/**
 * Update a report (partial update). Only owner or admin allowed.
 * - can update fields: title, description, categories, priority, status, location
 * - optionally accept a single file (Express.Multer.File) to append to photos
 */
export async function updateReport(opts: {
  reportId: string;
  actorId: string; // user performing the update
  actorRole?: string | null;
  payload: Partial<{
    title: string;
    description: string;
    categories: string[] | string;
    priority: "low" | "medium" | "high";
    status: "open" | "triaged" | "inspected" | "resolved" | "rejected";
    lng: number;
    lat: number;
  }>;
  file?: Express.Multer.File | null;
}) {
  const { reportId, actorId, actorRole, payload, file } = opts;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new Error("Invalid report id");
  }

  const report = await ReportModel.findById(reportId);
  if (!report) throw new Error("Report not found");

  // authorization: owner or admin
  const isOwner = report.reporterId?.toString() === actorId;
  const isAdmin = actorRole === "admin";
  if (!isOwner && !isAdmin) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  // Apply allowed updates
  const up: any = {};
  if (payload.title !== undefined) up.title = payload.title;
  if (payload.description !== undefined) up.description = payload.description;
  if (payload.priority !== undefined) up.priority = payload.priority;
  if (payload.status !== undefined) up.status = payload.status;
  if (payload.categories !== undefined) {
    up.categories = Array.isArray(payload.categories)
      ? payload.categories
      : [payload.categories];
  }
  if (payload.lng !== undefined && payload.lat !== undefined) {
    up.location = {
      type: "Point",
      coordinates: [Number(payload.lng), Number(payload.lat)],
    };
  }

  // If file included, persist using storage service and append to photos
  if (file) {
    const stored = await saveFile(file);
    const photo = {
      storage: stored.storage,
      key: stored.key,
      url: stored.url || null,
      mime: stored.mime || null,
      size: stored.size || null,
      uploadedAt: new Date(),
    };
    // push to existing photos
    report.photos = report.photos || [];
    report.photos.push(photo);
  }

  // assign updates
  Object.assign(report, up);

  // append audit entry
  const actorLabel = actorId;
  report.audit = report.audit || [];
  report.audit.push({ by: actorLabel, at: new Date(), action: "updated" });

  await report.save();
  logger.info("Report updated", { reportId, by: actorLabel });
  return report;
}

/**
 * Soft-delete a report (set deletedAt + audit). Only owner or admin allowed.
 */
export async function softDeleteReport(opts: {
  reportId: string;
  actorId: string;
  actorRole?: string | null;
}) {
  const { reportId, actorId, actorRole } = opts;
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new Error("Invalid report id");
  }
  const report = await ReportModel.findById(reportId);
  if (!report) throw new Error("Report not found");

  const isOwner = report.reporterId?.toString() === actorId;
  const isAdmin = actorRole === "admin";
  if (!isOwner && !isAdmin) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  report.deletedAt = new Date();
  report.audit = report.audit || [];
  report.audit.push({ by: actorId, at: new Date(), action: "deleted" });

  await report.save();
  logger.info("Report soft-deleted", { reportId, by: actorId });
  return report;
}

export async function hardDeleteReport(opts: {
  reportId: string;
  actorId: string;
  actorRole?: string | null;
}) {
  const { reportId, actorId, actorRole } = opts;
  if (actorRole !== "admin") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(reportId))
    throw new Error("Invalid report id");
  const report = await ReportModel.findById(reportId);
  if (!report) throw new Error("Report not found");

  // delete associated files
  for (const photo of report.photos || []) {
    try {
      await deleteFile(photo.key);
    } catch (e) {
      logger.error("Failed to delete file", {
        key: photo.key,
        err: (e as any).message,
      });
    }
  }

  await report.deleteOne();
  logger.info("Report hard-deleted", { reportId, by: actorId });

  return { ok: true };
}
