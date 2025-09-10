// src/controllers/downloadController.ts
import { Request, Response, NextFunction } from "express";
import { getDownloadHandler } from "../services/storage.js";
import { logger } from "../lib/logger.js";

export const downloadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params; // here id is storage key (GridFS ObjectId or S3/GCS key)
    const result = await getDownloadHandler(id);

    if (result.type === "stream") {
      // GridFS stream case
      const { stream } = result as any;
      // Optionally set headers (if you have metadata)
      res.setHeader("Content-Disposition", `inline; filename="${id}"`);
      stream.on("error", (err: any) => {
        logger.error("GridFS stream error", { err });
        next(err);
      });
      stream.pipe(res);
      return;
    }

    // url case: redirect client to signed URL
    const { url } = result as any;
    // Option A: redirect to signed url
    res.redirect(url);
    // Option B: proxy the request through server (not implemented) if you want
    return;
  } catch (err) {
    next(err);
  }
};
