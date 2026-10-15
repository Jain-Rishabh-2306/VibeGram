import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

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
 * Uploads a local file to Cloudflare R2 bucket
 * If R2 is not configured, returns the local static path (/uploads/filename)
 */
export async function uploadToStorage(filePath: string, filename: string, mimeType: string): Promise<string> {
  if (isR2Configured && r2Client) {
    const fileStream = fs.createReadStream(filePath);
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: fileStream,
      ContentType: mimeType,
    });

    await r2Client.send(command);

    // Remove local file after successful upload to R2
    fs.unlink(filePath, () => {});

    // Public URL for R2 bucket
    const baseUrl = R2_PUBLIC_URL.replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/${filename}` : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;
  }

  // Fallback to local server static path
  return `/uploads/${filename}`;
}

export async function deleteFromStorage(filename: string): Promise<void> {
  if (isR2Configured && r2Client) {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
    });
    await r2Client.send(command);
  } else {
    const localPath = path.resolve('./uploads', filename);
    if (fs.existsSync(localPath)) {
      fs.unlink(localPath, () => {});
    }
  }
}
