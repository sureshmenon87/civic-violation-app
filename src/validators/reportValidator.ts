import { z, ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";

const createReportSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  // lat/lng floats
  location: z.object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
  }),
  categories: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const updateReportSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  location: z
    .object({
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
    })
    .optional(),
  categories: z.array(z.string()).optional(),
  status: z
    .enum(["open", "triaged", "inspected", "resolved", "rejected"])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const validateCreateReport = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const body = { ...req.body };
    // convert possible query strings to numbers if necessary — assume client sends JSON numbers
    const parsed = createReportSchema.parse(body);
    // attach normalized payload
    (req as any).validatedBody = parsed;
    next();
  } catch (e) {
    if (e instanceof ZodError) {
      return (res as Response).status(400).json({ error: e.errors });
    }
    next(e);
  }
};

export const validateUpdateReport = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const body = { ...req.body };
    const parsed = updateReportSchema.parse(body);
    (req as any).validatedBody = parsed;
    next();
  } catch (e) {
    if (e instanceof ZodError) {
      return (res as Response).status(400).json({ error: e.errors });
    }
    next(e);
  }
};
