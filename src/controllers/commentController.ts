// src/controllers/commentController.ts
import { Request, Response } from "express";
import * as commentService from "../services/commentService.js";
import { CommentModel } from "../models/Comment.js";

/**
 * GET /api/v1/comments/report/:reportId
 * List comments for a report
 */
export const listComments = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    if (!reportId) return res.status(400).json({ error: "reportId required" });

    const data = await commentService.listCommentsForReport(reportId);
    res.json({ data });
  } catch (err: any) {
    console.error("listComments error", err);
    res.status(500).json({ error: "Failed to load comments" });
  }
};

/**
 * POST /api/v1/comments/report/:reportId
 * Add a comment (auth optional)
 */
export const postComment = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { text, name } = req.body;
    console.log(req.body);

    if (!reportId) return res.status(400).json({ error: "reportId required" });
    if (!text || !text.trim())
      return res.status(400).json({ error: "Comment text required" });

    const userId = (req as any).auth?.sub || null;
    const displayName = userId ? undefined : name || "Anonymous";

    const comment = await commentService.createComment(
      reportId,
      userId,
      displayName,
      text.trim()
    );

    res.status(201).json({ data: comment });
  } catch (err: any) {
    console.error("postComment error", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
};

/**
 * DELETE /api/v1/comments/:id
 * Remove a comment (owner or admin only)
 */
export const removeComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "id required" });

    const auth = (req as any).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const comment = await CommentModel.findById(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    // Allow delete only by owner or admin
    if (String(comment.userId) !== String(auth.sub) && auth.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await commentService.deleteComment(id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("removeComment error", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};
