// src/services/commentService.ts
import { CommentModel } from "../models/Comment.js";
import { ReportModel } from "../models/Report.js";
import mongoose from "mongoose";

export const listCommentsForReport = async (reportId: string) => {
  const comments = await CommentModel.find({
    reportId: new mongoose.Types.ObjectId(reportId),
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec()
    .then((rows) =>
      rows.map((r) => ({
        ...r,
        authorName: r.userId?.name ?? r.name,
        authorAvatar: r.userId?.avatar ?? null,
      }))
    );
  return comments;
};

export const createComment = async (
  reportId: string,
  userId: string | null,
  name: string | undefined,
  text: string
) => {
  const comment = await CommentModel.create({
    reportId,
    userId: userId || null,
    name: userId ? undefined : name || "Anonymous",
    text,
    createdAt: new Date(),
  });
  // optionally increment comment counter on report (denormalized)
  await ReportModel.updateOne({ _id: reportId }, { $inc: { commentCount: 1 } })
    .exec()
    .catch(() => {});
  return comment;
};

export const deleteComment = async (commentId: string) => {
  return CommentModel.findByIdAndDelete(commentId).exec();
};
