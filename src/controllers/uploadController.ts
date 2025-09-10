// src/controllers/uploadController.ts
import type { Request, Response, NextFunction } from "express";
import { getGridFSBucket } from "../utils/gridfs.js";
import { Readable } from "stream";
import crypto from "crypto";
import { logger } from "../lib/logger.js";
import mongodb from "mongodb";

/**
 * POST /api/v1/uploads
 * - expects a multipart/form-data with field 'file'
 * - requires requireAuth() middleware
 */
export const uploadHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // multer has put file buffer on req.file
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: "No file provided" });

    const bucket = getGridFSBucket();

    // sanitize filename & create unique name
    const original = file.originalname || "file";
    const ext = original.includes(".")
      ? original.slice(original.lastIndexOf("."))
      : "";
    const random = crypto.randomBytes(6).toString("hex");
    const filename = `${Date.now()}-${random}${ext}`;

    // metadata: store uploader id if available
    const metadata: any = {
      uploadedBy: (req as any).auth?.sub || null,
      mime: file.mimetype,
      size: file.size,
      originalName: original,
    };

    const readable = new Readable();
    readable.push(file.buffer);
    readable.push(null);

    const uploadStream = bucket.openUploadStream(filename, {
      metadata,
      contentType: file.mimetype,
    });

    readable
      .pipe(uploadStream)
      .on("error", (err) => {
        logger.error("GridFS upload error", { err });
        next(err);
      })
      .on("finish", () => {
        const fileId = uploadStream.id;
        const result = {
          id: fileId.toString(),
          filename,
          size: file.size,
          mime: file.mimetype,
          storage: "gridfs",
          downloadUrl: `/api/v1/reports/download/${fileId.toString()}`,
        };
        (res as any).locals.uploadResult = result;

        // If this handler was called directly (no next route), send JSON.
        // Detect if response has been sent yet; otherwise send.
        if (!res.headersSent) {
          res.status(201).json(result);
        } else {
          next();
        }
      });
  } catch (err) {
    logger.error("uploadHandler failed", { err });
    next(err);
  }
};

/**
 * GET /api/v1/uploads/:id
 * stream file back to client
 */
export const downloadHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const bucket = getGridFSBucket();
    // id can be hex string or ObjectId - pass directly
    const _id = typeof id === "string" ? id : id.toString();

    // find file document
    const filesColl = bucket.find({
      _id: new mongodb.ObjectId(_id),
    });
    const files = await filesColl.toArray();
    if (!files || files.length === 0)
      return res.status(404).json({ error: "File not found" });

    const fileDoc = files[0];
    res.setHeader(
      "Content-Type",
      fileDoc.contentType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${
        fileDoc.filename || fileDoc.metadata?.originalName || "file"
      }"`
    );

    const downloadStream = bucket.openDownloadStream(new mongodb.ObjectId(_id));
    downloadStream.on("error", (err) => {
      logger.error("GridFS download error", { err });
      next(err);
    });
    downloadStream.pipe(res);
  } catch (err) {
    next(err);
  }
};
