import { Request, Response, NextFunction } from "express";
import { ReportModel } from "../models/Report.js";
import mongoose from "mongoose";
import { logger } from "../lib/logger.js";

/**
 * Helper: build Mongo query from filters
 */
const buildQueryFromFilters = (q: any) => {
  const query: any = { deletedAt: null };

  if (q.status) query.status = q.status;
  if (q.category) query.categories = q.category; // exact match or use $in if multiple
  if (q.reporterId) {
    if (mongoose.Types.ObjectId.isValid(q.reporterId))
      query.reporterId = q.reporterId;
  }
  if (q.q) {
    // full text search
    query.$text = { $search: q.q };
  }
  // bounding box or near can be added by client with lat/lng and radius
  if (q.lat && q.lng && q.radiusMeters) {
    const lat = parseFloat(q.lat);
    const lng = parseFloat(q.lng);
    const radiusMeters = parseFloat(q.radiusMeters);
    query.location = {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    };
  }
  return query;
};

/**
 * POST /api/v1/reports
 * multipart form for photos allowed
 */
export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).auth;
    const body = (req as any).validatedBody;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const photoPaths = files.map((f) => `/uploads/${f.filename}`);

    const doc = new ReportModel({
      title: body.title,
      description: body.description,
      reporterId: user?.sub ? mongoose.Types.ObjectId(user.sub) : undefined,
      location: {
        type: "Point",
        coordinates: [body.location.lng, body.location.lat],
      },
      categories: body.categories ?? [],
      photos: photoPaths,
      priority: body.priority ?? "medium",
    });

    await doc.save();
    logger.info("Report created", {
      reportId: doc._id.toString(),
      reporterId: user?.sub ?? null,
    });
    res.status(201).json({ report: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports
 * supports pagination: page (1-based), limit
 * filters: status, category, q (full-text), lat,lng,radiusMeters
 */
export const listReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = req.query;
    const page = Math.max(1, parseInt((q.page as string) ?? "1", 10));
    const limit = Math.min(100, parseInt((q.limit as string) ?? "10", 10));
    const skip = (page - 1) * limit;

    const query = buildQueryFromFilters(q);

    const [items, total] = await Promise.all([
      ReportModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReportModel.countDocuments(query),
    ]);

    res.json({ meta: { page, limit, total }, items });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/:id
 */
export const getReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const doc = await ReportModel.findById(id).where({ deletedAt: null });
    if (!doc) return res.status(404).json({ error: "Not found" });

    res.json({ report: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/reports/:id
 * Only owner (reporterId) or admin can update
 */
export const updateReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const body = (req as any).validatedBody ?? {};
    const user = (req as any).auth;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const report = await ReportModel.findById(id);
    if (!report || report.deletedAt)
      return res.status(404).json({ error: "Not found" });

    const isOwner = user?.sub && report.reporterId?.toString() === user.sub;
    const isAdmin = user?.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ error: "Forbidden" });

    // apply allowed updates
    if (body.title !== undefined) report.title = body.title;
    if (body.description !== undefined) report.description = body.description;
    if (body.location)
      report.location = {
        type: "Point",
        coordinates: [body.location.lng, body.location.lat],
      };
    if (body.categories) report.categories = body.categories;
    if (body.status) report.status = body.status;
    if (body.priority) report.priority = body.priority;

    // if files were uploaded (optional)
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length) {
      const photoPaths = files.map((f) => `/uploads/${f.filename}`);
      report.photos = report.photos.concat(photoPaths);
    }

    report.audit = report.audit ?? [];
    report.audit.push({
      by: user?.sub ?? "system",
      at: new Date(),
      action: "updated",
    });

    await report.save();
    logger.info("Report updated", {
      reportId: report._id.toString(),
      by: user?.sub ?? null,
    });
    res.json({ report });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/reports/:id  (soft delete)
 * Only owner or admin
 */
export const deleteReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = (req as any).auth;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const report = await ReportModel.findById(id);
    if (!report || report.deletedAt)
      return res.status(404).json({ error: "Not found" });

    const isOwner = user?.sub && report.reporterId?.toString() === user.sub;
    const isAdmin = user?.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ error: "Forbidden" });

    report.deletedAt = new Date();
    report.audit = report.audit ?? [];
    report.audit.push({
      by: user?.sub ?? "system",
      at: new Date(),
      action: "deleted",
    });

    await report.save();
    logger.info("Report soft-deleted", {
      reportId: report._id.toString(),
      by: user?.sub ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
