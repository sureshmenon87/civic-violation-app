import { ZodObject } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      // zod parse merges body, query, params
      schema.parse({ ...req.body, ...req.query, ...req.params });
      next();
    } catch (e: any) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: e.errors });
    }
  };
