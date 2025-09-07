import mongoose, { Schema, Document } from "mongoose";

export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string; // hash(plainToken)
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
  replacedByToken?: string | null; // tokenHash of the replacement (optional)
  ip?: string | null;
  userAgent?: string | null;
  fingerprint?: string | null; // optional device fingerprint
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
    replacedByToken: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    fingerprint: { type: String, default: null },
  },
  { timestamps: false }
);

export const RefreshTokenModel = mongoose.model<IRefreshToken>(
  "RefreshToken",
  RefreshTokenSchema
);
