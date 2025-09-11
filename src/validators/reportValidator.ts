// src/validators/reportValidators.ts
import { z } from "zod";
import { CATEGORIES } from "../constants/categories.js";

/**
 * Create Report payload
 * - title required
 * - description optional
 * - categories optional (array of strings or comma-separated string handled upstream)
 * - locationLng / locationLat accept strings (from form-data) and are preprocessed to numbers
 */
export const createReportSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  // Accept either an array of strings or a single comma-separated string in controllers if needed.
  categories: z.array(z.enum(CATEGORIES)).optional(),
  locationLng: z.preprocess(
    (val) => (val === undefined || val === "" ? undefined : Number(val)),
    z
      .number({
        required_error: "locationLng is required",
        invalid_type_error: "locationLng must be a number",
      })
      .min(-180, "locationLng must be >= -180")
      .max(180, "locationLng must be <= 180")
  ),
  locationLat: z.preprocess(
    (val) => (val === undefined || val === "" ? undefined : Number(val)),
    z
      .number({
        required_error: "locationLat is required",
        invalid_type_error: "locationLat must be a number",
      })
      .min(-90, "locationLat must be >= -90")
      .max(90, "locationLat must be <= 90")
  ),
});

/**
 * Update Report payload (partial)
 * - All fields optional; numbers preprocessed same as create
 * - Use this for PUT / PATCH where only some fields may be provided.
 */
export const updateReportSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").optional(),
  description: z.string().optional(),
  categories: z.array(z.enum(CATEGORIES)).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z
    .enum(["open", "triaged", "inspected", "resolved", "rejected"])
    .optional(),
  locationLng: z.preprocess(
    (val) => (val === undefined || val === "" ? undefined : Number(val)),
    z
      .number()
      .min(-180, "locationLng must be >= -180")
      .max(180, "locationLng must be <= 180")
      .optional()
  ),
  locationLat: z.preprocess(
    (val) => (val === undefined || val === "" ? undefined : Number(val)),
    z
      .number()
      .min(-90, "locationLat must be >= -90")
      .max(90, "locationLat must be <= 90")
      .optional()
  ),
});
