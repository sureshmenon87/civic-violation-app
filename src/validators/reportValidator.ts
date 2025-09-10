import { z } from "zod";

export const createReportSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 chars"),
  description: z.string().optional(),
  categories: z.union([z.string(), z.array(z.string())]).optional(),
  locationLng: z.preprocess((v) => Number(v), z.number().min(-180).max(180)),
  locationLat: z.preprocess((v) => Number(v), z.number().min(-90).max(90)),
});

export const updateReportSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  categories: z.union([z.string(), z.array(z.string())]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z
    .enum(["open", "triaged", "inspected", "resolved", "rejected"])
    .optional(),
  locationLng: z
    .preprocess(
      (v) => (v !== undefined ? Number(v) : undefined),
      z.number().min(-180).max(180)
    )
    .optional(),
  locationLat: z
    .preprocess(
      (v) => (v !== undefined ? Number(v) : undefined),
      z.number().min(-90).max(90)
    )
    .optional(),
});
