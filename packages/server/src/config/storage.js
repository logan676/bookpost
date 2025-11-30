import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { readFile } from 'fs/promises'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../../.env') })

// Configure Cloudflare R2 (S3-compatible)
export const useR2Storage = process.env.USE_R2_STORAGE === 'true'
const r2Client = useR2Storage ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
}) : null
export const r2BucketName = process.env.R2_BUCKET_NAME || 'bookpost-media'
export const r2PublicUrl = process.env.R2_PUBLIC_URL || ''

// Legacy S3 support
export const useS3Storage = process.env.USE_S3_STORAGE === 'true'
const s3Client = useS3Storage ? new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}) : null
const s3BucketName = process.env.S3_BUCKET_NAME || 'bookpost-files'

// Unified storage client (prefer R2 over S3)
export const storageClient = r2Client || s3Client
export const storageBucketName = r2Client ? r2BucketName : s3BucketName
export const publicUrl = r2PublicUrl

export async function getSignedUrlForKey(key, expiresIn = 3600) {
  if (!storageClient) return null
  const command = new GetObjectCommand({
    Bucket: storageBucketName,
    Key: key
  })
  return getSignedUrl(storageClient, command, { expiresIn })
}

export async function uploadToStorage(localPath, key, contentType = 'application/octet-stream') {
  if (!storageClient) return null
  const fileContent = await readFile(localPath)
  const command = new PutObjectCommand({
    Bucket: storageBucketName,
    Key: key,
    Body: fileContent,
    ContentType: contentType
  })
  await storageClient.send(command)
  return `r2://${storageBucketName}/${key}`
}

export async function streamFromStorage(key) {
  if (!storageClient) return null
  const command = new GetObjectCommand({
    Bucket: storageBucketName,
    Key: key
  })
  const response = await storageClient.send(command)
  return response.Body
}

export async function checkObjectExists(key) {
  if (!storageClient) return false
  try {
    const command = new HeadObjectCommand({
      Bucket: storageBucketName,
      Key: key
    })
    await storageClient.send(command)
    return true
  } catch {
    return false
  }
}

export async function listObjects(prefix, maxKeys = 1000) {
  if (!storageClient) return []
  const command = new ListObjectsV2Command({
    Bucket: storageBucketName,
    Prefix: prefix,
    MaxKeys: maxKeys
  })
  const response = await storageClient.send(command)
  return response.Contents || []
}

export async function deleteObject(key) {
  if (!storageClient) return false
  const command = new DeleteObjectCommand({
    Bucket: storageBucketName,
    Key: key
  })
  await storageClient.send(command)
  return true
}

export async function downloadFromStorage(key) {
  if (!storageClient) return null
  const command = new GetObjectCommand({
    Bucket: storageBucketName,
    Key: key
  })
  const response = await storageClient.send(command)
  // Convert stream to buffer
  const chunks = []
  for await (const chunk of response.Body) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Stream with range support for video/audio streaming
export async function streamFromStorageWithRange(key, start, end) {
  if (!storageClient) return null
  const command = new GetObjectCommand({
    Bucket: storageBucketName,
    Key: key,
    Range: `bytes=${start}-${end}`
  })
  const response = await storageClient.send(command)
  return {
    body: response.Body,
    contentLength: response.ContentLength,
    contentRange: response.ContentRange
  }
}

// Upload large files (simple wrapper, can be extended for multipart)
export async function uploadLargeFileToStorage(localPath, key, contentType = 'application/octet-stream') {
  return uploadToStorage(localPath, key, contentType)
}

// Convert local file path to storage key
export function localPathToStorageKey(localPath, prefix = '') {
  const filename = localPath.split('/').pop()
  return prefix ? `${prefix}/${filename}` : filename
}

// Aliases for backward compatibility
export const listStorageObjects = listObjects
export const checkStorageObjectExists = checkObjectExists

// Legacy aliases for backward compatibility
export const getS3SignedUrl = getSignedUrlForKey
export const uploadToS3 = uploadToStorage
