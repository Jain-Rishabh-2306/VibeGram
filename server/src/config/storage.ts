import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// 1. Cloudinary Config (100% Free, No Credit Card)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

export const isCloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// 2. Cloudflare R2 Config (Optional)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export const isR2Configured = Boolean(
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME
);

const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Uploads a local file to:
 * 1) Cloudinary (if configured)
 * 2) Cloudflare R2 (if configured)
 * 3) Local /uploads/ (default fallback)
 */
export async function uploadToStorage(filePath: string, filename: string, mimeType: string): Promise<string> {
  // Option 1: Cloudinary (Fastest & No Card Required)
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'vibegram',
        public_id: path.parse(filename).name,
        resource_type: mimeType.startsWith('video') ? 'video' : 'image',
      });
      // Delete temporary local file
      fs.unlink(filePath, () => {});
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error, falling back:', err);
    }
  }

  // Option 2: Cloudflare R2
  if (isR2Configured && r2Client) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
        Body: fileStream,
        ContentType: mimeType,
      });

      await r2Client.send(command);
      fs.unlink(filePath, () => {});

      const baseUrl = R2_PUBLIC_URL.replace(/\/$/, '');
      return baseUrl
        ? `${baseUrl}/${filename}`
        : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;
    } catch (err) {
      console.error('R2 upload error, falling back:', err);
    }
  }

  // Option 3: Local uploads folder
  return `/uploads/${filename}`;
}

export async function deleteFromStorage(fileUrlOrName: string): Promise<void> {
  if (isCloudinaryConfigured && fileUrlOrName.includes('cloudinary')) {
    try {
      const parts = fileUrlOrName.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const publicId = `vibegram/${path.parse(filenameWithExt).name}`;
      await cloudinary.uploader.destroy(publicId);
      return;
    } catch (err) {
      console.error('Cloudinary delete error:', err);
    }
  }

  if (isR2Configured && r2Client) {
    try {
      const filename = path.basename(fileUrlOrName);
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
      });
      await r2Client.send(command);
      return;
    } catch (err) {
      console.error('R2 delete error:', err);
    }
  }

  const localPath = path.resolve('./uploads', path.basename(fileUrlOrName));
  if (fs.existsSync(localPath)) {
    fs.unlink(localPath, () => {});
  }
}

