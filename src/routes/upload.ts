// src/routes/upload.ts
import express from "express";
import {
  uploadHandler,
  downloadHandler,
} from "../controllers/uploadController.js";
import { uploadSingle } from "../middlewares/multerUpload.js";
import requireAuth from "../middlewares/auth.js";

const router = express.Router();

// upload (authenticated)
router.post("/", requireAuth(), (req, res, next) => {
  console.log(".....upload....");
  // run multer and handle errors
  uploadSingle(req, res, (err: any) => {
    if (err) {
      // multer error type
      return res.status(400).json({ error: err.message || "Upload error" });
    }
    console.log(".....uploadSingle....");
    return uploadHandler(req, res, next);
  });
});

// public download (you can require auth if you want)
router.get("/:id", downloadHandler);

export default router;
