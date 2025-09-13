// src/middlewares/normalizeCategories.ts
import { Request, Response, NextFunction } from "express";

export default function normalizeCategories(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    let raw = req.body?.categories;
    if (!raw) {
      req.body.categories = [];
      return next();
    }

    // If already an array, keep it
    if (Array.isArray(raw)) {
      req.body.categories = raw.map(String);
      return next();
    }

    // If it's a string, try JSON parse -> array
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            req.body.categories = parsed.map(String);
            return next();
          }
        } catch (e) {
          // fallthrough to comma split
        }
      }

      // fallback: comma-separated list
      req.body.categories = trimmed.length
        ? trimmed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      return next();
    }

    // any other type -> coerce to array
    req.body.categories = [String(raw)];
    return next();
  } catch (err) {
    // on error, coerce to empty array so validator produces a clear message
    req.body.categories = [];
    return next();
  }
}
