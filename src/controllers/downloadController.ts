// src/controllers/downloadController.ts
import { Request, Response, NextFunction } from "express";
import { getDownloadHandler } from "../services/storage.js";
import { ReportModel } from "../models/Report.js";
import { logger } from "../lib/logger.js";

/**
 * GET /api/v1/reports/download/:id
 * - id: storage key (GridFS ObjectId string OR S3/GCS key)
 *
 * Authorization:
 * - If PUBLIC_DOWNLOADS=true -> allow anonymous
 * - Else requireAuth() middleware must run and user must be owner or admin
 */
export const downloadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.params.id;
    if (!key) return res.status(400).json({ error: "Missing file id" });

    const isPublicDownloads =
      String(process.env.PUBLIC_DOWNLOADS || "false").toLowerCase() === "true";

    // If public downloads are disabled, ensure req.auth exists and user is authorized
    const auth = (req as any).auth as
      | { sub?: string; role?: string }
      | undefined;
    if (!isPublicDownloads) {
      if (!auth?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Find the report that references this photo key
      const report = await ReportModel.findOne({ "photos.key": key }).select(
        "reporterId photos"
      );
      if (!report) {
        // Might be a direct upload not linked to a report; decide default behavior (deny)
        return res.status(404).json({ error: "File not found" });
      }

      const isOwner = report.reporterId?.toString() === auth.sub;
      const isAdmin = auth.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      // authorized — continue
    } else {
      // PUBLIC_DOWNLOADS=true; allow through but still log
      logger.info("public download allowed", { key });
    }

    // Now get the backend-specific download handler (stream or signed url)
    const result = await getDownloadHandler(key);

    if (result.type === "stream") {
      const { stream, metadata } = result as any;
      // Set sensible headers if we have metadata
      if (metadata?.contentType)
        res.setHeader("Content-Type", metadata.contentType);
      if (metadata?.filename)
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${metadata.filename}"`
        );
      stream.on("error", (err: any) => {
        logger.error("GridFS stream error", { err });
        next(err);
      });
      stream.pipe(res);
      return;
    }

    // url case (S3/GCS): redirect to signed url
    const { url } = result as any;
    // We redirect with 302 so client downloads from cloud
    res.redirect(url);
  } catch (err: any) {
    logger.error("downloadFile error", { err: err?.message || err });
    // if the error has a status we pass it, otherwise 500
    if (err?.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};
