// src/models/Report.ts
import mongoose, { Schema, Document } from "mongoose";

export type ReportStatus =
  | "open"
  | "triaged"
  | "inspected"
  | "resolved"
  | "rejected";

export type ReportPriority = "low" | "medium" | "high";

export interface IReportPhoto {
  storage: "gridfs" | "s3" | "gcs" | "local";
  key: string; // GridFS ObjectId as hex, or S3/GCS object key, or local path
  url?: string | null; // optional public URL (cached or generated)
  mime?: string | null;
  size?: number | null;
  uploadedAt?: Date | null;
}

export interface IReport extends Document {
  title: string;
  description?: string;
  reporterId?: mongoose.Types.ObjectId;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  categories: string[]; // tags/categories
  photos: IReportPhoto[]; // structured photo references
  status: ReportStatus;
  priority?: ReportPriority;
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
    photos: {
      type: [
        {
          storage: {
            type: String,
            enum: ["gridfs", "s3", "gcs", "local"],
            required: true,
          },
          key: { type: String, required: true },
          url: { type: String, default: null },
          mime: { type: String, default: null },
          size: { type: Number, default: null },
          uploadedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
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
