// src/routes/s3Upload.ts
import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import requireAuth from "../middlewares/auth.js";
import crypto from "crypto";

const router = express.Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

router.post("/s3/presign", requireAuth(), async (req, res) => {
  try {
    const { filename = "file", contentType = "application/octet-stream" } =
      req.body;
    const ext = filename.includes(".")
      ? filename.slice(filename.lastIndexOf("."))
      : "";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    const bucket = process.env.S3_BUCKET!;
    const expires = Number(process.env.S3_UPLOAD_EXPIRES || 60);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: name,
      ContentType: contentType,
      ACL: "private", // or "public-read" if you want public
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expires,
    });

    // Optionally: record the intent in DB (metadata) here, or do it after upload
    res.json({ url: presignedUrl, key: name, expiresIn: expires, bucket });
  } catch (err) {
    console.error("s3 presign err", err);
    res.status(500).json({ error: "Failed to create presigned url" });
  }
});

export default router;
