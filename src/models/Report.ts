import mongoose, { Schema, Document } from "mongoose";

export type ReportStatus =
  | "open"
  | "triaged"
  | "inspected"
  | "resolved"
  | "rejected";

export interface IReport extends Document {
  title: string;
  description?: string;
  reporterId?: mongoose.Types.ObjectId;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  categories: string[];
  photos: string[]; // URLs or paths
  status: ReportStatus;
  priority?: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  audit?: { by: string; at: Date; action: string }[];
}

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true },
    description: { type: String },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    categories: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["open", "triaged", "inspected", "resolved", "rejected"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    deletedAt: { type: Date, default: null },
    audit: [
      {
        by: { type: String },
        at: { type: Date },
        action: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Geospatial index for location queries
ReportSchema.index({ location: "2dsphere" });
// Text index for simple full-text search on title + description
ReportSchema.index({ title: "text", description: "text" });

export const ReportModel = mongoose.model<IReport>("Report", ReportSchema);
