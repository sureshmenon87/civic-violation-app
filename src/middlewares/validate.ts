import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * validate(schema)
 * - Validates req.body against the provided Zod schema
 * - Returns 400 with details if validation fails
 */
export const validate = (schema: ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse body with zod schema (throws on failure)
      const parsed = schema.parse(req.body);

      // Save parsed values for controller (safer than raw req.body)
      (req as any).validated = parsed;

      return next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const details = err.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({ error: "Validation failed", details });
      }
      return next(err);
    }
  };
};
