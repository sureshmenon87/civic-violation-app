// src/controllers/reportController.ts
import { Request, Response, NextFunction } from "express";
import {
  createReportWithOptionalFile,
  hardDeleteReport,
  listReports,
  softDeleteReport,
  updateReport,
} from "../services/reportService.js";

export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { title, description, categories, locationLng, locationLat } =
      req.body;
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

export const getReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = Number(req.query.limit || 50);
    const skip = Number(req.query.skip || 0);
    const results = await listReports({ limit, skip });
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
