// src/controllers/reportController.ts
import { Request, Response, NextFunction } from "express";
import {
  createReportWithOptionalFile,
  hardDeleteReport,
  listReports,
  softDeleteReport,
  updateReport,
} from "../services/reportService.js";
import { CategoryModel } from "../models/Category.js";
import { CommentModel } from "../models/Comment.js";
import { ReportModel } from "../models/Report.js";

export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const {
      title,
      description,
      locationLng,
      locationLat,
      categories = [],
    } = req.body;
    // Parse categories that might be sent as JSON string or array or comma string

    // categories is already normalized to array by middleware
    const catKeys: string[] = Array.isArray(categories)
      ? categories.map(String)
      : [];

    // Validate categories exist in DB (dynamic categories approach)
    if (catKeys.length) {
      const found = await CategoryModel.find({ key: { $in: catKeys } }).lean();
      if (found.length !== catKeys.length) {
        const foundKeys = new Set(found.map((c: any) => c.key));
        const invalid = catKeys.filter((k) => !foundKeys.has(k));
        return res.status(400).json({ error: "Invalid categories", invalid });
      }
    }

    // validate coords
    const lng = Number(locationLng);
    const lat = Number(locationLat);
    if (!isFinite(lng) || !isFinite(lat)) {
      return res.status(400).json({ error: "Invalid location coordinates" });
    }
    // Validate categories against DB
    const allowed = await CategoryModel.find({
      key: { $in: categories },
    }).lean();
    if (allowed.length !== categories.length) {
      // find invalid keys
      const allowedKeys = new Set(allowed.map((c) => c.key));
      const invalid = categories.filter((c) => !allowedKeys.has(c));
      return res.status(400).json({ error: "Invalid categories", invalid });
    }

    const file = (req as any).file as Express.Multer.File | undefined;

    const report = await createReportWithOptionalFile({
      title,
      description,
      categories,
      reporterId: userId,
      lng: Number(locationLng),
      lat: Number(locationLat),
      file,
    });

    return res.status(201).json(report);
  } catch (err) {
    return next(err);
  }
};
export const getReport = async (req, res) => {
  try {
    const id = req.params.id;
    const report = await ReportModel.findById(id).lean();
    if (!report) return res.status(404).json({ error: "Not found" });

    // populate categories details if you stored keys
    const cats = await CategoryModel.find({
      key: { $in: report.categories || [] },
    }).lean();
    const commentsCount = await CommentModel.countDocuments({ reportId: id });

    res.json({ data: { report, categories: cats, commentsCount } });
  } catch (err) {
    console.error("getReport error", err);
    res.status(500).json({ error: "Failed to load report" });
  }
};
export const getReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const results = await listReports(req, res);
    res.json(results);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/reports/:id
 * Accept form-data if uploading file; otherwise JSON body for fields
 */
export const updateReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const actorId = (req as any).auth?.sub;
    const actorRole = (req as any).auth?.role;
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const reportId = req.params.id;
    const payload = {
      title: req.body.title,
      description: req.body.description,
      categories: req.body.categories,
      priority: req.body.priority,
      status: req.body.status,
      lng: req.body.locationLng ? Number(req.body.locationLng) : undefined,
      lat: req.body.locationLat ? Number(req.body.locationLat) : undefined,
    };

    const file = (req as any).file as Express.Multer.File | undefined;

    const updated = await updateReport({
      reportId,
      actorId,
      actorRole,
      payload,
      file,
    });

    res.json(updated);
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

export const deleteReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const actorId = (req as any).auth?.sub;
    const actorRole = (req as any).auth?.role;
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const reportId = req.params.id;
    const report = await ReportModel.findById(reportId);
    if (!report) return 404;
    const userId = req.auth.sub;
    if (
      String(report.reporterId) !== String(userId) &&
      req.auth.role !== "admin"
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const soft = req.query.soft !== "false"; // default true (soft delete)

    if (soft) {
      const r = await softDeleteReport({ reportId, actorId, actorRole });
      return res.json({ ok: true, report: r });
    } else {
      // hard delete (admin only)
      const r = await hardDeleteReport({ reportId, actorId, actorRole });
      return res.json(r);
    }
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};
