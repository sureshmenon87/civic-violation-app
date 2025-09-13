// src/routes/reportRoutes.ts
import express from "express";
import requireAuth from "../middlewares/auth.js";
import { uploadSingle } from "../middlewares/multerUpload.js";
import {
  createReport,
  getReports,
  updateReportController,
  deleteReportController,
  getReport,
} from "../controllers/reportController.js";
import { downloadFile } from "../controllers/downloadController.js";
import { validate } from "../middlewares/validate.js";
import {
  createReportSchema,
  updateReportSchema,
} from "../validators/reportValidator.js";
import { downloadLimiter } from "../middlewares/rateLimiter.js";
import normalizeCategories from "../middlewares/normalizeCategories.js";

const router = express.Router();

/**
 * @route POST /api/v1/reports
 * @desc Create a new report (with optional file upload)
 */
router.post(
  "/",
  requireAuth(),
  (req, res, next) => {
    uploadSingle(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      return next();
    });
  },
  normalizeCategories,
  validate(createReportSchema),

  createReport
);

/**
 * @route GET /api/v1/reports:id
 * @desc List reports
 */
router.get("/:id", requireAuth(), getReport);

/**
 * @route GET /api/v1/reports
 * @desc List reports
 */
router.get("/", getReports);

/**
 * @route PUT /api/v1/reports/:id
 * @desc Update a report (owner or admin, optional file upload)
 */
router.put(
  "/:id",
  requireAuth(),
  (req, res, next) => {
    uploadSingle(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      return next();
    });
  },
  validate(updateReportSchema),
  updateReportController
);

/**
 * @route DELETE /api/v1/reports/:id
 * @desc Delete a report (soft delete by default, ?soft=false for hard delete by admin)
 */
router.delete("/:id", requireAuth(), deleteReportController);

/**
 * @route GET /api/v1/reports/download/:id
 * @desc Download or redirect to file (GridFS streams, S3/GCS signed URL)
 */
router.get("/download/:id", downloadLimiter, downloadFile);

export default router;
