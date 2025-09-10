// src/routes/gcsUpload.ts
import express from "express";
import { Storage } from "@google-cloud/storage";
import requireAuth from "../middlewares/auth.js";
import crypto from "crypto";

const router = express.Router();
const storage = new Storage({ projectId: process.env.GCS_PROJECT_ID });

router.post("/gcs/presign", requireAuth(), async (req, res) => {
  try {
    const bucketName = process.env.GCS_BUCKET!;
    const { filename = "file", contentType = "application/octet-stream" } =
      req.body;
    const ext = filename.includes(".")
      ? filename.slice(filename.lastIndexOf("."))
      : "";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(name);
    const expires =
      Date.now() + Number(process.env.GCS_UPLOAD_EXPIRES || 300) * 1000;

    // get a signed URL that allows PUT/Write
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires,
      contentType,
    });

    res.json({ url, key: name, expiresIn: (expires - Date.now()) / 1000 });
  } catch (err) {
    console.error("gcs presign err", err);
    res.status(500).json({ error: "Failed to create GCS signed url" });
  }
});

export default router;
