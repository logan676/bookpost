/**
 * Cloudflare R2 Storage Service
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

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

  try {
    const response = await r2Client.send(command)
    return response.Body
  } catch (error: unknown) {
    // Return null for missing keys so caller can return 404
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return null
    }
    throw error
  }
}

export function isR2Configured() {
  return !!r2Client
}

/**
 * Stream a file from R2 with optional Range header support
 * Essential for audio/video seeking
 */
export async function streamFromR2WithRange(key: string, range?: string) {
  if (!r2Client) {
    throw new Error('R2 storage not configured')
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    Range: range,
  })

  try {
    const response = await r2Client.send(command)
    return {
      body: response.Body,
      contentLength: response.ContentLength,
      contentRange: response.ContentRange,
      contentType: response.ContentType,
      acceptRanges: response.AcceptRanges,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return null
    }
    throw error
  }
}

/**
 * Get file metadata from R2 without downloading content
 */
export async function getR2ObjectMetadata(key: string) {
  if (!r2Client) {
    throw new Error('R2 storage not configured')
  }

  const { HeadObjectCommand } = await import('@aws-sdk/client-s3')
  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  try {
    const response = await r2Client.send(command)
    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFound') {
      return null
    }
    throw error
  }
}

/**
 * Upload a file to R2 storage
 */
export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  if (!r2Client) {
    throw new Error('R2 storage not configured')
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await r2Client.send(command)
}

/**
 * Check if a file exists in R2
 */
export async function existsInR2(key: string): Promise<boolean> {
  if (!r2Client) {
    return false
  }

  const { HeadObjectCommand } = await import('@aws-sdk/client-s3')
  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  try {
    await r2Client.send(command)
    return true
  } catch {
    return false
  }
}

/**
 * Download a file from R2 as a Buffer
 * Used for parsing ebooks (EPUB/PDF)
 */
export async function downloadFromR2(key: string): Promise<Buffer | null> {
  if (!r2Client) {
    throw new Error('R2 storage not configured')
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  try {
    const response = await r2Client.send(command)
    if (!response.Body) {
      return null
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    const reader = response.Body.transformToWebStream().getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const buffer = Buffer.alloc(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }

    return buffer
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return null
    }
    throw error
  }
}
