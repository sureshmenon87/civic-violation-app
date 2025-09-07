import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { UserModel } from "../models/User.js";
import reportsRouter from "./reportRoutes.js";

const router = express.Router();

// Protected profile endpoint
router.get("/profile", requireAuth(), async (req, res) => {
  console.log("in profile");
  const auth = (req as any).auth as { sub: string; [k: string]: any };
  const user = await UserModel.findById(auth.sub).select(
    "email name avatar role provider"
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// Mount reports routes at /api/v1/reports
router.use("/reports", reportsRouter);

export default router;
