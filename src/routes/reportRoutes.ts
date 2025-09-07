import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { upload } from "../lib/upload.js";
import {
  createReport,
  listReports,
  getReport,
  updateReport,
  deleteReport,
} from "../controllers/reportController.js";
import {
  validateCreateReport,
  validateUpdateReport,
} from "../validators/reportValidator.js";

const router = express.Router();

// Create: supports multipart (photos) and JSON fields
// If you're POSTing JSON with photos URLs, you can skip multipart and just send body
router.post(
  "/",
  requireAuth,
  upload.array("photos", 5),
  validateCreateReport,
  createReport
);

// List & create
router.get("/", listReports);

// Single
router.get("/:id", getReport);

// Update (owner/admin). Accepts multipart to add photos
router.patch(
  "/:id",
  requireAuth,
  upload.array("photos", 5),
  validateUpdateReport,
  updateReport
);

// Soft delete
router.delete("/:id", requireAuth, deleteReport);

export default router;
