// src/middlewares/multerUpload.ts
import multer from "multer";
import { Request } from "express";

const memoryStorage = multer.memoryStorage();

const maxSize = Number(process.env.MAX_UPLOAD_SIZE || 5 * 1024 * 1024); // bytes
const allowed = (
  process.env.ALLOWED_IMAGE_TYPES || "image/jpeg,image/png,image/webp"
).split(",");

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!file.mimetype) return cb(new Error("Missing mimetype"));
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"));
  }
  cb(null, true);
};

export const uploadSingle = multer({
  storage: memoryStorage,
  limits: { fileSize: maxSize },
  fileFilter,
}).single("file"); // field name 'file'
