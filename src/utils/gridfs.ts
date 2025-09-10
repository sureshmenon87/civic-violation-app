// src/utils/gridfs.ts
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

let bucket: GridFSBucket | null = null;

/**
 * Ensure GridFS bucket is created after mongoose connects.
 * Call getGridFSBucket() when handling uploads/downloads.
 */
export const getGridFSBucket = (): GridFSBucket => {
  if (bucket) return bucket;
  if (!mongoose.connection?.db) {
    throw new Error("MongoDB connection not ready - call after connectDb()");
  }
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads", // collection names: uploads.files, uploads.chunks
  });
  return bucket;
};
