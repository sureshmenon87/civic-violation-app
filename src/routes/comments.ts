// src/routes/comments.ts
import express from "express";
import {
  listComments,
  postComment,
  removeComment,
} from "../controllers/commentController.js";
import { requireAuth } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// simple rate limiter for comments to avoid spam
const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

router.get("/report/:reportId", listComments);
router.post("/report/:reportId", commentLimiter, postComment);
router.delete("/:id", requireAuth(), removeComment);

export default router;
