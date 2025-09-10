// src/services/storage.ts
import { getGridFSBucket } from "../utils/gridfs.js";
import { Readable } from "stream";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Storage } from "@google-cloud/storage";
import path from "path";
import mongodb from "mongodb";
const backend = process.env.FILE_STORAGE_BACKEND || "gridfs";

// GRIDFS save & stream
async function saveToGridFS(file: Express.Multer.File) {
  const bucket = getGridFSBucket();
  const random = crypto.randomBytes(6).toString("hex");
  const filename = `${Date.now()}-${random}${path.extname(file.originalname)}`;

  const readable = new Readable();
  readable.push(file.buffer);
  readable.push(null);

  const uploadStream = bucket.openUploadStream(filename, {
    metadata: {
      mime: file.mimetype,
      size: file.size,
      original: file.originalname,
    },
    contentType: file.mimetype,
  });

  return new Promise<any>((resolve, reject) => {
    readable
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => {
        resolve({
          storage: "gridfs",
          key: uploadStream.id.toString(),
          mime: file.mimetype,
          size: file.size,
          filename,
        });
      });
  });
}

function getGridFSDownload(id: string) {
  const bucket = getGridFSBucket();
  const { ObjectId } = mongodb;
  const _id = new ObjectId(id);
  // note: you may want to find file metadata first
  const downloadStream = bucket.openDownloadStream(_id);
  return { stream: downloadStream };
}

// S3 save & signed url
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function saveToS3(file: Express.Multer.File) {
  const random = crypto.randomBytes(6).toString("hex");
  const key = `${Date.now()}-${random}${path.extname(file.originalname)}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  return {
    storage: "s3",
    key,
    mime: file.mimetype,
    size: file.size,
    url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
}

async function getS3SignedUrlForGet(key: string) {
  const bucket = process.env.S3_BUCKET!;
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const expiresIn = Number(process.env.S3_DOWNLOAD_EXPIRES || 60); // seconds
  const url = await getSignedUrl(s3Client, cmd, { expiresIn });
  return { url, expiresIn };
}

// GCS save & signed url
const gcsStorage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

async function saveToGCS(file: Express.Multer.File) {
  const bucket = gcsStorage.bucket(process.env.GCS_BUCKET!);
  const random = crypto.randomBytes(6).toString("hex");
  const key = `${Date.now()}-${random}${path.extname(file.originalname)}`;
  const gcsFile = bucket.file(key);

  await gcsFile.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });

  const [url] = await gcsFile.getSignedUrl({
    version: "v4",
    action: "read",
    expires:
      Date.now() +
      Number(process.env.GCS_DOWNLOAD_EXPIRES || 7 * 24 * 3600) * 1000,
  });

  return { storage: "gcs", key, mime: file.mimetype, size: file.size, url };
}

async function getGcsSignedUrlForGet(key: string) {
  const bucket = gcsStorage.bucket(process.env.GCS_BUCKET!);
  const file = bucket.file(key);
  const expires =
    Date.now() + Number(process.env.GCS_DOWNLOAD_EXPIRES || 60) * 1000;
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires,
  });
  return { url, expiresIn: (expires - Date.now()) / 1000 };
}

// Unified save API
export async function saveFile(file: Express.Multer.File) {
  if (backend === "gridfs") return saveToGridFS(file);
  if (backend === "s3") return saveToS3(file);
  if (backend === "gcs") return saveToGCS(file);
  throw new Error(`Unsupported FILE_STORAGE_BACKEND: ${backend}`);
}

// Unified download API
export async function getDownloadHandler(key: string) {
  if (backend === "gridfs") {
    // return stream
    return { type: "stream", ...getGridFSDownload(key) };
  }
  if (backend === "s3") {
    const { url, expiresIn } = await getS3SignedUrlForGet(key);
    return { type: "url", url, expiresIn };
  }
  if (backend === "gcs") {
    const { url, expiresIn } = await getGcsSignedUrlForGet(key);
    return { type: "url", url, expiresIn };
  }
  throw new Error(`Unsupported FILE_STORAGE_BACKEND: ${backend}`);
}

export async function deleteFile(key: string) {
  if (backend === "gridfs") {
    const bucket = getGridFSBucket();
    const { ObjectId } = require("mongodb");
    const _id = new ObjectId(key);
    await bucket.delete(_id);
    return { ok: true };
  }

  if (backend === "s3") {
    const cmd = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
    });
    await s3Client.send(cmd);
    return { ok: true };
  }

  if (backend === "gcs") {
    const bucket = gcsStorage.bucket(process.env.GCS_BUCKET!);
    const file = bucket.file(key);
    await file.delete({ ignoreNotFound: true });
    return { ok: true };
  }

  throw new Error(`Unsupported FILE_STORAGE_BACKEND: ${backend}`);
}
