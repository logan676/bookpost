/**
 * Cloudflare R2 Storage Service
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
}) : null

const bucketName = process.env.R2_BUCKET_NAME || 'bookpost-media'

export async function streamFromR2(key: string) {
  if (!r2Client) {
    throw new Error('R2 storage not configured')
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  const response = await r2Client.send(command)
  return response.Body
}

export function isR2Configured() {
  return !!r2Client
}
