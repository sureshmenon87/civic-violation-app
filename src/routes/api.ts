// src/routes/api.ts
import express, { Request, Response, NextFunction } from "express";
import requireAuth from "../middlewares/auth.js";
import { UserModel } from "../models/User.js";
import reportsRouter from "./reportRoutes.js";

const router = express.Router();

/**
 * asyncHandler - small helper to forward async errors to Express error handler
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

/**
 * GET /profile
 * Protected - returns current user's profile
 */
router.get(
  "/profile",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const auth = (req as any).auth as
      | { sub?: string; [k: string]: any }
      | undefined;
    if (!auth?.sub) return res.status(401).json({ error: "Unauthorized" });

    const user = await UserModel.findById(auth.sub)
      .select("email name avatar role provider")
      .lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  })
);

// Mount reports routes at /reports -> full path will be /api/v1/reports when this router
// is mounted at /api/v1 in your main index.ts
router.use("/reports", reportsRouter);

export default router;
