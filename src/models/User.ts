import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  provider: "google" | "github" | string;
  providerId: string;
  email: string;
  name?: string;
  avatar?: string;
  role: "citizen" | "inspector" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    provider: { type: String, required: true },
    providerId: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    name: { type: String },
    avatar: { type: String },
    role: { type: String, default: "citizen" },
  },
  { timestamps: true }
);

// Unique per provider/providerId
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const UserModel = mongoose.model<IUser>("User", UserSchema);
