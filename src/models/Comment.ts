// src/models/Comment.ts
import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema({
  reportId: {
    type: Schema.Types.ObjectId,
    ref: "Report",
    index: true,
    required: true,
  },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
  name: { type: String }, // for unauthenticated comments optional
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const CommentModel = mongoose.model("Comment", CommentSchema);
