import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join, basename, extname } from 'path'
import { readdir, readFile, stat, unlink, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { createReadStream } from 'fs'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import vision from '@google-cloud/vision'
import dotenv from 'dotenv'
import { createRequire } from 'module'
import { exec } from 'child_process'
import { promisify } from 'util'
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'
const execAsync = promisify(exec)
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')
const EPub = require('epub')

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../.env') })

const app = express()
const PORT = process.env.PORT || 3001

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Configure Cloudflare R2 (S3-compatible)
const useR2Storage = process.env.USE_R2_STORAGE === 'true'
const r2Client = useR2Storage ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
}) : null
const r2BucketName = process.env.R2_BUCKET_NAME || 'bookpost-media'
const r2PublicUrl = process.env.R2_PUBLIC_URL || '' // Optional: Custom domain for public access

// Legacy S3 support (for backward compatibility)
const useS3Storage = process.env.USE_S3_STORAGE === 'true'
const s3Client = useS3Storage ? new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}) : null
const s3BucketName = process.env.S3_BUCKET_NAME || 'bookpost-files'

// Unified storage client (prefer R2 over S3)
const storageClient = r2Client || s3Client
const storageBucketName = r2Client ? r2BucketName : s3BucketName

// R2/S3 utility functions
async function getSignedUrlForKey(key, expiresIn = 3600) {
  if (!storageClient) return null
  const command = new GetObjectCommand({
    Bucket: storageBucketName,
    Key: key
  })
  return getSignedUrl(storageClient, command, { expiresIn })
}

// Legacy alias
async function getS3SignedUrl(s3Key, expiresIn = 3600) {
  return getSignedUrlForKey(s3Key, expiresIn)
}

async function uploadToStorage(localPath, key, contentType = 'application/octet-stream') {
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

// Legacy alias
async function uploadToS3(localPath, s3Key, contentType = 'application/pdf') {
  return uploadToStorage(localPath, s3Key, contentType)
}

async function streamFromStorage(key) {
  if (!storageClient) return null
  const command = new GetObjectCommand({
    Bucket: storageBucketName,
    Key: key
  })
  const response = await storageClient.send(command)
  return response.Body
}

// Legacy alias
async function streamFromS3(s3Key) {
  return streamFromStorage(s3Key)
}

// Download file from storage as Buffer
async function downloadFromStorage(key) {
  if (!storageClient) return null
  const stream = await streamFromStorage(key)
  if (!stream) return null
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Legacy alias
async function downloadFromS3(s3Key) {
  return downloadFromStorage(s3Key)
}

// Stream from R2 with range support (for video/audio seeking)
async function streamFromStorageWithRange(key, range) {
  if (!storageClient) return null

  // First get the object metadata to know the file size
  const headCommand = new HeadObjectCommand({
    Bucket: storageBucketName,
    Key: key
  })
  const headResponse = await storageClient.send(headCommand)
  const fileSize = headResponse.ContentLength
  const contentType = headResponse.ContentType || 'application/octet-stream'

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    const command = new GetObjectCommand({
      Bucket: storageBucketName,
      Key: key,
      Range: `bytes=${start}-${end}`
    })
    const response = await storageClient.send(command)

    return {
      stream: response.Body,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      },
      statusCode: 206
    }
  } else {
    const command = new GetObjectCommand({
      Bucket: storageBucketName,
      Key: key
    })
    const response = await storageClient.send(command)

    return {
      stream: response.Body,
      headers: {
        'Content-Length': fileSize,
        'Content-Type': contentType
      },
      statusCode: 200
    }
  }
}

async function checkStorageObjectExists(key) {
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

// Legacy alias
async function checkS3ObjectExists(s3Key) {
  return checkStorageObjectExists(s3Key)
}

// Get object metadata (size, content type, etc.)
async function getStorageObjectMetadata(key) {
  if (!storageClient) return null
  try {
    const command = new HeadObjectCommand({
      Bucket: storageBucketName,
      Key: key
    })
    const response = await storageClient.send(command)
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      etag: response.ETag
    }
  } catch {
    return null
  }
}

// Convert local file path to storage key
function localPathToStorageKey(localPath, type = 'magazines') {
  const basePaths = {
    magazines: process.env.MAGAZINES_FOLDER || '/Volumes/T9/杂志',
    ebooks: process.env.EBOOKS_FOLDER || '/Volumes/T9/电子书',
    audio: process.env.AUDIO_FOLDER || '/Volumes/T9/音频',
    lectures: '/Volumes/三星移动硬盘/公开课',
    speeches: '/Volumes/三星移动硬盘/演讲',
    movies: '/Volumes/CN/大陆电影',
    nba: process.env.NBA_FOLDER || '/Volumes/T9/NBA',
    tvshows: process.env.TVSHOWS_FOLDER || '/Volumes/美剧',
    animation: process.env.ANIMATION_FOLDER || '/Volumes/动画',
    documentaries: process.env.DOCUMENTARIES_FOLDER || '/Volumes/纪录片'
  }

  // Try to match against known base paths
  for (const [category, basePath] of Object.entries(basePaths)) {
    if (localPath.startsWith(basePath)) {
      const relativePath = localPath.slice(basePath.length + 1)
      return `${category}/${relativePath}`
    }
  }

  // Fallback: use provided type and filename
  return `${type}/${basename(localPath)}`
}

// Legacy alias
function localPathToS3Key(localPath, type = 'magazines') {
  return localPathToStorageKey(localPath, type)
}

// Multipart upload for large files (>100MB recommended, required for >5GB)
const MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100MB
const PART_SIZE = 100 * 1024 * 1024 // 100MB per part

async function uploadLargeFileToStorage(localPath, key, contentType = 'application/octet-stream', onProgress = null) {
  if (!storageClient) return null

  const fileStat = await stat(localPath)
  const fileSize = fileStat.size

  // Use simple upload for small files
  if (fileSize < MULTIPART_THRESHOLD) {
    return uploadToStorage(localPath, key, contentType)
  }

  console.log(`[R2 Upload] Starting multipart upload for ${key} (${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB)`)

  // Initiate multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: storageBucketName,
    Key: key,
    ContentType: contentType
  })
  const { UploadId } = await storageClient.send(createCommand)

  const parts = []
  const totalParts = Math.ceil(fileSize / PART_SIZE)

  try {
    const fileHandle = await import('fs').then(fs => fs.promises.open(localPath, 'r'))

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * PART_SIZE
      const end = Math.min(start + PART_SIZE, fileSize)
      const partSize = end - start

      const buffer = Buffer.alloc(partSize)
      await fileHandle.read(buffer, 0, partSize, start)

      const uploadPartCommand = new UploadPartCommand({
        Bucket: storageBucketName,
        Key: key,
        UploadId,
        PartNumber: partNumber,
        Body: buffer
      })

      const { ETag } = await storageClient.send(uploadPartCommand)
      parts.push({ PartNumber: partNumber, ETag })

      const progress = Math.round((partNumber / totalParts) * 100)
      console.log(`[R2 Upload] ${key}: Part ${partNumber}/${totalParts} (${progress}%)`)

      if (onProgress) {
        onProgress({ partNumber, totalParts, progress, uploadedBytes: end, totalBytes: fileSize })
      }
    }

    await fileHandle.close()

    // Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: storageBucketName,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: parts }
    })
    await storageClient.send(completeCommand)

    console.log(`[R2 Upload] Completed: ${key}`)
    return `r2://${storageBucketName}/${key}`

  } catch (error) {
    // Abort multipart upload on error
    console.error(`[R2 Upload] Error uploading ${key}:`, error.message)
    try {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: storageBucketName,
        Key: key,
        UploadId
      })
      await storageClient.send(abortCommand)
      console.log(`[R2 Upload] Aborted multipart upload for ${key}`)
    } catch (abortError) {
      console.error(`[R2 Upload] Error aborting upload:`, abortError.message)
    }
    throw error
  }
}

// List objects in a storage prefix (for browsing/migration)
async function listStorageObjects(prefix = '', maxKeys = 1000) {
  if (!storageClient) return []

  const command = new ListObjectsV2Command({
    Bucket: storageBucketName,
    Prefix: prefix,
    MaxKeys: maxKeys
  })

  const response = await storageClient.send(command)
  return response.Contents || []
}

// Delete object from storage
async function deleteFromStorage(key) {
  if (!storageClient) return false

  try {
    const command = new DeleteObjectCommand({
      Bucket: storageBucketName,
      Key: key
    })
    await storageClient.send(command)
    return true
  } catch (error) {
    console.error(`[R2] Error deleting ${key}:`, error.message)
    return false
  }
}

// Configure Google Cloud Vision
const visionClient = new vision.ImageAnnotatorClient()

// Configure Multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Initialize database
const db = new Database(join(__dirname, 'bookpost.db'))

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    cover_url TEXT,
    cover_photo_url TEXT,
    isbn TEXT,
    publisher TEXT,
    publish_year INTEGER,
    description TEXT,
    page_count INTEGER,
    categories TEXT,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    page_photo_url TEXT,
    page_number INTEGER,
    extracted_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS underlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    underline_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (underline_id) REFERENCES underlines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS publishers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS magazines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    page_count INTEGER,
    year INTEGER,
    issue TEXT,
    cover_url TEXT,
    s3_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS magazine_underlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    magazine_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (magazine_id) REFERENCES magazines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS magazine_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    underline_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (underline_id) REFERENCES magazine_underlines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS note_underlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    paragraph_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS note_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    underline_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (underline_id) REFERENCES note_underlines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ebook_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ebooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    file_type TEXT DEFAULT 'pdf',
    normalized_title TEXT,
    cover_url TEXT,
    s3_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES ebook_categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ebook_underlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ebook_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    paragraph TEXT,
    chapter_index INTEGER NOT NULL DEFAULT 0,
    paragraph_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    cfi_range TEXT,
    idea_count INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ebook_id) REFERENCES ebooks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ebook_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    underline_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (underline_id) REFERENCES ebook_underlines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    year INTEGER,
    content_preview TEXT,
    s3_key TEXT,
    user_id INTEGER,
    author TEXT,
    publish_date TEXT,
    tags TEXT,
    categories TEXT,
    slug TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS note_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    nick TEXT,
    content TEXT NOT NULL,
    original_date TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    cover_url TEXT,
    last_page INTEGER DEFAULT 1,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, item_type, item_id)
  );

  CREATE TABLE IF NOT EXISTS nba_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    teams TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    cover_url TEXT,
    category TEXT DEFAULT 'chinese',
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS nba_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    game_number INTEGER,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_type TEXT DEFAULT 'mkv',
    duration INTEGER,
    thumbnail_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (series_id) REFERENCES nba_series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audio_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audio_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp3',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (series_id) REFERENCES audio_series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lecture_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lecture_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (series_id) REFERENCES lecture_series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS speech_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS speech_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (series_id) REFERENCES speech_series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mkv',
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tvshow_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    episode_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tvshow_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    season INTEGER,
    episode INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (series_id) REFERENCES tvshow_series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documentary_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    episode_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documentary_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (series_id) REFERENCES documentary_series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS animation_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    episode_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS animation_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (series_id) REFERENCES animation_series(id) ON DELETE CASCADE
  );
`)

// Migration: Add s3_key column to existing tables if not exists
try {
  db.exec(`ALTER TABLE magazines ADD COLUMN s3_key TEXT`)
} catch (err) {
  // Column likely already exists
}
try {
  db.exec(`ALTER TABLE ebooks ADD COLUMN s3_key TEXT`)
} catch (err) {
  // Column likely already exists
}
try {
  db.exec(`ALTER TABLE ebooks ADD COLUMN file_type TEXT DEFAULT 'pdf'`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE ebooks ADD COLUMN normalized_title TEXT`)
} catch (err) {}

// Migration: Add user_id to user-bound tables
try {
  db.exec(`ALTER TABLE books ADD COLUMN user_id INTEGER`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE magazine_underlines ADD COLUMN user_id INTEGER`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE magazine_ideas ADD COLUMN user_id INTEGER`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE notes ADD COLUMN user_id INTEGER`)
} catch (err) {}

// Migration: Add email column to users table (rename from username)
try {
  db.exec(`ALTER TABLE users ADD COLUMN email TEXT`)
  // Copy existing usernames to email column
  db.exec(`UPDATE users SET email = username WHERE email IS NULL`)
} catch (err) {
  // Column likely already exists
}

// Migration: Add preprocessed column to magazines table
try {
  db.exec(`ALTER TABLE magazines ADD COLUMN preprocessed INTEGER DEFAULT 0`)
} catch (err) {
  // Column likely already exists
}

// Migration: Add category and source columns to nba_series table
try {
  db.exec(`ALTER TABLE nba_series ADD COLUMN category TEXT DEFAULT 'chinese'`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE nba_series ADD COLUMN source TEXT`)
} catch (err) {}

// Migration: Add is_admin column to users table
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`)
} catch (err) {
  // Column likely already exists
}

// Set logan676@163.com as admin
try {
  db.exec(`UPDATE users SET is_admin = 1 WHERE email = 'logan676@163.com'`)
} catch (err) {}

// Add new columns to notes table for blog import
try {
  db.exec(`ALTER TABLE notes ADD COLUMN author TEXT`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE notes ADD COLUMN publish_date TEXT`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE notes ADD COLUMN tags TEXT`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE notes ADD COLUMN categories TEXT`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE notes ADD COLUMN slug TEXT`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE ebook_underlines ADD COLUMN cfi_range TEXT`)
} catch (err) {}
try {
  db.exec(`ALTER TABLE ebook_underlines ADD COLUMN idea_count INTEGER NOT NULL DEFAULT 0`)
} catch (err) {}

// Auth helper functions
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    req.user = null
    return next()
  }

  const session = db.prepare(`
    SELECT s.*, u.email, u.is_admin FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token)

  if (session) {
    req.user = { id: session.user_id, email: session.email, is_admin: session.is_admin === 1 }
  } else {
    req.user = null
  }
  next()
}

// Require auth middleware
function requireAuth(req, res, next) {
  if (!req.user) {
    console.log('[Auth] No user found on request, path:', req.path)
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

// Require admin middleware
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(authMiddleware)

// Serve local cover images (legacy fallback)
app.use('/api/covers', express.static(join(__dirname, '../covers')))

// Serve R2 cloud cover images
app.get('/api/r2-covers/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params
    if (!['ebooks', 'magazines'].includes(type)) {
      return res.status(400).json({ error: 'Invalid cover type' })
    }

    const r2Key = `covers/${type}/${filename}`

    if (storageClient) {
      try {
        const stream = await streamFromStorage(r2Key)
        if (!stream) {
          return res.status(404).json({ error: 'Cover not found in storage' })
        }

        res.setHeader('Content-Type', 'image/jpeg')
        res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
        stream.pipe(res)
        return
      } catch (r2Error) {
        console.error(`[Cover] R2 error for ${r2Key}:`, r2Error.message)
        return res.status(500).json({ error: 'Failed to access cover from storage' })
      }
    }

    res.status(404).json({ error: 'Cover not available' })
  } catch (error) {
    console.error('Serve R2 cover error:', error)
    res.status(500).json({ error: 'Failed to serve cover' })
  }
})

// Helper: Upload image to Cloudinary
async function uploadToCloudinary(buffer, folder = 'bookpost', publicId = null) {
  return new Promise((resolve, reject) => {
    const options = { folder, resource_type: 'image' }
    if (publicId) {
      options.public_id = publicId
      options.overwrite = true // Overwrite if exists with same public_id
      options.invalidate = true // Invalidate CDN cache
    }
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
}

// Local covers directory
const COVERS_DIR = join(__dirname, '../covers')
const MAGAZINE_COVERS_DIR = join(COVERS_DIR, 'magazines')
const EBOOK_COVERS_DIR = join(COVERS_DIR, 'ebooks')

// Cache directory for preprocessed pages
const CACHE_DIR = join(__dirname, '../cache')
const PAGES_CACHE_DIR = join(CACHE_DIR, 'pages')

// Generate a unique filename based on file path hash
// This ensures the same file always gets the same cache/cover filename
// Format: sanitized_title_hash.ext (e.g., "economist_2020_01_a1b2c3d4.jpg")
function generateCacheFilename(filePath, title) {
  const hash = crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8)
  // Sanitize title: lowercase, replace non-alphanumeric with underscore, limit length
  const sanitizedTitle = (title || basename(filePath, extname(filePath)))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50)
  return `${sanitizedTitle}_${hash}`
}

// Ensure covers directories exist
async function ensureCoversDir() {
  if (!existsSync(MAGAZINE_COVERS_DIR)) {
    await mkdir(MAGAZINE_COVERS_DIR, { recursive: true })
  }
  if (!existsSync(EBOOK_COVERS_DIR)) {
    await mkdir(EBOOK_COVERS_DIR, { recursive: true })
  }
}

// Ensure cache directories exist
async function ensureCacheDir() {
  if (!existsSync(PAGES_CACHE_DIR)) {
    await mkdir(PAGES_CACHE_DIR, { recursive: true })
  }
}

// Helper: Generate cover image from PDF first page using pdftoppm
// Saves locally instead of uploading to cloud
// Uses file path hash for reproducible naming
async function generateCoverFromPdf(pdfPath, magazineId, title) {
  const tempOutputBase = `/tmp/cover_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const tempOutputFile = `${tempOutputBase}-001.jpg`
  const cacheFilename = generateCacheFilename(pdfPath, title)
  const localCoverFile = join(MAGAZINE_COVERS_DIR, `${cacheFilename}.jpg`)

  // Check if cover already exists (from previous run with same file)
  if (existsSync(localCoverFile)) {
    return `/api/covers/magazines/${cacheFilename}.jpg`
  }

  try {
    await ensureCoversDir()

    // Use pdftoppm to convert first page to JPEG
    // -f 1 -l 1: only first page, -jpeg: JPEG format, -r 150: 150 DPI resolution
    await execAsync(`pdftoppm -f 1 -l 1 -jpeg -r 150 "${pdfPath}" "${tempOutputBase}"`)

    // Read the generated image and save to local covers directory
    const imageBuffer = await readFile(tempOutputFile)
    await writeFile(localCoverFile, imageBuffer)

    // Clean up temp file
    await unlink(tempOutputFile).catch(() => {})

    // Return local API URL
    return `/api/covers/magazines/${cacheFilename}.jpg`
  } catch (error) {
    // Clean up temp file on error
    await unlink(tempOutputFile).catch(() => {})
    throw error
  }
}

// Background cover generation - runs automatically on server startup
let backgroundCoverGenRunning = false
async function startBackgroundCoverGeneration() {
  if (backgroundCoverGenRunning) {
    console.log('[Cover Gen] Already running, skipping...')
    return
  }

  backgroundCoverGenRunning = true
  console.log('[Cover Gen] Starting background cover generation...')

  try {
    // Get all magazines without covers
    const magazines = db.prepare(`
      SELECT id, title, file_path FROM magazines
      WHERE cover_url IS NULL OR cover_url = ''
      ORDER BY id ASC
    `).all()

    // Get all ebooks without covers
    const ebooks = db.prepare(`
      SELECT id, title, file_path FROM ebooks
      WHERE cover_url IS NULL OR cover_url = ''
      ORDER BY id ASC
    `).all()

    const totalMagazines = magazines.length
    const totalEbooks = ebooks.length

    if (totalMagazines === 0 && totalEbooks === 0) {
      console.log('[Cover Gen] All magazines and ebooks already have covers')
      backgroundCoverGenRunning = false
      return
    }

    console.log(`[Cover Gen] Found ${totalMagazines} magazines and ${totalEbooks} ebooks without covers`)

    // Process magazines
    if (totalMagazines > 0) {
      console.log(`[Cover Gen] Processing magazines...`)
      let success = 0
      let failed = 0

      for (let i = 0; i < magazines.length; i++) {
        const magazine = magazines[i]

        try {
          if (!existsSync(magazine.file_path)) {
            failed++
            continue
          }

          const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id, magazine.title)
          db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)
          success++

          if ((i + 1) % 50 === 0) {
            console.log(`[Cover Gen] Magazines: ${i + 1}/${totalMagazines} (${success} success, ${failed} failed)`)
          }
        } catch (error) {
          failed++
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[Cover Gen] Magazines completed: ${success} success, ${failed} failed`)
    }

    // Process ebooks
    if (totalEbooks > 0) {
      console.log(`[Cover Gen] Processing ebooks...`)
      let success = 0
      let failed = 0

      for (let i = 0; i < ebooks.length; i++) {
        const ebook = ebooks[i]

        try {
          if (!existsSync(ebook.file_path)) {
            failed++
            continue
          }

          const coverUrl = await generateEbookCover(ebook.file_path, ebook.id, ebook.title)
          db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)
          success++

          if ((i + 1) % 50 === 0) {
            console.log(`[Cover Gen] Ebooks: ${i + 1}/${totalEbooks} (${success} success, ${failed} failed)`)
          }
        } catch (error) {
          failed++
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[Cover Gen] Ebooks completed: ${success} success, ${failed} failed`)
    }

    console.log(`[Cover Gen] All cover generation completed`)
  } catch (error) {
    console.error('[Cover Gen] Error:', error)
  } finally {
    backgroundCoverGenRunning = false
  }
}

// Generate cover for a single ebook (supports both PDF and EPUB)
// Uses file path hash for reproducible naming
async function generateEbookCover(filePath, ebookId, title) {
  const cacheFilename = generateCacheFilename(filePath, title)
  const localCoverFile = join(EBOOK_COVERS_DIR, `${cacheFilename}.jpg`)
  await ensureCoversDir()

  // Check if cover already exists (from previous run with same file)
  if (existsSync(localCoverFile)) {
    return `/api/covers/ebooks/${cacheFilename}.jpg`
  }

  const ext = extname(filePath).toLowerCase()

  if (ext === '.epub') {
    // Extract cover from EPUB file
    return await extractEpubCover(filePath, cacheFilename)
  } else if (ext === '.pdf') {
    // Use pdftoppm for PDF files
    const tempOutputBase = `/tmp/ebook_cover_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const tempOutputFile = `${tempOutputBase}-001.jpg`

    try {
      await execAsync(`pdftoppm -f 1 -l 1 -jpeg -r 150 "${filePath}" "${tempOutputBase}"`)
      const imageBuffer = await readFile(tempOutputFile)
      await writeFile(localCoverFile, imageBuffer)
      await unlink(tempOutputFile).catch(() => {})
      return `/api/covers/ebooks/${cacheFilename}.jpg`
    } catch (error) {
      await unlink(tempOutputFile).catch(() => {})
      throw error
    }
  } else {
    throw new Error(`Unsupported file format: ${ext}`)
  }
}

// Extract cover image from EPUB file
async function extractEpubCover(epubPath, cacheFilename) {
  const localCoverFile = join(EBOOK_COVERS_DIR, `${cacheFilename}.jpg`)
  const tempDir = `/tmp/epub_extract_${Date.now()}_${Math.random().toString(36).substring(7)}`

  try {
    // Extract EPUB (it's a ZIP file)
    await execAsync(`mkdir -p "${tempDir}" && unzip -q -o "${epubPath}" -d "${tempDir}"`)

    // Find and read container.xml to get the OPF location
    const containerPath = join(tempDir, 'META-INF', 'container.xml')
    let opfPath = ''

    try {
      const containerXml = await readFile(containerPath, 'utf-8')
      const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/i)
      if (opfMatch) {
        opfPath = join(tempDir, opfMatch[1])
      }
    } catch {
      // Try common OPF locations
      const commonPaths = ['OEBPS/content.opf', 'content.opf', 'EPUB/package.opf']
      for (const p of commonPaths) {
        const fullPath = join(tempDir, p)
        if (existsSync(fullPath)) {
          opfPath = fullPath
          break
        }
      }
    }

    if (!opfPath || !existsSync(opfPath)) {
      throw new Error('Could not find OPF file')
    }

    // Read OPF and find cover image
    const opfContent = await readFile(opfPath, 'utf-8')
    const opfDir = dirname(opfPath)
    let coverPath = ''

    // Method 1: Look for cover-image in metadata
    const coverIdMatch = opfContent.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/i) ||
                         opfContent.match(/<meta[^>]*content="([^"]+)"[^>]*name="cover"/i)
    if (coverIdMatch) {
      const coverId = coverIdMatch[1]
      const itemMatch = opfContent.match(new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, 'i')) ||
                       opfContent.match(new RegExp(`<item[^>]*href="([^"]+)"[^>]*id="${coverId}"`, 'i'))
      if (itemMatch) {
        coverPath = join(opfDir, itemMatch[1])
      }
    }

    // Method 2: Look for item with id containing 'cover' and image media-type
    if (!coverPath || !existsSync(coverPath)) {
      const coverItemMatch = opfContent.match(/<item[^>]*id="[^"]*cover[^"]*"[^>]*href="([^"]+)"[^>]*media-type="image\/[^"]+"/i) ||
                            opfContent.match(/<item[^>]*href="([^"]+)"[^>]*id="[^"]*cover[^"]*"[^>]*media-type="image\/[^"]+"/i)
      if (coverItemMatch) {
        coverPath = join(opfDir, coverItemMatch[1])
      }
    }

    // Method 3: Look for properties="cover-image"
    if (!coverPath || !existsSync(coverPath)) {
      const propsMatch = opfContent.match(/<item[^>]*properties="cover-image"[^>]*href="([^"]+)"/i) ||
                        opfContent.match(/<item[^>]*href="([^"]+)"[^>]*properties="cover-image"/i)
      if (propsMatch) {
        coverPath = join(opfDir, propsMatch[1])
      }
    }

    // Method 4: Look for any image named 'cover'
    if (!coverPath || !existsSync(coverPath)) {
      const { stdout } = await execAsync(`find "${tempDir}" -iname "*cover*" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \\) 2>/dev/null | head -1`)
      if (stdout.trim()) {
        coverPath = stdout.trim()
      }
    }

    if (!coverPath || !existsSync(coverPath)) {
      throw new Error('Could not find cover image in EPUB')
    }

    // Copy and convert cover image to JPG
    const coverExt = extname(coverPath).toLowerCase()
    if (coverExt === '.png') {
      // Convert PNG to JPG using sips (macOS) or ImageMagick
      await execAsync(`sips -s format jpeg "${coverPath}" --out "${localCoverFile}" 2>/dev/null || convert "${coverPath}" "${localCoverFile}"`)
    } else {
      // Copy JPG directly
      await execAsync(`cp "${coverPath}" "${localCoverFile}"`)
    }

    // Cleanup temp directory
    await execAsync(`rm -rf "${tempDir}"`)

    return `/api/covers/ebooks/${cacheFilename}.jpg`
  } catch (error) {
    // Cleanup on error
    await execAsync(`rm -rf "${tempDir}"`).catch(() => {})
    throw error
  }
}

// Helper: Extract text using Google Cloud Vision
async function extractTextFromImage(imageUrl) {
  try {
    const [result] = await visionClient.textDetection(imageUrl)
    const detections = result.textAnnotations
    if (detections && detections.length > 0) {
      return detections[0].description
    }
    return ''
  } catch (error) {
    console.error('Vision API error:', error)
    throw error
  }
}

// Helper: Search Google Books API
async function searchGoogleBooks(query) {
  try {
    console.log('[Google Books] Searching for:', query)
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`

    const response = await fetch(url)
    const data = await response.json()

    console.log('[Google Books] Response:', data.totalItems, 'items found')

    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo
      console.log('[Google Books] Best match:', book.title, 'by', book.authors)
      return {
        title: book.title || '',
        author: book.authors ? book.authors.join(', ') : '',
        isbn: book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier ||
              book.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',
        publisher: book.publisher || '',
        publish_year: book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : null,
        description: book.description || '',
        page_count: book.pageCount || null,
        categories: book.categories ? book.categories.join(', ') : '',
        language: book.language || '',
        cover_url: book.imageLinks?.thumbnail?.replace('http:', 'https:') || ''
      }
    }
    console.log('[Google Books] No results found')
    return null
  } catch (error) {
    console.error('Google Books API error:', error)
    return null
  }
}

// Helper: Parse book info from OCR text
function parseBookInfoFromText(text) {
  const lines = text.split('\n').filter(line => line.trim())
  let title = ''
  let author = ''
  let isbn = ''

  // Try to find ISBN
  const isbnMatch = text.match(/(?:ISBN[-:]?\s*)?(\d{10}|\d{13}|\d{3}[-\s]?\d{10})/i)
  if (isbnMatch) {
    isbn = isbnMatch[1].replace(/[-\s]/g, '')
  }

  // Look for "by" keyword first
  const byIndex = text.toLowerCase().indexOf(' by ')
  if (byIndex !== -1) {
    const afterBy = text.substring(byIndex + 4)
    const authorMatch = afterBy.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
    if (authorMatch) {
      author = authorMatch[1]
    }
  }

  // If no "by" found, look for author name patterns
  // Authors are often in ALL CAPS at the end, or have patterns like "FIRST LAST"
  if (!author && lines.length > 0) {
    // Check last few lines for author name (ALL CAPS name pattern)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      const line = lines[i].trim()
      // Match ALL CAPS names like "FRANK TRENTMANN" or "J.K. ROWLING"
      if (/^[A-Z][A-Z.\s]+[A-Z]$/.test(line) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 4) {
        // Convert to title case
        author = line.split(/\s+/).map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
        break
      }
    }
  }

  // Build title from initial lines (often ALL CAPS or prominent text)
  // Skip the author line if found at the end
  const titleLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Stop if we hit the author line or subtitle indicators
    if (author && line.toUpperCase() === author.toUpperCase()) break
    if (line.toLowerCase().startsWith('a novel') || line.toLowerCase().startsWith('isbn')) break

    titleLines.push(line)
    // Take first 1-3 lines as title, or stop at subtitle
    if (titleLines.length >= 3) break
    if (line.toLowerCase().includes('how') || line.toLowerCase().includes('the story')) break
  }

  if (titleLines.length > 0) {
    title = titleLines.join(' ').trim()
    // Clean up excessive spaces
    title = title.replace(/\s+/g, ' ')
  }

  return { title, author, isbn }
}

// Routes

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation helper - minimum 6 chars, at least one letter and one number
function isValidPassword(password) {
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' }
  if (!/[a-zA-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one letter' }
  if (!/\d/.test(password)) return { valid: false, error: 'Password must contain at least one number' }
  return { valid: true }
}

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }
    const passwordCheck = isValidPassword(password)
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.error })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const passwordHash = hashPassword(password)
    // Include username for backwards compatibility with old schema where username is NOT NULL
    const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(email, email, passwordHash)

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(result.lastInsertRowid, token, expiresAt)

    res.json({ token, user: { id: result.lastInsertRowid, email } })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt)

    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }
  res.json({ success: true })
})

app.get('/api/auth/me', (req, res) => {
  if (req.user) {
    res.json({ user: req.user })
  } else {
    res.json({ user: null })
  }
})

// Get all books (user-specific)
app.get('/api/books', (req, res) => {
  try {
    if (!req.user) {
      return res.json([]) // No books for unauthenticated users
    }
    const books = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
    res.json(books)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch books' })
  }
})

// Get single book with blog posts
app.get('/api/books/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }
    const posts = db.prepare('SELECT * FROM blog_posts WHERE book_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json({ ...book, posts })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch book' })
  }
})

// Upload book cover photo and auto-fill metadata
app.post('/api/books/scan', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'bookpost/covers')
    const photoUrl = cloudinaryResult.secure_url

    // Extract text from image using Google Cloud Vision
    const extractedText = await extractTextFromImage(photoUrl)
    console.log('Extracted text:', extractedText)

    // Parse potential book info from OCR
    const parsedInfo = parseBookInfoFromText(extractedText)

    // Search Google Books for metadata
    let bookData = null

    // Try ISBN first if found
    if (parsedInfo.isbn) {
      bookData = await searchGoogleBooks(`isbn:${parsedInfo.isbn}`)
    }

    // Try title + author if no ISBN result
    if (!bookData && (parsedInfo.title || parsedInfo.author)) {
      const query = [parsedInfo.title, parsedInfo.author].filter(Boolean).join(' ')
      bookData = await searchGoogleBooks(query)
    }

    // Try first few lines as query
    if (!bookData && extractedText) {
      const firstWords = extractedText.split(/\s+/).slice(0, 5).join(' ')
      bookData = await searchGoogleBooks(firstWords)
    }

    // Prepare response with extracted data
    const result = {
      cover_photo_url: photoUrl,
      extracted_text: extractedText,
      ...parsedInfo,
      ...(bookData || {})
    }

    res.json(result)
  } catch (error) {
    console.error('Scan error:', error)
    res.status(500).json({ error: 'Failed to scan book cover' })
  }
})

// Create book (after user confirms auto-filled data)
app.post('/api/books', requireAuth, (req, res) => {
  console.log('[Create Book] Request received:', { user: req.user?.id, body: req.body })
  try {
    const {
      title, author, cover_url, cover_photo_url, isbn,
      publisher, publish_year, description, page_count,
      categories, language
    } = req.body

    if (!title || !author) {
      console.log('[Create Book] Missing title or author')
      return res.status(400).json({ error: 'Title and author are required' })
    }

    const result = db.prepare(`
      INSERT INTO books (title, author, cover_url, cover_photo_url, isbn, publisher, publish_year, description, page_count, categories, language, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, author, cover_url, cover_photo_url, isbn, publisher, publish_year, description, page_count, categories, language, req.user.id)

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newBook)
  } catch (error) {
    console.error('Create book error:', error)
    res.status(500).json({ error: 'Failed to add book' })
  }
})

// Upload reading page photo and create blog post
app.post('/api/books/:id/scan-page', upload.single('photo'), async (req, res) => {
  try {
    const bookId = req.params.id

    // Verify book exists
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'bookpost/pages')
    const photoUrl = cloudinaryResult.secure_url

    // Extract text from page image
    const extractedText = await extractTextFromImage(photoUrl)

    // Format as blog post content
    const blogContent = formatAsBlogPost(extractedText, book.title)

    // Create blog post
    const pageNumber = req.body.page_number ? parseInt(req.body.page_number) : null
    const title = `Notes from "${book.title}"${pageNumber ? ` - Page ${pageNumber}` : ''}`

    const result = db.prepare(`
      INSERT INTO blog_posts (book_id, title, content, page_photo_url, page_number, extracted_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bookId, title, blogContent, photoUrl, pageNumber, extractedText)

    const newPost = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newPost)
  } catch (error) {
    console.error('Scan page error:', error)
    res.status(500).json({ error: 'Failed to scan page' })
  }
})

// Helper: Format extracted text as blog post
function formatAsBlogPost(text, bookTitle) {
  // Google Vision OCR returns text with single newlines for line breaks
  // We need to detect actual paragraph breaks vs line wrapping

  const lines = text.split('\n')
  const paragraphs = []
  let currentParagraph = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const prevLine = currentParagraph.length > 0 ? currentParagraph[currentParagraph.length - 1] : ''

    // Empty line indicates paragraph break
    if (!line) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
      continue
    }

    // Check if previous line ends with sentence-ending punctuation
    // and current line starts with capital letter - likely new paragraph
    const prevEndsWithPunctuation = /[.!?:]["']?\s*$/.test(prevLine)
    const currentStartsWithCapital = /^[A-Z"']/.test(line)
    const prevIsShort = prevLine.length < 50

    // Heuristic: if previous line ends a sentence and is relatively short,
    // and current line starts with capital, it's probably a new paragraph
    if (prevLine && prevEndsWithPunctuation && currentStartsWithCapital && prevIsShort) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
    }

    currentParagraph.push(line)
  }

  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '))
  }

  // Clean up and join
  return paragraphs
    .map(p => p.trim())
    .filter(Boolean)
    .join('\n\n')
}

// Get all blog posts for a book
app.get('/api/books/:id/posts', (req, res) => {
  try {
    const posts = db.prepare('SELECT * FROM blog_posts WHERE book_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(posts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

// Get single blog post
app.get('/api/posts/:id', (req, res) => {
  try {
    const post = db.prepare(`
      SELECT bp.*, b.title as book_title, b.author as book_author
      FROM blog_posts bp
      JOIN books b ON bp.book_id = b.id
      WHERE bp.id = ?
    `).get(req.params.id)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    res.json(post)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

// Update blog post
app.put('/api/posts/:id', (req, res) => {
  try {
    const { title, content } = req.body
    db.prepare('UPDATE blog_posts SET title = ?, content = ? WHERE id = ?')
      .run(title, content, req.params.id)

    const updated = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' })
  }
})

// Delete book
app.delete('/api/books/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete book' })
  }
})

// Delete blog post
app.delete('/api/posts/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Get underlines for a post (with idea count)
app.get('/api/posts/:id/underlines', (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM underlines u
      LEFT JOIN ideas i ON u.id = i.underline_id
      WHERE u.post_id = ?
      GROUP BY u.id
      ORDER BY u.paragraph_index, u.start_offset
    `).all(req.params.id)
    res.json(underlines)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

// Create underline
app.post('/api/posts/:id/underlines', (req, res) => {
  try {
    const postId = req.params.id
    const { text, start_offset, end_offset, paragraph_index } = req.body

    if (!text || start_offset === undefined || end_offset === undefined || paragraph_index === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = db.prepare(`
      INSERT INTO underlines (post_id, text, start_offset, end_offset, paragraph_index)
      VALUES (?, ?, ?, ?, ?)
    `).run(postId, text, start_offset, end_offset, paragraph_index)

    const newUnderline = db.prepare('SELECT * FROM underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

// Get ideas for an underline
app.get('/api/underlines/:id/ideas', (req, res) => {
  try {
    const ideas = db.prepare('SELECT * FROM ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

// Add idea to underline
app.post('/api/underlines/:id/ideas', (req, res) => {
  try {
    const underlineId = req.params.id
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const result = db.prepare('INSERT INTO ideas (underline_id, content) VALUES (?, ?)').run(underlineId, content)
    const newIdea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

// Update idea
app.patch('/api/ideas/:id', (req, res) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    db.prepare('UPDATE ideas SET content = ? WHERE id = ?').run(content, req.params.id)
    const updated = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id)

    if (!updated) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update idea' })
  }
})

// Delete idea
app.delete('/api/ideas/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ideas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// Delete underline
app.delete('/api/underlines/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM underlines WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// ==================== MAGAZINE ENDPOINTS ====================

// Magazine base path
const MAGAZINE_BASE_PATH = '/Volumes/杂志/杂志/月报更新1'

// Helper: Recursively find all PDF files in a directory
async function findPdfsRecursively(dirPath, year = null, depth = 0) {
  const pdfFiles = []

  try {
    const entries = await readdir(dirPath)
    if (depth <= 2) console.log(`[SCAN] Scanning ${dirPath} (${entries.length} entries, depth ${depth})`)

    for (const entry of entries) {
      if (entry.startsWith('.')) continue

      const entryPath = join(dirPath, entry)
      const entryStat = await stat(entryPath)

      if (entryStat.isDirectory()) {
        // Try to extract year from subfolder name if not already set
        const yearMatch = entry.match(/\d{4}/)
        const subYear = yearMatch ? parseInt(yearMatch[0]) : year

        // Recursively scan subdirectories
        const subPdfs = await findPdfsRecursively(entryPath, subYear, depth + 1)
        pdfFiles.push(...subPdfs)
      } else if (entry.toLowerCase().endsWith('.pdf')) {
        // Skip duplicate files like filename(1).pdf, filename(2).pdf, etc.
        if (/\(\d+\)\.pdf$/i.test(entry)) continue

        pdfFiles.push({ path: entryPath, year })
      }
    }
  } catch (err) {
    // Silently skip inaccessible directories
  }

  return pdfFiles
}

// Helper: Scan magazine directory and import PDFs
async function scanMagazineDirectory(basePath) {
  const results = { publishers: 0, magazines: 0, errors: [] }

  try {
    const publisherDirs = await readdir(basePath)

    for (const publisherDir of publisherDirs) {
      if (publisherDir.startsWith('.')) continue

      const publisherPath = join(basePath, publisherDir)
      const publisherStat = await stat(publisherPath)
      if (!publisherStat.isDirectory()) continue

      // Extract publisher name (before the Chinese description if any)
      const publisherName = publisherDir.split('丨')[0].trim()

      // Insert or get publisher
      let publisher = db.prepare('SELECT * FROM publishers WHERE name = ?').get(publisherName)
      if (!publisher) {
        const result = db.prepare('INSERT INTO publishers (name, description) VALUES (?, ?)').run(publisherName, publisherDir)
        publisher = { id: result.lastInsertRowid, name: publisherName }
        results.publishers++
      }

      // Recursively find all PDFs in the publisher directory
      const pdfFiles = await findPdfsRecursively(publisherPath)
      console.log(`[SCAN] Publisher ${publisherName}: found ${pdfFiles.length} PDFs`)

      let skippedExisting = 0
      let skippedSmall = 0
      for (const { path: filePath, year } of pdfFiles) {
        // Check if already imported
        const existing = db.prepare('SELECT id FROM magazines WHERE file_path = ?').get(filePath)
        if (existing) { skippedExisting++; continue }

        try {
          const fileStat = await stat(filePath)
          const fileSize = fileStat.size

          // Skip invalid PDFs (less than 10KB)
          if (fileSize < 10240) { skippedSmall++; continue }

          // Parse title from filename
          const title = basename(filePath, '.pdf')

          // Extract issue (e.g., "06.07" from "Bloomberg Markets Asia 06.07 2023.pdf")
          const issueMatch = title.match(/(\d{1,2}[.\-]\d{1,2}|\w+\s\d{4}|Issue\s*\d+)/i)
          const issue = issueMatch ? issueMatch[0] : null

          db.prepare(`
            INSERT INTO magazines (publisher_id, title, file_path, file_size, year, issue)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(publisher.id, title, filePath, fileSize, year, issue)

          results.magazines++
        } catch (err) {
          results.errors.push({ file: filePath, error: err.message })
        }
      }
      console.log(`[SCAN] Publisher ${publisherName}: skipped ${skippedExisting} existing, ${skippedSmall} small (<10KB)`)
    }
  } catch (error) {
    results.errors.push({ path: basePath, error: error.message })
  }

  return results
}

// Get all publishers with magazine counts
app.get('/api/publishers', (req, res) => {
  try {
    const publishers = db.prepare(`
      SELECT p.*, COUNT(m.id) as magazine_count
      FROM publishers p
      LEFT JOIN magazines m ON p.id = m.publisher_id
      GROUP BY p.id
      ORDER BY p.name
    `).all()
    res.json(publishers)
  } catch (error) {
    console.error('Get publishers error:', error)
    res.status(500).json({ error: 'Failed to fetch publishers' })
  }
})

// Get single publisher with magazines
app.get('/api/publishers/:id', (req, res) => {
  try {
    const publisher = db.prepare('SELECT * FROM publishers WHERE id = ?').get(req.params.id)
    if (!publisher) {
      return res.status(404).json({ error: 'Publisher not found' })
    }
    const magazines = db.prepare(`
      SELECT * FROM magazines WHERE publisher_id = ? ORDER BY year DESC, title
    `).all(req.params.id)
    res.json({ ...publisher, magazines })
  } catch (error) {
    console.error('Get publisher error:', error)
    res.status(500).json({ error: 'Failed to fetch publisher' })
  }
})

// Get all magazines (with optional filters)
app.get('/api/magazines', (req, res) => {
  try {
    const { publisher_id, year, search } = req.query
    let query = `
      SELECT m.*, p.name as publisher_name
      FROM magazines m
      JOIN publishers p ON m.publisher_id = p.id
      WHERE 1=1
    `
    const params = []

    if (publisher_id) {
      query += ' AND m.publisher_id = ?'
      params.push(publisher_id)
    }
    if (year !== undefined && year !== null && year !== '') {
      if (year === '0' || year === 0) {
        // year=0 means "Other" - items without valid year
        query += ' AND (m.year IS NULL OR m.year = 0 OR m.year < 1900)'
      } else {
        query += ' AND m.year = ?'
        params.push(year)
      }
    }
    if (search) {
      query += ' AND (m.title LIKE ? OR p.name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY m.year DESC, m.title'

    const magazines = db.prepare(query).all(...params)
    res.json(magazines)
  } catch (error) {
    console.error('Get magazines error:', error)
    res.status(500).json({ error: 'Failed to fetch magazines' })
  }
})

// Get single magazine
app.get('/api/magazines/:id', (req, res) => {
  try {
    const magazine = db.prepare(`
      SELECT m.*, p.name as publisher_name
      FROM magazines m
      JOIN publishers p ON m.publisher_id = p.id
      WHERE m.id = ?
    `).get(req.params.id)

    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }
    res.json(magazine)
  } catch (error) {
    console.error('Get magazine error:', error)
    res.status(500).json({ error: 'Failed to fetch magazine' })
  }
})

// Serve PDF file
app.get('/api/magazines/:id/pdf', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path, s3_key FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    // If cloud storage (R2 or S3) is enabled and file has s3_key, redirect to signed URL
    if (storageClient && magazine.s3_key) {
      const signedUrl = await getSignedUrlForKey(magazine.s3_key, 3600) // 1 hour expiry
      return res.redirect(signedUrl)
    }

    // Fallback to local file
    const pdfBuffer = await readFile(magazine.file_path)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${basename(magazine.file_path)}"`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Serve PDF error:', error)
    res.status(500).json({ error: 'Failed to serve PDF' })
  }
})

// Extract text from a specific page
app.get('/api/magazines/:id/page/:pageNum/text', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    const pageNum = parseInt(req.params.pageNum)
    const pdfBuffer = await readFile(magazine.file_path)

    // Extract text with page range
    const options = {
      max: pageNum,
      pagerender: (pageData) => {
        if (pageData.pageIndex + 1 === pageNum) {
          return pageData.getTextContent().then(textContent => {
            return textContent.items.map(item => item.str).join(' ')
          })
        }
        return ''
      }
    }

    const data = await pdf(pdfBuffer, options)
    res.json({ page: pageNum, text: data.text, numPages: data.numpages })
  } catch (error) {
    console.error('Extract text error:', error)
    res.status(500).json({ error: 'Failed to extract text' })
  }
})

// Get page count for a magazine
app.get('/api/magazines/:id/info', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    // If page count not cached, extract it
    if (!magazine.page_count) {
      const pdfBuffer = await readFile(magazine.file_path)
      const data = await pdf(pdfBuffer, { max: 1 }) // Just get metadata

      // Update page count in database
      db.prepare('UPDATE magazines SET page_count = ? WHERE id = ?').run(data.numpages, magazine.id)
      magazine.page_count = data.numpages
    }

    res.json(magazine)
  } catch (error) {
    console.error('Get magazine info error:', error)
    res.status(500).json({ error: 'Failed to get magazine info' })
  }
})

// Render PDF page as image for flipbook viewer
app.get('/api/magazines/:id/page/:pageNum/image', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT file_path, s3_key, title FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    const pageNum = parseInt(req.params.pageNum)
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' })
    }

    // Create cache directory for rendered pages
    const cacheDir = join(__dirname, '../cache/pages')
    await mkdir(cacheDir, { recursive: true })

    // Generate cache filename using path hash + title for resilience
    const cacheBasename = generateCacheFilename(magazine.file_path, magazine.title)
    const cacheKey = `${cacheBasename}_page_${pageNum}.png`
    const cachePath = join(cacheDir, cacheKey)

    // Check if cached image exists
    if (existsSync(cachePath)) {
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400') // Cache for 1 day
      return res.send(await readFile(cachePath))
    }

    // Get PDF file path
    let pdfPath = magazine.file_path

    // If using cloud storage (R2 or S3), download to temp file first
    if (storageClient && magazine.s3_key) {
      const tempDir = join(__dirname, '../cache/temp')
      await mkdir(tempDir, { recursive: true })
      pdfPath = join(tempDir, `${cacheBasename}.pdf`)

      if (!existsSync(pdfPath)) {
        const storageStream = await streamFromStorage(magazine.s3_key)
        const chunks = []
        for await (const chunk of storageStream) {
          chunks.push(chunk)
        }
        await writeFile(pdfPath, Buffer.concat(chunks))
      }
    }

    // Use pdftoppm to render page as image (requires poppler-utils)
    // pdftoppm renders at 150 DPI by default, -png outputs PNG format
    // -f and -l specify first and last page (same for single page)
    const outputPrefix = join(cacheDir, `temp_${cacheBasename}_${pageNum}`)

    try {
      await execAsync(`pdftoppm -png -f ${pageNum} -l ${pageNum} -r 150 "${pdfPath}" "${outputPrefix}"`)

      // pdftoppm adds page number suffix like temp_1_1-1.png
      const renderedPath = `${outputPrefix}-${pageNum}.png`

      if (existsSync(renderedPath)) {
        // Move to final cache path
        const imageBuffer = await readFile(renderedPath)
        await writeFile(cachePath, imageBuffer)
        await unlink(renderedPath) // Clean up temp file

        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=86400')
        return res.send(imageBuffer)
      }
    } catch (pdfError) {
      console.error('pdftoppm error:', pdfError)
      // Fallback: return a placeholder or error
      return res.status(500).json({
        error: 'Failed to render page. Make sure poppler-utils is installed.',
        hint: 'Install with: brew install poppler (macOS) or apt-get install poppler-utils (Linux)'
      })
    }

    res.status(500).json({ error: 'Failed to render page image' })
  } catch (error) {
    console.error('Render page image error:', error)
    res.status(500).json({ error: 'Failed to render page image' })
  }
})

// Scan and import magazines from directory
app.post('/api/magazines/scan', async (req, res) => {
  try {
    const basePath = req.body.path || MAGAZINE_BASE_PATH
    const results = await scanMagazineDirectory(basePath)
    res.json(results)
  } catch (error) {
    console.error('Scan magazines error:', error)
    res.status(500).json({ error: 'Failed to scan magazines' })
  }
})

// Magazine underlines
app.get('/api/magazines/:id/underlines', (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM magazine_underlines u
      LEFT JOIN magazine_ideas i ON u.id = i.underline_id
      WHERE u.magazine_id = ?
      GROUP BY u.id
      ORDER BY u.page_number, u.start_offset
    `).all(req.params.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

app.post('/api/magazines/:id/underlines', (req, res) => {
  try {
    const magazineId = req.params.id
    const { text, page_number, start_offset, end_offset } = req.body

    if (!text || page_number === undefined || start_offset === undefined || end_offset === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = db.prepare(`
      INSERT INTO magazine_underlines (magazine_id, text, page_number, start_offset, end_offset)
      VALUES (?, ?, ?, ?, ?)
    `).run(magazineId, text, page_number, start_offset, end_offset)

    const newUnderline = db.prepare('SELECT * FROM magazine_underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

app.delete('/api/magazine-underlines/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM magazine_underlines WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// Magazine ideas
app.get('/api/magazine-underlines/:id/ideas', (req, res) => {
  try {
    const ideas = db.prepare('SELECT * FROM magazine_ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

app.post('/api/magazine-underlines/:id/ideas', (req, res) => {
  try {
    const underlineId = req.params.id
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const result = db.prepare('INSERT INTO magazine_ideas (underline_id, content) VALUES (?, ?)').run(underlineId, content)
    const newIdea = db.prepare('SELECT * FROM magazine_ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

app.delete('/api/magazine-ideas/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM magazine_ideas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// Generate cover for a single magazine
app.post('/api/magazines/:id/generate-cover', async (req, res) => {
  try {
    const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(req.params.id)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    // Skip if already has cover
    if (magazine.cover_url && !req.body.force) {
      return res.json({ message: 'Cover already exists', cover_url: magazine.cover_url })
    }

    console.log(`Generating cover for: ${magazine.title}`)
    const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id)

    // Update database
    db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)

    res.json({ message: 'Cover generated', cover_url: coverUrl })
  } catch (error) {
    console.error('Generate cover error:', error)
    res.status(500).json({ error: 'Failed to generate cover', details: error.message })
  }
})

// Generate covers for all magazines (batch operation)
// Progress tracking for batch cover generation
let coverGenerationProgress = {
  running: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  current: '',
  errors: []
}

app.post('/api/magazines/generate-covers', async (req, res) => {
  if (coverGenerationProgress.running) {
    return res.status(409).json({ error: 'Cover generation already in progress', progress: coverGenerationProgress })
  }

  const { publisher_id, force } = req.body

  // Build query for magazines
  let query = 'SELECT * FROM magazines'
  const params = []

  if (publisher_id) {
    query += ' WHERE publisher_id = ?'
    params.push(publisher_id)
  }

  if (!force) {
    query += params.length ? ' AND cover_url IS NULL' : ' WHERE cover_url IS NULL'
  }

  const magazines = db.prepare(query).all(...params)

  // Reset progress
  coverGenerationProgress = {
    running: true,
    total: magazines.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: '',
    errors: []
  }

  // Return immediately with progress info
  res.json({ message: 'Cover generation started', total: magazines.length })

  // Process in background
  ;(async () => {
    for (const magazine of magazines) {
      coverGenerationProgress.current = magazine.title

      try {
        // Skip if already has cover and not forced
        if (magazine.cover_url && !force) {
          coverGenerationProgress.skipped++
          coverGenerationProgress.processed++
          continue
        }

        console.log(`[${coverGenerationProgress.processed + 1}/${magazines.length}] Generating cover for: ${magazine.title}`)
        const coverUrl = await generateCoverFromPdf(magazine.file_path, magazine.id)

        // Update database
        db.prepare('UPDATE magazines SET cover_url = ? WHERE id = ?').run(coverUrl, magazine.id)

        coverGenerationProgress.success++
      } catch (error) {
        console.error(`Failed to generate cover for ${magazine.title}:`, error.message)
        coverGenerationProgress.failed++
        coverGenerationProgress.errors.push({ id: magazine.id, title: magazine.title, error: error.message })
      }

      coverGenerationProgress.processed++
    }

    coverGenerationProgress.running = false
    coverGenerationProgress.current = ''
    console.log('Cover generation complete:', coverGenerationProgress)
  })()
})

// Get cover generation progress
app.get('/api/magazines/generate-covers/progress', (req, res) => {
  res.json(coverGenerationProgress)
})

// Preprocess a single magazine
app.post('/api/magazines/:id/preprocess', async (req, res) => {
  try {
    const result = await preprocessMagazine(req.params.id)
    res.json(result)
  } catch (error) {
    console.error('Preprocess error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Preprocess all magazines (or only non-preprocessed ones)
let preprocessProgress = { running: false, current: 0, total: 0, currentMagazine: '' }

app.post('/api/magazines/preprocess-all', async (req, res) => {
  if (preprocessProgress.running) {
    return res.status(409).json({ error: 'Preprocessing already in progress' })
  }

  const { force = false } = req.body || {}

  // Get magazines to preprocess
  const magazines = force
    ? db.prepare('SELECT id, title FROM magazines ORDER BY id').all()
    : db.prepare('SELECT id, title FROM magazines WHERE preprocessed = 0 OR preprocessed IS NULL ORDER BY id').all()

  if (magazines.length === 0) {
    return res.json({ message: 'No magazines to preprocess', processed: 0 })
  }

  preprocessProgress = { running: true, current: 0, total: magazines.length, currentMagazine: '' }

  res.json({
    message: `Starting preprocessing of ${magazines.length} magazines`,
    total: magazines.length
  })

  // Process in background
  ;(async () => {
    let successCount = 0
    let failCount = 0

    for (const magazine of magazines) {
      preprocessProgress.current++
      preprocessProgress.currentMagazine = magazine.title

      try {
        await preprocessMagazine(magazine.id)
        successCount++
        console.log(`Preprocessed ${preprocessProgress.current}/${magazines.length}: ${magazine.title}`)
      } catch (err) {
        failCount++
        console.error(`Failed to preprocess ${magazine.title}:`, err.message)
      }
    }

    preprocessProgress.running = false
    console.log(`Preprocessing complete: ${successCount} success, ${failCount} failed`)
  })()
})

// Get preprocessing progress
app.get('/api/magazines/preprocess-all/progress', (req, res) => {
  res.json(preprocessProgress)
})

// ==================== EBOOKS API ====================

const EBOOKS_BASE_PATH = '/Volumes/杂志/【基础版】英文书单2024年全年更新'

// Extract ZIP file to same directory
async function extractZipFile(zipPath) {
  const zipDir = dirname(zipPath)
  const zipName = basename(zipPath, '.zip')
  const extractDir = join(zipDir, zipName)

  // Check if already extracted
  try {
    const extractStat = await stat(extractDir)
    if (extractStat.isDirectory()) {
      return extractDir // Already extracted
    }
  } catch {
    // Not extracted yet
  }

  try {
    // Extract ZIP file using unzip command
    await execAsync(`unzip -o -q "${zipPath}" -d "${extractDir}"`)
    return extractDir
  } catch (err) {
    console.error(`Failed to extract ${zipPath}:`, err.message)
    return null
  }
}

// Preprocess magazine PDF pages to images for faster viewing
async function preprocessMagazine(magazineId) {
  const magazine = db.prepare('SELECT * FROM magazines WHERE id = ?').get(magazineId)
  if (!magazine) {
    throw new Error('Magazine not found')
  }

  // Generate cache filename using path hash + title for resilience
  const cacheBasename = generateCacheFilename(magazine.file_path, magazine.title)
  const cacheDir = join(__dirname, '../cache/pages')

  // Get page count from database or PDF info
  let pageCount = magazine.page_count
  let pdfPath = magazine.file_path

  // If using cloud storage (R2 or S3), download to temp file first
  if (storageClient && magazine.s3_key) {
    const tempDir = join(__dirname, '../cache/temp')
    await mkdir(tempDir, { recursive: true })
    pdfPath = join(tempDir, `${cacheBasename}.pdf`)

    if (!existsSync(pdfPath)) {
      const storageStream = await streamFromStorage(magazine.s3_key)
      const chunks = []
      for await (const chunk of storageStream) {
        chunks.push(chunk)
      }
      await writeFile(pdfPath, Buffer.concat(chunks))
    }
  }

  if (!pageCount) {
    // Use pdfinfo to get page count
    try {
      const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages`)
      const match = stdout.match(/Pages:\s*(\d+)/)
      if (match) {
        pageCount = parseInt(match[1])
        db.prepare('UPDATE magazines SET page_count = ? WHERE id = ?').run(pageCount, magazineId)
      }
    } catch (err) {
      console.error('Failed to get page count:', err)
      throw new Error('Failed to get page count from PDF')
    }
  }

  if (!pageCount) {
    throw new Error('Unable to determine page count')
  }

  // Check if cache already exists (all pages present)
  // This allows resuming after server restart without re-processing
  // Support both new format (hash-based) and legacy format (magazine_{id}_page_{num}.png)
  await mkdir(cacheDir, { recursive: true })
  let cachedPages = 0
  let usingLegacyFormat = false
  const legacyBasename = `magazine_${magazineId}`

  // First check new format
  for (let i = 1; i <= pageCount; i++) {
    const cachePath = join(cacheDir, `${cacheBasename}_page_${i}.png`)
    if (existsSync(cachePath)) {
      cachedPages++
    }
  }

  // If not all cached with new format, check legacy format
  if (cachedPages < pageCount) {
    let legacyCachedPages = 0
    for (let i = 1; i <= pageCount; i++) {
      const legacyPath = join(cacheDir, `${legacyBasename}_page_${i}.png`)
      if (existsSync(legacyPath)) {
        legacyCachedPages++
      }
    }
    // Use legacy format if it has more cached pages
    if (legacyCachedPages > cachedPages) {
      cachedPages = legacyCachedPages
      usingLegacyFormat = true
    }
  }

  // If all pages are already cached, just mark as preprocessed and skip
  if (cachedPages === pageCount) {
    db.prepare('UPDATE magazines SET preprocessed = 1 WHERE id = ?').run(magazineId)
    console.log(`Magazine ${magazineId} already cached (${pageCount} pages, ${usingLegacyFormat ? 'legacy format' : 'new format'}), marked as preprocessed`)
    return { success: true, pages: pageCount, total: pageCount, skipped: true }
  }

  // Check if file exists
  if (!existsSync(pdfPath)) {
    throw new Error('PDF file not found: ' + pdfPath)
  }

  console.log(`Preprocessing magazine ${magazineId}: ${magazine.title} (${pageCount} pages, ${cachedPages} already cached)`)

  // Use pdftoppm to render all pages at once (more efficient)
  const outputPrefix = join(cacheDir, `temp_${cacheBasename}`)

  try {
    // Render all pages as PNG (r=150 is a good balance of quality/size)
    // Increased timeout to 10 min and maxBuffer to handle large PDFs
    await execAsync(`pdftoppm -png -r 150 "${pdfPath}" "${outputPrefix}"`, {
      timeout: 600000, // 10 min timeout
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    })

    // pdftoppm creates files like magazine_1-1.png, magazine_1-2.png, etc.
    // Rename them to our standard cache format
    let successCount = 0
    for (let i = 1; i <= pageCount; i++) {
      // pdftoppm pads page numbers, so we need to try different formats
      const possibleNames = [
        `${outputPrefix}-${i}.png`,
        `${outputPrefix}-${String(i).padStart(2, '0')}.png`,
        `${outputPrefix}-${String(i).padStart(3, '0')}.png`,
        `${outputPrefix}-${String(i).padStart(4, '0')}.png`
      ]

      const finalPath = join(cacheDir, `${cacheBasename}_page_${i}.png`)

      for (const srcPath of possibleNames) {
        if (existsSync(srcPath)) {
          // Move to final location if not already there
          if (srcPath !== finalPath) {
            const data = await readFile(srcPath)
            await writeFile(finalPath, data)
            await unlink(srcPath)
          }
          successCount++
          break
        }
      }
    }

    console.log(`Preprocessed ${successCount}/${pageCount} pages for magazine ${magazineId}`)

    // Mark magazine as preprocessed
    db.prepare('UPDATE magazines SET preprocessed = 1 WHERE id = ?').run(magazineId)

    return { success: true, pages: successCount, total: pageCount }
  } catch (err) {
    console.error('Preprocessing error:', err)
    throw new Error('Failed to preprocess magazine: ' + err.message)
  }
}

// Normalize title for deduplication (remove special chars, lowercase, trim)
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '') // Keep only alphanumeric and Chinese characters
    .trim()
}

// Recursive helper to scan for EPUB and PDF files in a folder (handles nested directories)
async function scanFolderForEbooks(folderPath, category, results, depth = 0) {
  if (depth > 10) return // Prevent infinite recursion

  try {
    const items = await readdir(folderPath)

    // Look for ebook files in this directory
    for (const file of items) {
      if (file.startsWith('.') || file.startsWith('._')) continue

      const filePath = join(folderPath, file)

      try {
        const fileStat = await stat(filePath)

        if (fileStat.isDirectory()) {
          // Recurse into subdirectory
          await scanFolderForEbooks(filePath, category, results, depth + 1)
        } else {
          const lowerFile = file.toLowerCase()
          const isEpub = lowerFile.endsWith('.epub')
          const isPdf = lowerFile.endsWith('.pdf')

          if (!isEpub && !isPdf) continue

          // Skip duplicates like "book (1).epub" or "book (1).pdf"
          if (/\(\d+\)\.(epub|pdf)$/i.test(file)) continue

          const fileSize = fileStat.size

          // Skip invalid files (less than 10KB)
          if (fileSize < 10240) continue

          // Extract title from filename
          const ext = isEpub ? '.epub' : '.pdf'
          const fileName = basename(file, ext)
          const title = fileName.replace(/^\d+\./, '').trim()
          const normalizedTitle = normalizeTitle(title || fileName)
          const fileType = isEpub ? 'epub' : 'pdf'

          // Check if this exact file already imported
          const existingByPath = db.prepare('SELECT id FROM ebooks WHERE file_path = ?').get(filePath)
          if (existingByPath) continue

          // Check if same book already exists (by normalized title in same category)
          const existingByTitle = db.prepare(
            'SELECT id, file_type, file_path FROM ebooks WHERE normalized_title = ? AND category_id = ?'
          ).get(normalizedTitle, category.id)

          if (existingByTitle) {
            // If existing is PDF and new is EPUB, replace with EPUB (EPUB has priority)
            if (existingByTitle.file_type === 'pdf' && fileType === 'epub') {
              db.prepare(`
                UPDATE ebooks SET file_path = ?, file_size = ?, file_type = ?, cover_url = NULL
                WHERE id = ?
              `).run(filePath, fileSize, fileType, existingByTitle.id)
              results.upgraded++
              console.log(`[Scan] Upgraded to EPUB: ${title}`)
            } else {
              // Skip - already have this book (either same type or EPUB already exists)
              results.skipped++
            }
            continue
          }

          // Insert new ebook
          db.prepare(`
            INSERT INTO ebooks (category_id, title, file_path, file_size, file_type, normalized_title)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(category.id, title || fileName, filePath, fileSize, fileType, normalizedTitle)

          results.ebooks++

          // Log progress every 100 ebooks
          if (results.ebooks % 100 === 0) {
            console.log(`[Scan] Processed ${results.ebooks} ebooks...`)
          }
        }
      } catch (err) {
        results.errors.push({ file: filePath, error: err.message })
      }
    }
  } catch (err) {
    results.errors.push({ path: folderPath, error: err.message })
  }
}

// Scan ebooks directory
async function scanEbooksDirectory() {
  const results = { categories: 0, ebooks: 0, skipped: 0, upgraded: 0, errors: [] }

  try {
    const categoryDirs = await readdir(EBOOKS_BASE_PATH)

    for (const categoryDir of categoryDirs) {
      if (categoryDir.startsWith('.')) continue

      const categoryPath = join(EBOOKS_BASE_PATH, categoryDir)
      const categoryStat = await stat(categoryPath)
      if (!categoryStat.isDirectory()) continue

      // Extract category name (remove number prefix like "1.")
      const categoryName = categoryDir.replace(/^\d+\./, '').trim()

      // Insert or get category
      let category = db.prepare('SELECT * FROM ebook_categories WHERE name = ?').get(categoryName)
      if (!category) {
        const result = db.prepare('INSERT INTO ebook_categories (name, description) VALUES (?, ?)').run(categoryName, categoryDir)
        category = { id: result.lastInsertRowid, name: categoryName }
        results.categories++
      }

      // Recursively scan for EPUB and PDF files in this category
      await scanFolderForEbooks(categoryPath, category, results)
    }
  } catch (error) {
    results.errors.push({ path: EBOOKS_BASE_PATH, error: error.message })
  }

  console.log(`[Scan] Complete: ${results.ebooks} new, ${results.skipped} skipped, ${results.upgraded} upgraded`)
  return results
}

// Clear all ebooks endpoint
app.delete('/api/ebooks/clear', async (req, res) => {
  try {
    // Delete all ebooks but keep covers for reuse
    const result = db.prepare('DELETE FROM ebooks').run()
    // Also clear categories
    db.prepare('DELETE FROM ebook_categories').run()
    console.log(`[Clear] Deleted ${result.changes} ebooks`)
    res.json({ message: `Deleted ${result.changes} ebooks`, deleted: result.changes })
  } catch (error) {
    console.error('Clear ebooks error:', error)
    res.status(500).json({ error: 'Failed to clear ebooks' })
  }
})

// Scan ebooks endpoint
app.post('/api/ebooks/scan', async (req, res) => {
  try {
    const results = await scanEbooksDirectory()
    res.json(results)
  } catch (error) {
    console.error('Scan ebooks error:', error)
    res.status(500).json({ error: 'Failed to scan ebooks directory' })
  }
})

// Update ebook R2 keys based on file paths (call after rclone sync)
app.post('/api/ebooks/update-r2-keys', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const ebooksBasePath = '/Volumes/杂志/【基础版】英文书单2024年全年更新'
    const ebooks = db.prepare('SELECT id, file_path FROM ebooks WHERE s3_key IS NULL OR s3_key = ""').all()

    let updated = 0
    let errors = 0

    for (const ebook of ebooks) {
      try {
        // Convert local path to R2 key
        // /Volumes/杂志/【基础版】英文书单2024年全年更新/xxx -> ebooks/xxx
        if (ebook.file_path.startsWith(ebooksBasePath)) {
          const relativePath = ebook.file_path.slice(ebooksBasePath.length + 1)
          const r2Key = `ebooks/${relativePath}`

          db.prepare('UPDATE ebooks SET s3_key = ? WHERE id = ?').run(r2Key, ebook.id)
          updated++
        }
      } catch (err) {
        errors++
      }
    }

    res.json({ updated, errors, total: ebooks.length })
  } catch (error) {
    console.error('Update ebook R2 keys error:', error)
    res.status(500).json({ error: 'Failed to update R2 keys' })
  }
})

// Rescan ebooks (clear and scan)
app.post('/api/ebooks/rescan', async (req, res) => {
  try {
    // Clear existing ebooks
    const deleteResult = db.prepare('DELETE FROM ebooks').run()
    db.prepare('DELETE FROM ebook_categories').run()
    console.log(`[Rescan] Deleted ${deleteResult.changes} old ebooks`)

    // Scan for new ebooks
    const results = await scanEbooksDirectory()
    results.deleted = deleteResult.changes
    res.json(results)
  } catch (error) {
    console.error('Rescan ebooks error:', error)
    res.status(500).json({ error: 'Failed to rescan ebooks directory' })
  }
})

// Get all ebook categories with counts
app.get('/api/ebook-categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT ec.*, COUNT(e.id) as ebook_count
      FROM ebook_categories ec
      LEFT JOIN ebooks e ON ec.id = e.category_id
      GROUP BY ec.id
      ORDER BY ec.name
    `).all()
    res.json(categories)
  } catch (error) {
    console.error('Get ebook categories error:', error)
    res.status(500).json({ error: 'Failed to fetch ebook categories' })
  }
})

// Get ebooks by category
app.get('/api/ebooks', (req, res) => {
  try {
    const { category_id, search } = req.query
    let query = 'SELECT * FROM ebooks WHERE 1=1'
    const params = []

    if (category_id) {
      query += ' AND category_id = ?'
      params.push(category_id)
    }

    if (search) {
      query += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    query += ' ORDER BY title'

    const ebooks = db.prepare(query).all(...params)
    res.json(ebooks)
  } catch (error) {
    console.error('Get ebooks error:', error)
    res.status(500).json({ error: 'Failed to fetch ebooks' })
  }
})

// Get single ebook
app.get('/api/ebooks/:id', (req, res) => {
  try {
    const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }
    res.json(ebook)
  } catch (error) {
    console.error('Get ebook error:', error)
    res.status(500).json({ error: 'Failed to fetch ebook' })
  }
})

// Generate cover for single ebook
app.post('/api/ebooks/:id/generate-cover', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT * FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    const coverUrl = await generateEbookCover(ebook.file_path, ebook.id, ebook.title)
    db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)

    res.json({ success: true, cover_url: coverUrl })
  } catch (error) {
    console.error('Generate ebook cover error:', error)
    res.status(500).json({ error: 'Failed to generate cover' })
  }
})

// Ebook cover generation progress tracking
let ebookCoverProgress = {
  running: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  current: ''
}

// Batch generate ebook covers
app.post('/api/ebooks/generate-covers', async (req, res) => {
  if (ebookCoverProgress.running) {
    return res.status(409).json({
      error: 'Cover generation already in progress',
      progress: ebookCoverProgress
    })
  }

  const { category_id } = req.body

  // Get ebooks that need covers
  let query = 'SELECT * FROM ebooks WHERE cover_url IS NULL'
  const params = []
  if (category_id) {
    query += ' AND category_id = ?'
    params.push(category_id)
  }

  const ebooks = db.prepare(query).all(...params)

  if (ebooks.length === 0) {
    return res.json({ message: 'All ebooks already have covers', total: 0 })
  }

  // Initialize progress
  ebookCoverProgress = {
    running: true,
    total: ebooks.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: ''
  }

  res.json({ message: 'Cover generation started', total: ebooks.length })

  // Process in background
  ;(async () => {
    for (const ebook of ebooks) {
      ebookCoverProgress.current = ebook.title

      try {
        // Check if file exists
        await stat(ebook.file_path)

        const coverUrl = await generateEbookCover(ebook.file_path, ebook.id, ebook.title)
        db.prepare('UPDATE ebooks SET cover_url = ? WHERE id = ?').run(coverUrl, ebook.id)
        ebookCoverProgress.success++
      } catch (error) {
        console.error(`Failed to generate cover for ${ebook.title}:`, error.message)
        ebookCoverProgress.failed++
      }

      ebookCoverProgress.processed++
    }

    ebookCoverProgress.running = false
    ebookCoverProgress.current = ''
    console.log('Ebook cover generation complete:', ebookCoverProgress)
  })()
})

// Get ebook cover generation progress
app.get('/api/ebooks/generate-covers/progress', (req, res) => {
  res.json(ebookCoverProgress)
})

// Serve ebook file (stream from R2 to avoid CORS issues)
app.get('/api/ebooks/:id/file', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT *, s3_key FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    // Use R2 storage only (no local fallback)
    if (storageClient && ebook.s3_key) {
      try {
        // Stream file from R2 instead of redirecting to avoid CORS issues
        const stream = await streamFromStorage(ebook.s3_key)
        if (!stream) {
          return res.status(500).json({ error: 'Failed to stream ebook from storage' })
        }

        // Determine content type from file extension
        const ext = extname(ebook.file_path).toLowerCase()
        const contentType = ext === '.epub' ? 'application/epub+zip' : 'application/pdf'

        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(ebook.title)}${ext}"`)

        // Pipe the stream to response
        stream.pipe(res)
        return
      } catch (r2Error) {
        console.error(`[Ebook] R2 error for ${ebook.s3_key}:`, r2Error.message)
        return res.status(500).json({ error: 'Failed to access ebook from storage' })
      }
    }

    res.status(404).json({ error: 'Ebook not available in cloud storage' })
  } catch (error) {
    console.error('Serve ebook file error:', error)
    res.status(500).json({ error: 'Failed to serve ebook file' })
  }
})

// Helper function to parse EPUB file
function parseEpub(filePath) {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath)
    epub.on('end', () => {
      resolve(epub)
    })
    epub.on('error', reject)
    epub.parse()
  })
}

// Helper function to get EPUB chapter content
function getEpubChapter(epub, chapterId) {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err, text) => {
      if (err) reject(err)
      else resolve(text)
    })
  })
}

// Get ebook text content (all pages/chapters)
app.get('/api/ebooks/:id/text', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT *, s3_key FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    const fileExt = extname(ebook.file_path).toLowerCase()

    // Handle EPUB files
    if (fileExt === '.epub') {
      let tempFile = null

      // Download from R2 storage only (no local fallback)
      if (!storageClient || !ebook.s3_key) {
        return res.status(404).json({ error: 'Ebook not available in cloud storage' })
      }

      const epubBuffer = await downloadFromStorage(ebook.s3_key)
      if (!epubBuffer) {
        return res.status(500).json({ error: 'Failed to download ebook from storage' })
      }

      // Write to temp file for epub library
      tempFile = join(__dirname, `temp_${ebook.id}.epub`)
      await writeFile(tempFile, epubBuffer)
      const epubPath = tempFile

      try {
        const epub = await parseEpub(epubPath)
      const chapters = []

      // Get table of contents / flow
      const flow = epub.flow || []

      for (let i = 0; i < flow.length; i++) {
        const chapter = flow[i]
        try {
          const htmlContent = await getEpubChapter(epub, chapter.id)
          // Strip HTML tags but preserve structure
          const textContent = htmlContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
            .trim()

          if (textContent) {
            // Find chapter title from TOC
            const tocItem = epub.toc?.find(t => t.href?.includes(chapter.id))
            chapters.push({
              id: chapter.id,
              title: tocItem?.title || `Chapter ${i + 1}`,
              content: textContent,
              html: htmlContent
            })
          }
        } catch (err) {
          console.error(`Error reading chapter ${chapter.id}:`, err)
        }
      }

        // Clean up temp file
        if (tempFile && existsSync(tempFile)) {
          await unlink(tempFile)
        }

        return res.json({
          title: epub.metadata?.title || ebook.title,
          author: epub.metadata?.creator,
          format: 'epub',
          totalChapters: chapters.length,
          toc: epub.toc?.map(t => ({ title: t.title, id: t.id })) || [],
          chapters: chapters
        })
      } finally {
        // Ensure temp file is cleaned up even on error
        if (tempFile && existsSync(tempFile)) {
          await unlink(tempFile).catch(() => {})
        }
      }
    }

    // Handle PDF files - R2 storage only (no local fallback)
    if (!storageClient || !ebook.s3_key) {
      return res.status(404).json({ error: 'Ebook not available in cloud storage' })
    }

    const pdfBuffer = await downloadFromStorage(ebook.s3_key)
    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Failed to download ebook from storage' })
    }

    const data = await pdf(pdfBuffer)

    // Split text into pages/paragraphs for better reading
    const pages = []
    const rawText = data.text || ''

    // Split by form feed (PDF page separator) or double newlines
    const chunks = rawText.split(/\f|\n\n+/).filter(chunk => chunk.trim())

    chunks.forEach((chunk, index) => {
      const trimmed = chunk.trim()
      if (trimmed) {
        pages.push({
          page: index + 1,
          content: trimmed
        })
      }
    })

    res.json({
      title: ebook.title,
      format: 'pdf',
      totalPages: data.numpages,
      pages: pages
    })
  } catch (error) {
    console.error('Extract ebook text error:', error)
    res.status(500).json({ error: 'Failed to extract ebook text' })
  }
})

// Get ebook page count and info
app.get('/api/ebooks/:id/info', async (req, res) => {
  try {
    const ebook = db.prepare('SELECT *, s3_key FROM ebooks WHERE id = ?').get(req.params.id)
    if (!ebook) {
      return res.status(404).json({ error: 'Ebook not found' })
    }

    // R2 storage only (no local fallback)
    if (!storageClient || !ebook.s3_key) {
      return res.status(404).json({ error: 'Ebook not available in cloud storage' })
    }

    const pdfBuffer = await downloadFromStorage(ebook.s3_key)
    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Failed to download ebook from storage' })
    }

    const data = await pdf(pdfBuffer, { max: 1 })

    res.json({
      id: ebook.id,
      title: ebook.title,
      totalPages: data.numpages
    })
  } catch (error) {
    console.error('Get ebook info error:', error)
    res.status(500).json({ error: 'Failed to get ebook info' })
  }
})

// ==================================
// Ebook Underlines and Ideas API
// ==================================

// Get all underlines for an ebook (with idea counts)
app.get('/api/ebooks/:id/underlines', requireAuth, (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT eu.*, COUNT(ei.id) as idea_count
      FROM ebook_underlines eu
      LEFT JOIN ebook_ideas ei ON ei.underline_id = eu.id
      WHERE eu.ebook_id = ? AND eu.user_id = ?
      GROUP BY eu.id
      ORDER BY eu.chapter_index, eu.paragraph_index, eu.start_offset
    `).all(req.params.id, req.user.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get ebook underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

// Create underline for an ebook
app.post('/api/ebooks/:id/underlines', requireAuth, (req, res) => {
  try {
    const { text, paragraph, chapter_index, paragraph_index, start_offset, end_offset, cfi_range } = req.body
    const result = db.prepare(`
      INSERT INTO ebook_underlines (ebook_id, text, paragraph, chapter_index, paragraph_index, start_offset, end_offset, cfi_range, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, text, paragraph || null, chapter_index || 0, paragraph_index, start_offset, end_offset, cfi_range || null, req.user.id)

    const newUnderline = db.prepare('SELECT * FROM ebook_underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ ...newUnderline, idea_count: 0 })
  } catch (error) {
    console.error('Create ebook underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

// Delete an ebook underline
app.delete('/api/ebook-underlines/:id', requireAuth, (req, res) => {
  try {
    const underline = db.prepare('SELECT * FROM ebook_underlines WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!underline) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    db.prepare('DELETE FROM ebook_underlines WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete ebook underline error:', error)
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// Get ideas for an ebook underline
app.get('/api/ebook-underlines/:id/ideas', requireAuth, (req, res) => {
  try {
    const ideas = db.prepare(`
      SELECT * FROM ebook_ideas WHERE underline_id = ? ORDER BY created_at DESC
    `).all(req.params.id)
    res.json(ideas)
  } catch (error) {
    console.error('Get ebook ideas error:', error)
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

// Add idea to an ebook underline
app.post('/api/ebook-underlines/:id/ideas', requireAuth, (req, res) => {
  try {
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify the underline exists and belongs to the user
    const underline = db.prepare(`
      SELECT * FROM ebook_underlines WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id)

    if (!underline) {
      return res.status(404).json({ error: 'Underline not found' })
    }

    const result = db.prepare(`
      INSERT INTO ebook_ideas (underline_id, content, user_id)
      VALUES (?, ?, ?)
    `).run(req.params.id, content.trim(), req.user.id)

    // Update idea count
    db.prepare(`
      UPDATE ebook_underlines SET idea_count = idea_count + 1 WHERE id = ?
    `).run(req.params.id)

    const newIdea = db.prepare('SELECT * FROM ebook_ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create ebook idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

// Update an ebook idea
app.patch('/api/ebook-ideas/:id', requireAuth, (req, res) => {
  try {
    const { content } = req.body
    const idea = db.prepare(`
      SELECT ei.* FROM ebook_ideas ei
      JOIN ebook_underlines eu ON ei.underline_id = eu.id
      WHERE ei.id = ? AND eu.user_id = ?
    `).get(req.params.id, req.user.id)

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' })
    }

    db.prepare('UPDATE ebook_ideas SET content = ? WHERE id = ?').run(content, req.params.id)
    const updatedIdea = db.prepare('SELECT * FROM ebook_ideas WHERE id = ?').get(req.params.id)
    res.json(updatedIdea)
  } catch (error) {
    console.error('Update ebook idea error:', error)
    res.status(500).json({ error: 'Failed to update idea' })
  }
})

// Delete an ebook idea
app.delete('/api/ebook-ideas/:id', requireAuth, (req, res) => {
  try {
    const idea = db.prepare(`
      SELECT ei.* FROM ebook_ideas ei
      JOIN ebook_underlines eu ON ei.underline_id = eu.id
      WHERE ei.id = ? AND eu.user_id = ?
    `).get(req.params.id, req.user.id)

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' })
    }

    db.prepare('DELETE FROM ebook_ideas WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete ebook idea error:', error)
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// AI-powered meaning endpoint - uses DeepSeek to explain text in context
app.post('/api/ai/meaning', requireAuth, async (req, res) => {
  try {
    const { text, paragraph, targetLanguage = 'zh' } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    // Use DeepSeek API for intelligent meaning extraction
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    if (!deepseekApiKey) {
      return res.status(500).json({ error: 'AI service not configured. Please add DEEPSEEK_API_KEY to .env' })
    }

    const systemPrompt = targetLanguage === 'zh'
      ? `You are a helpful translation and explanation assistant. When given a selected text and its surrounding paragraph, provide:

1. **Selected Text Translation:** Translate just the selected text to Chinese
2. **Paragraph Translation:** Translate the full paragraph to Chinese
3. **Context Explanation:** Explain what the selected text means in this specific context (in Chinese)
4. **Notes:** Any idioms, cultural references, or nuanced expressions (in Chinese, if applicable)

Keep responses clear and well-formatted.`
      : `You are a helpful translation and explanation assistant. When given a selected text and its surrounding paragraph, provide:

1. **Selected Text Translation:** Translate just the selected text to English
2. **Paragraph Translation:** Translate the full paragraph to English
3. **Context Explanation:** Explain what the selected text means in this specific context (in English)
4. **Notes:** Any idioms, cultural references, or nuanced expressions (in English, if applicable)

Keep responses clear and well-formatted.`

    const userMessage = paragraph && paragraph !== text
      ? `Selected text: "${text}"\n\nFull paragraph:\n"${paragraph}"\n\nPlease translate and explain.`
      : `Text: "${text}"\n\nPlease translate and explain this text. Since no paragraph context is provided, focus on the general meaning.`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('DeepSeek API error:', errorData)
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const meaning = data.choices?.[0]?.message?.content || 'Unable to generate meaning'

    res.json({
      text,
      meaning,
      targetLanguage
    })
  } catch (error) {
    console.error('AI meaning error:', error)
    res.status(500).json({ error: 'Failed to get meaning' })
  }
})

// AI-powered image explanation endpoint - uses Google Cloud Vision for OCR + DeepSeek for explanation
app.post('/api/ai/explain-image', requireAuth, async (req, res) => {
  try {
    const { imageUrl, targetLanguage = 'en' } = req.body

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' })
    }

    // First, use Google Cloud Vision to extract text and labels from the image
    let extractedText = ''
    let labels = []

    try {
      // Check if it's a base64 image
      if (imageUrl.startsWith('data:image')) {
        const base64Data = imageUrl.split(',')[1]
        const [result] = await visionClient.annotateImage({
          image: { content: base64Data },
          features: [
            { type: 'TEXT_DETECTION' },
            { type: 'LABEL_DETECTION', maxResults: 5 }
          ]
        })

        extractedText = result.fullTextAnnotation?.text || ''
        labels = result.labelAnnotations?.map(l => l.description) || []
      }
    } catch (visionError) {
      console.error('Vision API error:', visionError)
      // Continue without vision results
    }

    // Use DeepSeek to explain the image based on extracted content
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    if (!deepseekApiKey) {
      // If no DeepSeek, just return vision results
      const explanation = extractedText
        ? `**Detected Text:**\n${extractedText}${labels.length ? `\n\n**Image Labels:** ${labels.join(', ')}` : ''}`
        : 'Unable to analyze image - AI service not configured'
      return res.json({ imageUrl, explanation, targetLanguage })
    }

    const systemPrompt = targetLanguage === 'zh'
      ? `你是一个有帮助的助手，可以解释图像内容。根据提供的文字和标签信息，请：
1. 解释图像中的内容
2. 如果有文字，解释其含义和上下文
3. 提供有用的背景信息

保持简洁但信息丰富。用中文回复。`
      : `You are a helpful assistant that explains image content. Based on the text and labels provided, please:
1. Explain what the image likely contains
2. If there's text, explain its meaning and context
3. Provide useful background information

Keep your response concise but informative. Respond in English.`

    const userMessage = extractedText || labels.length
      ? `Here is the content detected from an image:\n\n${extractedText ? `**Text found:**\n${extractedText}\n\n` : ''}${labels.length ? `**Visual elements detected:** ${labels.join(', ')}` : ''}\n\nPlease explain what this image likely shows and provide context.`
      : 'I could not detect any text or recognize elements in this image. Please provide a general description of what book/document images might contain.'

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('DeepSeek API error:', errorData)
      // Fall back to just vision results
      const explanation = extractedText
        ? `**Detected Text:**\n${extractedText}${labels.length ? `\n\n**Image Labels:** ${labels.join(', ')}` : ''}`
        : 'Unable to analyze image'
      return res.json({ imageUrl, explanation, targetLanguage })
    }

    const data = await response.json()
    let explanation = data.choices?.[0]?.message?.content || 'Unable to analyze image'

    // Append original extracted text if available
    if (extractedText) {
      explanation += `\n\n---\n**Original Text from Image:**\n${extractedText}`
    }

    res.json({
      imageUrl,
      explanation,
      targetLanguage
    })
  } catch (error) {
    console.error('AI image explanation error:', error)
    res.status(500).json({ error: 'Failed to analyze image' })
  }
})

// ==================================
// Notes API (Thinking feature)
// ==================================

const NOTES_FOLDER = process.env.NOTES_FOLDER || join(__dirname, '../../../../blog')

// Get all notes with optional year filter (user-specific)
app.get('/api/notes', (req, res) => {
  try {
    if (!req.user) {
      return res.json([])
    }
    const { year, search } = req.query
    let query = 'SELECT * FROM notes WHERE user_id = ?'
    const params = [req.user.id]

    if (year) {
      query += ' AND year = ?'
      params.push(parseInt(year))
    }

    if (search) {
      query += ' AND (title LIKE ? OR content_preview LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm)
    }

    query += ' ORDER BY year DESC, title ASC'

    const notes = db.prepare(query).all(...params)
    res.json(notes)
  } catch (error) {
    console.error('Get notes error:', error)
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

// Get years with note counts (user-specific)
app.get('/api/notes/years', (req, res) => {
  try {
    if (!req.user) {
      return res.json([])
    }
    const years = db.prepare(`
      SELECT year, COUNT(*) as count
      FROM notes
      WHERE year IS NOT NULL AND user_id = ?
      GROUP BY year
      ORDER BY year DESC
    `).all(req.user.id)
    res.json(years)
  } catch (error) {
    console.error('Get note years error:', error)
    res.status(500).json({ error: 'Failed to fetch note years' })
  }
})

// Get a single note
app.get('/api/notes/:id', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }
    res.json(note)
  } catch (error) {
    console.error('Get note error:', error)
    res.status(500).json({ error: 'Failed to fetch note' })
  }
})

// Full import of notes with metadata and comments (requires auth)
app.post('/api/notes/scan', requireAuth, async (req, res) => {
  try {
    console.log('Full import from:', NOTES_FOLDER, 'for user:', req.user.id)

    // Clear existing notes and comments for this user
    db.prepare('DELETE FROM note_comments WHERE user_id = ?').run(req.user.id)
    db.prepare('DELETE FROM note_underlines WHERE note_id IN (SELECT id FROM notes WHERE user_id = ?)').run(req.user.id)
    db.prepare('DELETE FROM notes WHERE user_id = ?').run(req.user.id)

    const insertNote = db.prepare(`
      INSERT INTO notes (title, file_path, year, content_preview, user_id, author, publish_date, tags, categories, slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertComment = db.prepare(`
      INSERT INTO note_comments (note_id, nick, content, original_date, user_id)
      VALUES (?, ?, ?, ?, ?)
    `)

    let scanned = 0
    let commentsImported = 0
    let errors = 0

    // Load comments from JSON file
    let allComments = []
    const commentsFile = join(NOTES_FOLDER, 'db', 'Comment.0.json')
    try {
      const commentsContent = await readFile(commentsFile, 'utf-8')
      // Each line is a separate JSON object
      allComments = commentsContent.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)
      console.log(`Loaded ${allComments.length} comments from Comment.0.json`)
    } catch (err) {
      console.log('No comments file found or error reading:', err.message)
    }

    // Helper to parse frontmatter
    function parseFrontmatter(content) {
      const frontmatter = {}

      // Try standard YAML frontmatter first (between --- markers)
      let match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)

      // Also try frontmatter without opening --- (Hexo style: starts with key:)
      if (!match) {
        match = content.match(/^((?:[a-z]+:\s*[^\n]*\n|\s+-\s+[^\n]*\n)+)---\r?\n?([\s\S]*)$/i)
      }

      if (!match) return { frontmatter, body: content }

      const yamlStr = match[1]
      const body = match[2]

      const lines = yamlStr.split('\n')
      let currentKey = null
      let currentArray = null

      for (const line of lines) {
        const keyMatch = line.match(/^(\w+):\s*(.*)$/)
        if (keyMatch) {
          currentKey = keyMatch[1]
          const value = keyMatch[2].trim()
          if (value === '' || value === '[]') {
            frontmatter[currentKey] = []
            currentArray = currentKey
          } else if (value.startsWith('[') && value.endsWith(']')) {
            frontmatter[currentKey] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
            currentArray = null
          } else {
            frontmatter[currentKey] = value.replace(/['"]/g, '')
            currentArray = null
          }
        } else if (line.match(/^\s+-\s+(.*)$/) && currentArray) {
          const item = line.match(/^\s+-\s+(.*)$/)[1].trim().replace(/['"]/g, '')
          if (item) frontmatter[currentArray].push(item)
        }
      }

      return { frontmatter, body }
    }

    // Helper to clean preview text
    function cleanPreview(text) {
      return text
        // Remove any remaining frontmatter-like lines (key: value)
        .replace(/^(title|author|date|tags|categories|layout|comments):\s*.*$/gm, '')
        .replace(/^\s*-\s+(日记|生活|技术|我的大学).*$/gm, '')  // YAML list items
        .replace(/^---\s*$/gm, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/^>\s+/gm, '')
        .replace(/^\s*-\s+/gm, '')  // Remove bullet points
        .replace(/\[\]/g, '')
        .replace(/\n{2,}/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .substring(0, 300)
    }

    // Helper to get year from date string
    function extractYear(dateStr) {
      if (!dateStr) return null
      const match = dateStr.match(/(\d{4})/)
      return match ? parseInt(match[1]) : null
    }

    // Helper to generate slug from filename
    function generateSlug(filename, date) {
      const name = filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
      if (date) {
        const dateMatch = date.match(/(\d{4})-(\d{2})-(\d{2})/)
        if (dateMatch) {
          return `/${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}/${encodeURIComponent(name)}/`
        }
      }
      return `/${encodeURIComponent(name)}/`
    }

    // Helper to strip HTML from comment content
    function stripHtml(html) {
      return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim()
    }

    // Scan posts directory
    const postsDir = join(NOTES_FOLDER, 'source', '_posts')
    try {
      const entries = await readdir(postsDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.name.endsWith('.md') || entry.name.toLowerCase().includes('readme')) continue

        const fullPath = join(postsDir, entry.name)
        try {
          const content = await readFile(fullPath, 'utf-8')
          const { frontmatter, body } = parseFrontmatter(content)

          // Extract title from frontmatter or filename
          let title = frontmatter.title || entry.name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')

          // Extract metadata
          const author = frontmatter.author || '书虫'
          const publishDate = frontmatter.date || null
          const year = extractYear(publishDate)
          const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(',') : (frontmatter.tags || '')
          const categories = Array.isArray(frontmatter.categories) ? frontmatter.categories.join(',') : (frontmatter.categories || '')
          const slug = generateSlug(entry.name, publishDate)

          // Clean preview
          const preview = cleanPreview(body)

          // Insert note
          const result = insertNote.run(
            title, fullPath, year, preview, req.user.id,
            author, publishDate, tags, categories, slug
          )
          const noteId = result.lastInsertRowid
          scanned++

          // Find and import related comments
          const relatedComments = allComments.filter(c => {
            if (!c.url) return false
            // Match by slug or title in URL
            const urlTitle = decodeURIComponent(c.url.split('/').filter(Boolean).pop() || '')
            const noteTitle = title.replace(/\s+/g, '-')
            return c.url.includes(slug) ||
                   urlTitle === noteTitle ||
                   c.url.includes(encodeURIComponent(title))
          })

          for (const comment of relatedComments) {
            const commentContent = stripHtml(comment.comment || '')
            if (commentContent) {
              const commentDate = comment.createdAt || comment.insertedAt?.iso || null
              insertComment.run(noteId, comment.nick || 'Anonymous', commentContent, commentDate, req.user.id)
              commentsImported++
            }
          }

        } catch (err) {
          console.error(`Error processing ${entry.name}:`, err.message)
          errors++
        }
      }
    } catch (err) {
      console.error('Error reading posts directory:', err.message)
    }

    // Also scan drafts if exists
    const draftsDir = join(NOTES_FOLDER, 'source', '_drafts')
    try {
      const drafts = await readdir(draftsDir, { withFileTypes: true })
      for (const entry of drafts) {
        if (!entry.name.endsWith('.md')) continue
        const fullPath = join(draftsDir, entry.name)
        try {
          const content = await readFile(fullPath, 'utf-8')
          const { frontmatter, body } = parseFrontmatter(content)
          const title = frontmatter.title || entry.name.replace(/\.md$/, '')
          const preview = cleanPreview(body)
          insertNote.run(title, fullPath, null, preview, req.user.id, frontmatter.author || '书虫', null, '', '', '')
          scanned++
        } catch (err) {
          errors++
        }
      }
    } catch {
      // Drafts folder may not exist
    }

    console.log(`Import complete: ${scanned} notes, ${commentsImported} comments, ${errors} errors`)
    res.json({ scanned, commentsImported, errors })
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ error: 'Failed to import notes' })
  }
})

// Helper: Parse markdown frontmatter and content
function parseMarkdownNote(rawContent) {
  let frontmatter = {}
  let content = rawContent

  // Check for YAML frontmatter (between --- markers)
  let frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)

  // Also try frontmatter without opening --- (Hexo style: starts with key:)
  if (!frontmatterMatch) {
    frontmatterMatch = rawContent.match(/^((?:[a-z]+:\s*[^\n]*\n|\s+-\s+[^\n]*\n)+)---\r?\n?([\s\S]*)$/i)
  }

  if (frontmatterMatch) {
    const yamlStr = frontmatterMatch[1]
    content = frontmatterMatch[2]

    // Parse YAML frontmatter manually
    const lines = yamlStr.split('\n')
    let currentKey = null
    let currentArray = null

    for (const line of lines) {
      const keyMatch = line.match(/^(\w+):\s*(.*)$/)
      if (keyMatch) {
        currentKey = keyMatch[1]
        const value = keyMatch[2].trim()
        if (value === '' || value === '[]') {
          frontmatter[currentKey] = []
          currentArray = currentKey
        } else if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[currentKey] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
          currentArray = null
        } else {
          frontmatter[currentKey] = value.replace(/['"]/g, '')
          currentArray = null
        }
      } else if (line.match(/^\s+-\s+(.*)$/) && currentArray) {
        const item = line.match(/^\s+-\s+(.*)$/)[1].trim().replace(/['"]/g, '')
        if (item) {
          frontmatter[currentArray].push(item)
        }
      }
    }
  }

  // Remove HTML comments like <!-- more -->
  content = content.replace(/<!--[\s\S]*?-->/g, '')

  // Clean up extra blank lines
  content = content.replace(/\n{3,}/g, '\n\n').trim()

  return { frontmatter, content }
}

// Serve note content (requires authentication - content from R2)
app.get('/api/notes/:id/content', async (req, res) => {
  try {
    // Require authentication for note content
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }

    let rawContent
    // Try R2 first if s3_key exists
    if (note.s3_key && storageClient) {
      try {
        const buffer = await downloadFromStorage(note.s3_key)
        if (buffer) {
          rawContent = buffer.toString('utf-8')
        }
      } catch (r2Error) {
        console.log('R2 fetch failed, falling back to local:', r2Error.message)
      }
    }
    // Fallback to local file if R2 didn't work
    if (!rawContent) {
      rawContent = await readFile(note.file_path, 'utf-8')
    }
    const { frontmatter, content } = parseMarkdownNote(rawContent)

    // Also fetch underlines for this note
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM note_underlines u
      LEFT JOIN note_ideas i ON u.id = i.underline_id
      WHERE u.note_id = ?
      GROUP BY u.id
      ORDER BY u.paragraph_index, u.start_offset
    `).all(req.params.id)

    // Fetch comments for this note
    const comments = db.prepare(`
      SELECT * FROM note_comments
      WHERE note_id = ?
      ORDER BY original_date ASC, created_at ASC
    `).all(req.params.id)

    res.json({
      ...note,
      content,
      frontmatter,
      date: frontmatter.date || null,
      author: frontmatter.author || null,
      tags: frontmatter.tags || [],
      categories: frontmatter.categories || [],
      underlines,
      comments
    })
  } catch (error) {
    console.error('Get note content error:', error)
    res.status(500).json({ error: 'Failed to fetch note content' })
  }
})

// Serve blog images (requires authentication - served from R2)
app.get('/api/blog-images/:filename', async (req, res) => {
  try {
    // Require authentication for blog images
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { filename } = req.params
    const r2Key = `blog-images/${filename}`

    // Try R2 first
    if (storageClient) {
      try {
        const stream = await streamFromStorage(r2Key)
        if (stream) {
          // Set appropriate content type
          const ext = filename.split('.').pop().toLowerCase()
          const contentTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
          }
          res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream')
          res.setHeader('Cache-Control', 'public, max-age=31536000')
          stream.pipe(res)
          return
        }
      } catch (r2Error) {
        console.log('R2 blog image fetch failed, falling back to local:', r2Error.message)
      }
    }

    // Fallback to local file
    const localPath = join(NOTES_FOLDER, 'source/images', filename)
    res.sendFile(localPath)
  } catch (error) {
    console.error('Blog image error:', error)
    res.status(404).json({ error: 'Image not found' })
  }
})

// Note underlines
app.get('/api/notes/:id/underlines', (req, res) => {
  try {
    const underlines = db.prepare(`
      SELECT u.*, COUNT(i.id) as idea_count
      FROM note_underlines u
      LEFT JOIN note_ideas i ON u.id = i.underline_id
      WHERE u.note_id = ?
      GROUP BY u.id
      ORDER BY u.paragraph_index, u.start_offset
    `).all(req.params.id)
    res.json(underlines)
  } catch (error) {
    console.error('Get note underlines error:', error)
    res.status(500).json({ error: 'Failed to fetch underlines' })
  }
})

app.post('/api/notes/:id/underlines', requireAuth, (req, res) => {
  try {
    const { text, paragraph_index, start_offset, end_offset } = req.body
    if (!text || paragraph_index === undefined) {
      return res.status(400).json({ error: 'Text and paragraph_index are required' })
    }

    const result = db.prepare(`
      INSERT INTO note_underlines (note_id, text, paragraph_index, start_offset, end_offset, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, text, paragraph_index, start_offset || 0, end_offset || 0, req.user.id)

    const newUnderline = db.prepare('SELECT * FROM note_underlines WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newUnderline)
  } catch (error) {
    console.error('Create note underline error:', error)
    res.status(500).json({ error: 'Failed to create underline' })
  }
})

app.delete('/api/note-underlines/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM note_underlines WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Underline not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete underline' })
  }
})

// Note ideas
app.get('/api/note-underlines/:id/ideas', (req, res) => {
  try {
    const ideas = db.prepare('SELECT * FROM note_ideas WHERE underline_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json(ideas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ideas' })
  }
})

app.post('/api/note-underlines/:id/ideas', requireAuth, (req, res) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const result = db.prepare('INSERT INTO note_ideas (underline_id, content, user_id) VALUES (?, ?, ?)').run(req.params.id, content, req.user.id)
    const newIdea = db.prepare('SELECT * FROM note_ideas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(newIdea)
  } catch (error) {
    console.error('Create note idea error:', error)
    res.status(500).json({ error: 'Failed to create idea' })
  }
})

app.delete('/api/note-ideas/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM note_ideas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Idea not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' })
  }
})

// Create a new note
app.post('/api/notes', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }

    const notesFolder = process.env.NOTES_FOLDER || '/Volumes/T9/笔记'
    const year = new Date().getFullYear()
    const yearFolder = join(notesFolder, year.toString())

    // Create year folder if it doesn't exist
    if (!existsSync(yearFolder)) {
      await mkdir(yearFolder, { recursive: true })
    }

    // Create a safe filename from the title
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100)
    const timestamp = Date.now()
    const filename = `${safeTitle}-${timestamp}.md`
    const filePath = join(yearFolder, filename)

    // Write content to file
    await writeFile(filePath, content, 'utf-8')

    // Insert into database
    const result = db.prepare(`
      INSERT INTO notes (title, content_preview, file_path, year, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      title,
      content.substring(0, 200),
      filePath,
      year,
      req.user.id
    )

    res.json({
      id: result.lastInsertRowid,
      title,
      year,
      file_path: filePath
    })
  } catch (error) {
    console.error('Create note error:', error)
    res.status(500).json({ error: 'Failed to create note' })
  }
})

// ==================================
// Reading History API (Bookshelf)
// ==================================

// Get reading history for current user (categorized)
app.get('/api/reading-history', (req, res) => {
  try {
    if (!req.user) {
      return res.json({ ebooks: [], magazines: [], books: [] })
    }

    const history = db.prepare(`
      SELECT * FROM reading_history
      WHERE user_id = ?
      ORDER BY last_read_at DESC
    `).all(req.user.id)

    // Categorize by item_type
    const ebooks = history.filter(h => h.item_type === 'ebook')
    const magazines = history.filter(h => h.item_type === 'magazine')
    const books = history.filter(h => h.item_type === 'book')

    res.json({ ebooks, magazines, books })
  } catch (error) {
    console.error('Get reading history error:', error)
    res.status(500).json({ error: 'Failed to fetch reading history' })
  }
})

// Save/update reading progress
app.post('/api/reading-history', requireAuth, (req, res) => {
  try {
    const { item_type, item_id, title, cover_url, last_page } = req.body

    if (!item_type || !item_id || !title) {
      return res.status(400).json({ error: 'item_type, item_id, and title are required' })
    }

    // Use INSERT OR REPLACE to update if exists
    db.prepare(`
      INSERT INTO reading_history (user_id, item_type, item_id, title, cover_url, last_page, last_read_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET
        title = excluded.title,
        cover_url = excluded.cover_url,
        last_page = excluded.last_page,
        last_read_at = datetime('now')
    `).run(req.user.id, item_type, item_id, title, cover_url || null, last_page || 1)

    res.json({ success: true })
  } catch (error) {
    console.error('Save reading history error:', error)
    res.status(500).json({ error: 'Failed to save reading history' })
  }
})

// Get reading progress for a specific item
app.get('/api/reading-history/:type/:id', (req, res) => {
  try {
    if (!req.user) {
      return res.json({ last_page: 1 })
    }

    const history = db.prepare(`
      SELECT last_page FROM reading_history
      WHERE user_id = ? AND item_type = ? AND item_id = ?
    `).get(req.user.id, req.params.type, req.params.id)

    res.json({ last_page: history?.last_page || 1 })
  } catch (error) {
    console.error('Get reading progress error:', error)
    res.status(500).json({ error: 'Failed to get reading progress' })
  }
})

// Delete from reading history
app.delete('/api/reading-history/:type/:id', requireAuth, (req, res) => {
  try {
    db.prepare(`
      DELETE FROM reading_history
      WHERE user_id = ? AND item_type = ? AND item_id = ?
    `).run(req.user.id, req.params.type, req.params.id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete reading history error:', error)
    res.status(500).json({ error: 'Failed to delete from reading history' })
  }
})

// ==================== ADMIN API ====================

// Admin: Import from folder path
let adminImportProgress = { running: false, type: '', current: 0, total: 0, currentItem: '', errors: [] }

app.post('/api/admin/import', requireAdmin, async (req, res) => {
  const { type, folderPath } = req.body

  if (!type || !folderPath) {
    return res.status(400).json({ error: 'Missing type or folderPath' })
  }

  if (!['magazine', 'ebook'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be magazine or ebook' })
  }

  if (adminImportProgress.running) {
    return res.status(409).json({ error: 'Import already in progress' })
  }

  // Check if folder exists
  if (!existsSync(folderPath)) {
    return res.status(400).json({ error: 'Folder path does not exist' })
  }

  adminImportProgress = { running: true, type, current: 0, total: 0, currentItem: '', errors: [] }

  res.json({ message: `Starting ${type} import from ${folderPath}` })

  // Process in background
  ;(async () => {
    try {
      if (type === 'magazine') {
        await adminImportMagazines(folderPath)
      } else {
        await adminImportEbooks(folderPath)
      }
    } catch (err) {
      console.error('Admin import error:', err)
      adminImportProgress.errors.push(err.message)
    } finally {
      adminImportProgress.running = false
    }
  })()
})

// Admin import progress
app.get('/api/admin/import/progress', requireAdmin, (req, res) => {
  res.json(adminImportProgress)
})

// Admin: Import magazines from folder
async function adminImportMagazines(folderPath) {
  const results = { imported: 0, skipped: 0, errors: [] }

  // Find all PDFs recursively
  const pdfFiles = []
  async function findPdfs(dir) {
    const items = await readdir(dir)
    for (const item of items) {
      if (item.startsWith('.') || item.startsWith('._')) continue
      const fullPath = join(dir, item)
      const itemStat = await stat(fullPath)
      if (itemStat.isDirectory()) {
        await findPdfs(fullPath)
      } else if (item.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push(fullPath)
      }
    }
  }

  await findPdfs(folderPath)
  adminImportProgress.total = pdfFiles.length
  console.log(`[Admin Import] Found ${pdfFiles.length} PDF files`)

  // Get or create default publisher
  let defaultPublisher = db.prepare('SELECT * FROM publishers WHERE name = ?').get('Imported')
  if (!defaultPublisher) {
    const result = db.prepare('INSERT INTO publishers (name, description) VALUES (?, ?)').run('Imported', 'Manually imported magazines')
    defaultPublisher = { id: result.lastInsertRowid, name: 'Imported' }
  }

  const magazinesToPreprocess = []

  for (const pdfPath of pdfFiles) {
    adminImportProgress.current++
    adminImportProgress.currentItem = basename(pdfPath)

    // Check if already exists
    const existing = db.prepare('SELECT id FROM magazines WHERE file_path = ?').get(pdfPath)
    if (existing) {
      results.skipped++
      continue
    }

    try {
      const fileStat = await stat(pdfPath)
      if (fileStat.size < 10240) {
        results.skipped++
        continue
      }

      const title = basename(pdfPath, '.pdf')

      // Try to extract year from path or filename
      const yearMatch = pdfPath.match(/20\d{2}/)
      const year = yearMatch ? parseInt(yearMatch[0]) : null

      const result = db.prepare(`
        INSERT INTO magazines (publisher_id, title, file_path, file_size, year)
        VALUES (?, ?, ?, ?, ?)
      `).run(defaultPublisher.id, title, pdfPath, fileStat.size, year)

      magazinesToPreprocess.push(result.lastInsertRowid)
      results.imported++
      console.log(`[Admin Import] Imported: ${title}`)
    } catch (err) {
      results.errors.push(`${basename(pdfPath)}: ${err.message}`)
      adminImportProgress.errors.push(`${basename(pdfPath)}: ${err.message}`)
    }
  }

  console.log(`[Admin Import] Magazines import complete: ${results.imported} imported, ${results.skipped} skipped`)

  // Trigger cover generation and preprocessing
  if (magazinesToPreprocess.length > 0) {
    console.log(`[Admin Import] Starting preprocessing for ${magazinesToPreprocess.length} magazines`)
    adminImportProgress.currentItem = 'Preprocessing magazines...'

    for (const magazineId of magazinesToPreprocess) {
      try {
        await preprocessMagazine(magazineId)
      } catch (err) {
        console.error(`Failed to preprocess magazine ${magazineId}:`, err.message)
      }
    }
  }
}

// Admin: Import ebooks from folder
async function adminImportEbooks(folderPath) {
  const results = { imported: 0, skipped: 0, errors: [] }

  // Find all ebooks recursively
  const ebookFiles = []
  async function findEbooks(dir) {
    const items = await readdir(dir)
    for (const item of items) {
      if (item.startsWith('.') || item.startsWith('._')) continue
      const fullPath = join(dir, item)
      const itemStat = await stat(fullPath)
      if (itemStat.isDirectory()) {
        await findEbooks(fullPath)
      } else {
        const lower = item.toLowerCase()
        if (lower.endsWith('.epub') || lower.endsWith('.pdf')) {
          ebookFiles.push(fullPath)
        }
      }
    }
  }

  await findEbooks(folderPath)
  adminImportProgress.total = ebookFiles.length
  console.log(`[Admin Import] Found ${ebookFiles.length} ebook files`)

  // Get or create default category
  let defaultCategory = db.prepare('SELECT * FROM ebook_categories WHERE name = ?').get('Imported')
  if (!defaultCategory) {
    const result = db.prepare('INSERT INTO ebook_categories (name, description) VALUES (?, ?)').run('Imported', 'Manually imported ebooks')
    defaultCategory = { id: result.lastInsertRowid, name: 'Imported' }
  }

  for (const ebookPath of ebookFiles) {
    adminImportProgress.current++
    adminImportProgress.currentItem = basename(ebookPath)

    // Check if already exists
    const existing = db.prepare('SELECT id FROM ebooks WHERE file_path = ?').get(ebookPath)
    if (existing) {
      results.skipped++
      continue
    }

    try {
      const fileStat = await stat(ebookPath)
      const title = basename(ebookPath).replace(/\.(epub|pdf)$/i, '')
      const fileType = ebookPath.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf'

      db.prepare(`
        INSERT INTO ebooks (category_id, title, file_path, file_size, file_type)
        VALUES (?, ?, ?, ?, ?)
      `).run(defaultCategory.id, title, ebookPath, fileStat.size, fileType)

      results.imported++
      console.log(`[Admin Import] Imported: ${title}`)
    } catch (err) {
      results.errors.push(`${basename(ebookPath)}: ${err.message}`)
      adminImportProgress.errors.push(`${basename(ebookPath)}: ${err.message}`)
    }
  }

  console.log(`[Admin Import] Ebooks import complete: ${results.imported} imported, ${results.skipped} skipped`)
}

// Admin: Browse folders
app.get('/api/admin/browse', requireAdmin, async (req, res) => {
  try {
    const requestedPath = req.query.path || '/Volumes'

    // Security: only allow browsing /Volumes
    if (!requestedPath.startsWith('/Volumes')) {
      return res.status(403).json({ error: 'Access denied. Can only browse /Volumes' })
    }

    if (!existsSync(requestedPath)) {
      return res.status(404).json({ error: 'Path does not exist' })
    }

    const pathStat = await stat(requestedPath)
    if (!pathStat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    const items = await readdir(requestedPath)
    const folders = []

    for (const item of items) {
      if (item.startsWith('.')) continue
      const fullPath = join(requestedPath, item)
      try {
        const itemStat = await stat(fullPath)
        if (itemStat.isDirectory()) {
          folders.push({ name: item, path: fullPath })
        }
      } catch (err) {
        // Skip inaccessible items
      }
    }

    // Sort folders alphabetically
    folders.sort((a, b) => a.name.localeCompare(b.name))

    res.json({
      currentPath: requestedPath,
      parentPath: requestedPath === '/Volumes' ? null : dirname(requestedPath),
      folders
    })
  } catch (error) {
    console.error('Browse folders error:', error)
    res.status(500).json({ error: 'Failed to browse folders' })
  }
})

// Admin: Get stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const magazineCount = db.prepare('SELECT COUNT(*) as count FROM magazines').get().count
    const magazinePreprocessed = db.prepare('SELECT COUNT(*) as count FROM magazines WHERE preprocessed = 1').get().count
    const ebookCount = db.prepare('SELECT COUNT(*) as count FROM ebooks').get().count
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count

    res.json({
      magazines: { total: magazineCount, preprocessed: magazinePreprocessed },
      ebooks: ebookCount,
      users: userCount
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

// Admin: Get user list
app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, is_admin, created_at
      FROM users
      ORDER BY created_at DESC
    `).all()
    res.json(users)
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
})

// Audio API endpoints
const AUDIO_ROOT_PATHS = [
  '/Volumes/三星移动硬盘/07-高晓松',
  '/Volumes/三星移动硬盘/16 【音频】晓得 每周一更新',
  '/Volumes/Elements SE/音乐'
]

// Get all audio series with audio count
app.get('/api/audio-series', (req, res) => {
  try {
    const series = db.prepare(`
      SELECT s.*, COUNT(a.id) as audio_count
      FROM audio_series s
      LEFT JOIN audio_files a ON s.id = a.series_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all()
    res.json(series)
  } catch (error) {
    console.error('Audio series error:', error)
    res.status(500).json({ error: 'Failed to get audio series' })
  }
})

// Get audio files for a series
app.get('/api/audio', (req, res) => {
  try {
    const { series_id, search } = req.query
    let sql = 'SELECT * FROM audio_files WHERE 1=1'
    const params = []

    if (series_id) {
      sql += ' AND series_id = ?'
      params.push(parseInt(series_id))
    }
    if (search) {
      sql += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY title ASC'
    const audioFiles = db.prepare(sql).all(...params)
    res.json(audioFiles)
  } catch (error) {
    console.error('Audio files error:', error)
    res.status(500).json({ error: 'Failed to get audio files' })
  }
})

// Stream audio file
app.get('/api/audio/:id/stream', async (req, res) => {
  try {
    const audio = db.prepare('SELECT * FROM audio_files WHERE id = ?').get(req.params.id)
    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' })
    }

    const filePath = audio.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    // Determine content type based on file extension
    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg'
    }
    const contentType = contentTypes[ext] || 'audio/mpeg'

    if (range) {
      // Handle range request for audio seeking
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Audio stream error:', error)
    res.status(500).json({ error: 'Failed to stream audio' })
  }
})

// Background audio scan function
async function scanAudioFolders() {
  console.log('[Audio Scan] Starting scan...')
  const audioExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg']
  let seriesCount = 0
  let audioCount = 0
  const seenFiles = new Set()

  for (const rootPath of AUDIO_ROOT_PATHS) {
    if (!existsSync(rootPath)) {
      console.log('[Audio Scan] Folder not found:', rootPath)
      continue
    }

    console.log('[Audio Scan] Scanning', rootPath)

    // Scan for audio folders (series) - look for directories containing audio files
    const scanDirectory = async (dirPath, seriesName = null) => {
      try {
        const items = await readdir(dirPath)
        let hasAudioFiles = false
        let audioFilesInDir = []

        for (const item of items) {
          if (item.startsWith('.') || item.startsWith('._')) continue
          const itemPath = join(dirPath, item)
          const itemStat = await stat(itemPath)

          if (itemStat.isDirectory()) {
            // Recursively scan subdirectories with their own series name
            await scanDirectory(itemPath, item)
          } else if (audioExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
            hasAudioFiles = true
            audioFilesInDir.push({ name: item, path: itemPath, size: itemStat.size })
          }
        }

        // If this directory has audio files, treat it as a series
        if (hasAudioFiles && audioFilesInDir.length > 0) {
          const effectiveSeriesName = seriesName || basename(dirPath)

          // Check if series already exists
          let existingSeries = db.prepare('SELECT id FROM audio_series WHERE folder_path = ?').get(dirPath)
          let seriesId

          if (existingSeries) {
            seriesId = existingSeries.id
          } else {
            // Create new series
            const result = db.prepare(`
              INSERT INTO audio_series (name, folder_path) VALUES (?, ?)
            `).run(effectiveSeriesName, dirPath)
            seriesId = result.lastInsertRowid
            seriesCount++
          }

          // Add audio files
          for (const audioFile of audioFilesInDir) {
            // De-dup by file path
            if (seenFiles.has(audioFile.path)) continue
            seenFiles.add(audioFile.path)

            // Check if audio file already exists
            const existingAudio = db.prepare('SELECT id FROM audio_files WHERE file_path = ?').get(audioFile.path)
            if (!existingAudio) {
              const ext = extname(audioFile.name).toLowerCase().slice(1)
              // Clean up title - remove extension and common prefixes
              let title = audioFile.name.replace(/\.[^.]+$/, '')

              db.prepare(`
                INSERT INTO audio_files (series_id, title, file_path, file_size, file_type)
                VALUES (?, ?, ?, ?, ?)
              `).run(seriesId, title, audioFile.path, audioFile.size, ext)
              audioCount++
            }
          }
        }
      } catch (err) {
        console.error('[Audio Scan] Error scanning directory:', dirPath, err.message)
      }
    }

    await scanDirectory(rootPath)
  }

  console.log(`[Audio Scan] Completed: ${seriesCount} new series, ${audioCount} new audio files`)
  return { series: seriesCount, audio: audioCount }
}

// API endpoint to manually trigger audio scan
app.post('/api/audio/scan', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await scanAudioFolders()
    res.json({ message: 'Scan completed', ...result })
  } catch (error) {
    console.error('Audio scan error:', error)
    res.status(500).json({ error: 'Failed to scan audio folders' })
  }
})

// Get audio stats
app.get('/api/audio/stats', (req, res) => {
  try {
    const seriesCount = db.prepare('SELECT COUNT(*) as count FROM audio_series').get().count
    const audioCount = db.prepare('SELECT COUNT(*) as count FROM audio_files').get().count
    res.json({ series: seriesCount, audio: audioCount })
  } catch (error) {
    console.error('Audio stats error:', error)
    res.status(500).json({ error: 'Failed to get audio stats' })
  }
})

// Lectures API endpoints
const LECTURES_ROOT_PATHS = [
  '/Volumes/三星移动硬盘/公开课',
  '/Volumes/Elements SE/公开课'
]

// Get all lecture series with video count
app.get('/api/lecture-series', (req, res) => {
  try {
    const series = db.prepare(`
      SELECT s.*, COUNT(v.id) as video_count
      FROM lecture_series s
      LEFT JOIN lecture_videos v ON s.id = v.series_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all()
    res.json(series)
  } catch (error) {
    console.error('Lecture series error:', error)
    res.status(500).json({ error: 'Failed to get lecture series' })
  }
})

// Get lecture videos for a series
app.get('/api/lectures', (req, res) => {
  try {
    const { series_id, search } = req.query
    let sql = 'SELECT * FROM lecture_videos WHERE 1=1'
    const params = []

    if (series_id) {
      sql += ' AND series_id = ?'
      params.push(parseInt(series_id))
    }
    if (search) {
      sql += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY title ASC'
    const videos = db.prepare(sql).all(...params)
    res.json(videos)
  } catch (error) {
    console.error('Lecture videos error:', error)
    res.status(500).json({ error: 'Failed to get lecture videos' })
  }
})

// Stream lecture video
app.get('/api/lectures/:id/stream', async (req, res) => {
  try {
    const video = db.prepare('SELECT * FROM lecture_videos WHERE id = ?').get(req.params.id)
    if (!video) {
      return res.status(404).json({ error: 'Lecture not found' })
    }

    const filePath = video.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Lecture stream error:', error)
    res.status(500).json({ error: 'Failed to stream lecture' })
  }
})

// Scan lectures folders
async function scanLecturesFolder() {
  console.log('[Lectures Scan] Starting scan...')
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm']
  let seriesCount = 0
  let videoCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (dirPath, seriesName = null) => {
    try {
      const items = await readdir(dirPath)
      let hasVideoFiles = false
      let videoFilesInDir = []

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._') || item.endsWith('.lnk')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          await scanDirectory(itemPath, item)
        } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          hasVideoFiles = true
          videoFilesInDir.push({ name: item, path: itemPath, size: itemStat.size })
        }
      }

      if (hasVideoFiles && videoFilesInDir.length > 0) {
        const effectiveSeriesName = seriesName || basename(dirPath)

        let existingSeries = db.prepare('SELECT id FROM lecture_series WHERE folder_path = ?').get(dirPath)
        let seriesId

        if (existingSeries) {
          seriesId = existingSeries.id
        } else {
          const result = db.prepare(`
            INSERT INTO lecture_series (name, folder_path) VALUES (?, ?)
          `).run(effectiveSeriesName, dirPath)
          seriesId = result.lastInsertRowid
          seriesCount++
        }

        for (const videoFile of videoFilesInDir) {
          if (seenFiles.has(videoFile.path)) continue
          seenFiles.add(videoFile.path)

          const existingVideo = db.prepare('SELECT id FROM lecture_videos WHERE file_path = ?').get(videoFile.path)
          if (!existingVideo) {
            const ext = extname(videoFile.name).toLowerCase().slice(1)
            let title = videoFile.name.replace(/\.[^.]+$/, '')

            db.prepare(`
              INSERT INTO lecture_videos (series_id, title, file_path, file_size, file_type)
              VALUES (?, ?, ?, ?, ?)
            `).run(seriesId, title, videoFile.path, videoFile.size, ext)
            videoCount++
          }
        }
      }
    } catch (err) {
      console.error('[Lectures Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  for (const rootPath of LECTURES_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      console.log('[Lectures Scan] Scanning:', rootPath)
      await scanDirectory(rootPath)
    } else {
      console.log('[Lectures Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[Lectures Scan] Completed: ${seriesCount} new series, ${videoCount} new videos`)
  return { series: seriesCount, videos: videoCount }
}

// Speeches API endpoints
const SPEECHES_ROOT_PATH = '/Volumes/三星移动硬盘/演讲'

// Get all speech series with video count
app.get('/api/speech-series', (req, res) => {
  try {
    const series = db.prepare(`
      SELECT s.*, COUNT(v.id) as video_count
      FROM speech_series s
      LEFT JOIN speech_videos v ON s.id = v.series_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all()
    res.json(series)
  } catch (error) {
    console.error('Speech series error:', error)
    res.status(500).json({ error: 'Failed to get speech series' })
  }
})

// Get speech videos for a series
app.get('/api/speeches', (req, res) => {
  try {
    const { series_id, search } = req.query
    let sql = 'SELECT * FROM speech_videos WHERE 1=1'
    const params = []

    if (series_id) {
      sql += ' AND series_id = ?'
      params.push(parseInt(series_id))
    }
    if (search) {
      sql += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY title ASC'
    const videos = db.prepare(sql).all(...params)
    res.json(videos)
  } catch (error) {
    console.error('Speech videos error:', error)
    res.status(500).json({ error: 'Failed to get speech videos' })
  }
})

// Stream speech video
app.get('/api/speeches/:id/stream', async (req, res) => {
  try {
    const video = db.prepare('SELECT * FROM speech_videos WHERE id = ?').get(req.params.id)
    if (!video) {
      return res.status(404).json({ error: 'Speech not found' })
    }

    const filePath = video.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Speech stream error:', error)
    res.status(500).json({ error: 'Failed to stream speech' })
  }
})

// Scan speeches folder
async function scanSpeechesFolder() {
  console.log('[Speeches Scan] Starting scan...')
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm']
  let seriesCount = 0
  let videoCount = 0
  const seenFiles = new Set()

  if (!existsSync(SPEECHES_ROOT_PATH)) {
    console.log('[Speeches Scan] Folder not found:', SPEECHES_ROOT_PATH)
    return { series: 0, videos: 0 }
  }

  const scanDirectory = async (dirPath, seriesName = null) => {
    try {
      const items = await readdir(dirPath)
      let hasVideoFiles = false
      let videoFilesInDir = []

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._') || item.endsWith('.lnk')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          await scanDirectory(itemPath, item)
        } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          hasVideoFiles = true
          videoFilesInDir.push({ name: item, path: itemPath, size: itemStat.size })
        }
      }

      if (hasVideoFiles && videoFilesInDir.length > 0) {
        const effectiveSeriesName = seriesName || basename(dirPath)

        let existingSeries = db.prepare('SELECT id FROM speech_series WHERE folder_path = ?').get(dirPath)
        let seriesId

        if (existingSeries) {
          seriesId = existingSeries.id
        } else {
          const result = db.prepare(`
            INSERT INTO speech_series (name, folder_path) VALUES (?, ?)
          `).run(effectiveSeriesName, dirPath)
          seriesId = result.lastInsertRowid
          seriesCount++
        }

        for (const videoFile of videoFilesInDir) {
          if (seenFiles.has(videoFile.path)) continue
          seenFiles.add(videoFile.path)

          const existingVideo = db.prepare('SELECT id FROM speech_videos WHERE file_path = ?').get(videoFile.path)
          if (!existingVideo) {
            const ext = extname(videoFile.name).toLowerCase().slice(1)
            let title = videoFile.name.replace(/\.[^.]+$/, '')

            db.prepare(`
              INSERT INTO speech_videos (series_id, title, file_path, file_size, file_type)
              VALUES (?, ?, ?, ?, ?)
            `).run(seriesId, title, videoFile.path, videoFile.size, ext)
            videoCount++
          }
        }
      }
    } catch (err) {
      console.error('[Speeches Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  await scanDirectory(SPEECHES_ROOT_PATH)
  console.log(`[Speeches Scan] Completed: ${seriesCount} new series, ${videoCount} new videos`)
  return { series: seriesCount, videos: videoCount }
}

// Movies API endpoints
const MOVIES_ROOT_PATHS = [
  '/Volumes/CN/大陆电影',
  '/Volumes/美剧/美国电影',
  '/Volumes/Elements SE/电影'
]

// Get all movies
app.get('/api/movies', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM movies WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY title ASC'
    const movies = db.prepare(sql).all(...params)
    res.json(movies)
  } catch (error) {
    console.error('Movies error:', error)
    res.status(500).json({ error: 'Failed to get movies' })
  }
})

// Stream movie
app.get('/api/movies/:id/stream', async (req, res) => {
  try {
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    const filePath = movie.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Movie file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm',
      '.iso': 'application/octet-stream'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Movie stream error:', error)
    res.status(500).json({ error: 'Failed to stream movie' })
  }
})

// Scan movies folders
async function scanMoviesFolder() {
  console.log('[Movies Scan] Starting scan...')
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm', '.iso']
  let movieCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (dirPath) => {
    try {
      const items = await readdir(dirPath)

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          await scanDirectory(itemPath)
        } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          if (seenFiles.has(itemPath)) continue
          seenFiles.add(itemPath)

          const existingMovie = db.prepare('SELECT id FROM movies WHERE file_path = ?').get(itemPath)
          if (!existingMovie) {
            const ext = extname(item).toLowerCase().slice(1)
            // Clean up title - remove extension and common tags
            let title = item.replace(/\.[^.]+$/, '')
            // Try to extract year from filename
            const yearMatch = title.match(/\b(19|20)\d{2}\b/)
            const year = yearMatch ? parseInt(yearMatch[0]) : null

            db.prepare(`
              INSERT INTO movies (title, file_path, file_size, file_type, year)
              VALUES (?, ?, ?, ?, ?)
            `).run(title, itemPath, itemStat.size, ext, year)
            movieCount++
          }
        }
      }
    } catch (err) {
      console.error('[Movies Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  for (const rootPath of MOVIES_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      console.log('[Movies Scan] Scanning:', rootPath)
      await scanDirectory(rootPath)
    } else {
      console.log('[Movies Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[Movies Scan] Completed: ${movieCount} new movies`)
  return { movies: movieCount }
}

// TV Shows API endpoints
const TVSHOWS_ROOT_PATHS = [
  '/Volumes/美剧/SexEducationSeason1',
  '/Volumes/美剧/SexEducationSeason2',
  '/Volumes/美剧/SexEducationSeason3',
  '/Volumes/美剧/SexEducationSeason4',
  '/Volumes/美剧/猫和老鼠 4K修复',
  '/Volumes/美剧/美剧',
  '/Volumes/Elements SE/电视剧'
]

// Get all TV show series
app.get('/api/tvshows/series', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM tvshow_series WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY name ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('TV Shows series error:', error)
    res.status(500).json({ error: 'Failed to get TV show series' })
  }
})

// Get episodes for a series
app.get('/api/tvshows/series/:seriesId/episodes', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT e.*, s.name as series_name
      FROM tvshow_episodes e
      JOIN tvshow_series s ON e.series_id = s.id
      WHERE e.series_id = ?
      ORDER BY e.season ASC, e.episode ASC, e.title ASC
    `).all(req.params.seriesId)
    res.json(episodes)
  } catch (error) {
    console.error('TV Show episodes error:', error)
    res.status(500).json({ error: 'Failed to get TV show episodes' })
  }
})

// Stream TV show episode
app.get('/api/tvshows/episodes/:id/stream', async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM tvshow_episodes WHERE id = ?').get(req.params.id)
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    const filePath = episode.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Episode file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('TV Show episode stream error:', error)
    res.status(500).json({ error: 'Failed to stream episode' })
  }
})

// Scan TV shows folders
async function scanTVShowsFolder() {
  console.log('[TV Shows Scan] Starting scan...')
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm']
  let seriesCount = 0
  let episodeCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (rootPath, seriesName) => {
    // Get or create series
    let series = db.prepare('SELECT * FROM tvshow_series WHERE folder_path = ?').get(rootPath)
    if (!series) {
      db.prepare(`
        INSERT INTO tvshow_series (name, folder_path, episode_count)
        VALUES (?, ?, 0)
      `).run(seriesName, rootPath)
      series = db.prepare('SELECT * FROM tvshow_series WHERE folder_path = ?').get(rootPath)
      seriesCount++
    }

    const scanDir = async (dirPath) => {
      try {
        const items = await readdir(dirPath)

        for (const item of items) {
          if (item.startsWith('.') || item.startsWith('._')) continue
          const itemPath = join(dirPath, item)
          const itemStat = await stat(itemPath)

          if (itemStat.isDirectory()) {
            await scanDir(itemPath)
          } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
            if (seenFiles.has(itemPath)) continue
            seenFiles.add(itemPath)

            const existingEpisode = db.prepare('SELECT id FROM tvshow_episodes WHERE file_path = ?').get(itemPath)
            if (!existingEpisode) {
              const ext = extname(item).toLowerCase().slice(1)
              let title = item.replace(/\.[^.]+$/, '')

              // Try to extract season and episode numbers
              const seMatch = title.match(/S(\d+)E(\d+)/i)
              const season = seMatch ? parseInt(seMatch[1]) : null
              const episode = seMatch ? parseInt(seMatch[2]) : null

              db.prepare(`
                INSERT INTO tvshow_episodes (series_id, title, file_path, file_size, file_type, season, episode)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(series.id, title, itemPath, itemStat.size, ext, season, episode)
              episodeCount++
            }
          }
        }
      } catch (err) {
        console.error('[TV Shows Scan] Error scanning directory:', dirPath, err.message)
      }
    }

    await scanDir(rootPath)

    // Update episode count
    const count = db.prepare('SELECT COUNT(*) as count FROM tvshow_episodes WHERE series_id = ?').get(series.id)
    db.prepare('UPDATE tvshow_series SET episode_count = ? WHERE id = ?').run(count.count, series.id)
  }

  for (const rootPath of TVSHOWS_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      const seriesName = basename(rootPath)
      console.log('[TV Shows Scan] Scanning:', seriesName)
      await scanDirectory(rootPath, seriesName)
    } else {
      console.log('[TV Shows Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[TV Shows Scan] Completed: ${seriesCount} new series, ${episodeCount} new episodes`)
  return { series: seriesCount, episodes: episodeCount }
}

// Documentaries API endpoints
const DOCUMENTARIES_ROOT_PATHS = [
  '/Volumes/Elements SE/纪录片',
  '/Volumes/Elements SE/航拍中国 第一季 6集全 2017 国语 内嵌中字'
]

// Get all documentary series
app.get('/api/documentaries/series', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM documentary_series WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY name ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('Documentary series error:', error)
    res.status(500).json({ error: 'Failed to get documentary series' })
  }
})

// Get episodes for a documentary series
app.get('/api/documentaries/series/:seriesId/episodes', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT e.*, s.name as series_name
      FROM documentary_episodes e
      JOIN documentary_series s ON e.series_id = s.id
      WHERE e.series_id = ?
      ORDER BY e.title ASC
    `).all(req.params.seriesId)
    res.json(episodes)
  } catch (error) {
    console.error('Documentary episodes error:', error)
    res.status(500).json({ error: 'Failed to get documentary episodes' })
  }
})

// Stream documentary episode
app.get('/api/documentaries/episodes/:id/stream', async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM documentary_episodes WHERE id = ?').get(req.params.id)
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    const filePath = episode.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Episode file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Documentary episode stream error:', error)
    res.status(500).json({ error: 'Failed to stream episode' })
  }
})

// Scan documentaries folders
async function scanDocumentariesFolder() {
  console.log('[Documentaries Scan] Starting scan...')
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm']
  let seriesCount = 0
  let episodeCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (dirPath, seriesName = null) => {
    try {
      const items = await readdir(dirPath)
      let hasVideoFiles = false
      let videoFilesInDir = []

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._') || item.endsWith('.lnk') || item.endsWith('.pdf')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          await scanDirectory(itemPath, item)
        } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          hasVideoFiles = true
          videoFilesInDir.push({ name: item, path: itemPath, size: itemStat.size })
        }
      }

      if (hasVideoFiles && videoFilesInDir.length > 0) {
        const effectiveSeriesName = seriesName || basename(dirPath)

        let existingSeries = db.prepare('SELECT id FROM documentary_series WHERE folder_path = ?').get(dirPath)
        let seriesId

        if (existingSeries) {
          seriesId = existingSeries.id
        } else {
          const result = db.prepare(`
            INSERT INTO documentary_series (name, folder_path) VALUES (?, ?)
          `).run(effectiveSeriesName, dirPath)
          seriesId = result.lastInsertRowid
          seriesCount++
        }

        for (const videoFile of videoFilesInDir) {
          if (seenFiles.has(videoFile.path)) continue
          seenFiles.add(videoFile.path)

          const existingEpisode = db.prepare('SELECT id FROM documentary_episodes WHERE file_path = ?').get(videoFile.path)
          if (!existingEpisode) {
            const ext = extname(videoFile.name).toLowerCase().slice(1)
            let title = videoFile.name.replace(/\.[^.]+$/, '')

            db.prepare(`
              INSERT INTO documentary_episodes (series_id, title, file_path, file_size, file_type)
              VALUES (?, ?, ?, ?, ?)
            `).run(seriesId, title, videoFile.path, videoFile.size, ext)
            episodeCount++
          }
        }

        // Update episode count
        const count = db.prepare('SELECT COUNT(*) as count FROM documentary_episodes WHERE series_id = ?').get(seriesId)
        db.prepare('UPDATE documentary_series SET episode_count = ? WHERE id = ?').run(count.count, seriesId)
      }
    } catch (err) {
      console.error('[Documentaries Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  for (const rootPath of DOCUMENTARIES_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      console.log('[Documentaries Scan] Scanning:', rootPath)
      await scanDirectory(rootPath)
    } else {
      console.log('[Documentaries Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[Documentaries Scan] Completed: ${seriesCount} new series, ${episodeCount} new episodes`)
  return { series: seriesCount, episodes: episodeCount }
}

// Animation API endpoints
const ANIMATION_ROOT_PATHS = [
  '/Volumes/Elements SE/动画片'
]

// Get all animation series
app.get('/api/animation/series', (req, res) => {
  try {
    const { search } = req.query
    let sql = 'SELECT * FROM animation_series WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY name ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('Animation series error:', error)
    res.status(500).json({ error: 'Failed to get animation series' })
  }
})

// Get episodes for an animation series
app.get('/api/animation/series/:seriesId/episodes', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT e.*, s.name as series_name
      FROM animation_episodes e
      JOIN animation_series s ON e.series_id = s.id
      WHERE e.series_id = ?
      ORDER BY e.title ASC
    `).all(req.params.seriesId)
    res.json(episodes)
  } catch (error) {
    console.error('Animation episodes error:', error)
    res.status(500).json({ error: 'Failed to get animation episodes' })
  }
})

// Stream animation episode
app.get('/api/animation/episodes/:id/stream', async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM animation_episodes WHERE id = ?').get(req.params.id)
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    const filePath = episode.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Episode file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Animation episode stream error:', error)
    res.status(500).json({ error: 'Failed to stream episode' })
  }
})

// Scan animation folders
async function scanAnimationFolder() {
  console.log('[Animation Scan] Starting scan...')
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts', '.webm']
  let seriesCount = 0
  let episodeCount = 0
  const seenFiles = new Set()

  const scanDirectory = async (dirPath, seriesName = null) => {
    try {
      const items = await readdir(dirPath)
      let hasVideoFiles = false
      let videoFilesInDir = []

      for (const item of items) {
        if (item.startsWith('.') || item.startsWith('._') || item.endsWith('.lnk')) continue
        const itemPath = join(dirPath, item)
        const itemStat = await stat(itemPath)

        if (itemStat.isDirectory()) {
          await scanDirectory(itemPath, item)
        } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
          hasVideoFiles = true
          videoFilesInDir.push({ name: item, path: itemPath, size: itemStat.size })
        }
      }

      if (hasVideoFiles && videoFilesInDir.length > 0) {
        const effectiveSeriesName = seriesName || basename(dirPath)

        let existingSeries = db.prepare('SELECT id FROM animation_series WHERE folder_path = ?').get(dirPath)
        let seriesId

        if (existingSeries) {
          seriesId = existingSeries.id
        } else {
          const result = db.prepare(`
            INSERT INTO animation_series (name, folder_path) VALUES (?, ?)
          `).run(effectiveSeriesName, dirPath)
          seriesId = result.lastInsertRowid
          seriesCount++
        }

        for (const videoFile of videoFilesInDir) {
          if (seenFiles.has(videoFile.path)) continue
          seenFiles.add(videoFile.path)

          const existingEpisode = db.prepare('SELECT id FROM animation_episodes WHERE file_path = ?').get(videoFile.path)
          if (!existingEpisode) {
            const ext = extname(videoFile.name).toLowerCase().slice(1)
            let title = videoFile.name.replace(/\.[^.]+$/, '')

            db.prepare(`
              INSERT INTO animation_episodes (series_id, title, file_path, file_size, file_type)
              VALUES (?, ?, ?, ?, ?)
            `).run(seriesId, title, videoFile.path, videoFile.size, ext)
            episodeCount++
          }
        }

        // Update episode count
        const count = db.prepare('SELECT COUNT(*) as count FROM animation_episodes WHERE series_id = ?').get(seriesId)
        db.prepare('UPDATE animation_series SET episode_count = ? WHERE id = ?').run(count.count, seriesId)
      }
    } catch (err) {
      console.error('[Animation Scan] Error scanning directory:', dirPath, err.message)
    }
  }

  for (const rootPath of ANIMATION_ROOT_PATHS) {
    if (existsSync(rootPath)) {
      console.log('[Animation Scan] Scanning:', rootPath)
      await scanDirectory(rootPath)
    } else {
      console.log('[Animation Scan] Folder not found:', rootPath)
    }
  }

  console.log(`[Animation Scan] Completed: ${seriesCount} new series, ${episodeCount} new episodes`)
  return { series: seriesCount, episodes: episodeCount }
}

// NBA Finals API endpoints
const NBA_ROOT_PATH = '/Volumes/杂志/nba总决赛'

// Get all NBA series with optional category and year filter
app.get('/api/nba/series', (req, res) => {
  try {
    const { category, year } = req.query
    let sql = 'SELECT * FROM nba_series WHERE 1=1'
    const params = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    if (year) {
      sql += ' AND year = ?'
      params.push(parseInt(year))
    }

    sql += ' ORDER BY year DESC, title ASC'
    const series = db.prepare(sql).all(...params)
    res.json(series)
  } catch (error) {
    console.error('NBA series error:', error)
    res.status(500).json({ error: 'Failed to get NBA series' })
  }
})

// Get available NBA categories and years
app.get('/api/nba/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category FROM nba_series WHERE category IS NOT NULL ORDER BY category
    `).all().map(r => r.category)

    const years = db.prepare(`
      SELECT DISTINCT year FROM nba_series ORDER BY year DESC
    `).all().map(r => r.year)

    res.json({ categories, years })
  } catch (error) {
    console.error('NBA categories error:', error)
    res.status(500).json({ error: 'Failed to get NBA categories' })
  }
})

// Get games for a specific series
app.get('/api/nba/series/:id/games', (req, res) => {
  try {
    const games = db.prepare(`
      SELECT * FROM nba_games WHERE series_id = ? ORDER BY game_number ASC, title ASC
    `).all(req.params.id)
    res.json(games)
  } catch (error) {
    console.error('NBA games error:', error)
    res.status(500).json({ error: 'Failed to get NBA games' })
  }
})

// Stream video file
app.get('/api/nba/games/:id/stream', async (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM nba_games WHERE id = ?').get(req.params.id)
    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }

    const filePath = game.file_path
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' })
    }

    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const range = req.headers.range

    // Determine content type based on file extension
    const ext = extname(filePath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.ts': 'video/mp2t',
      '.webm': 'video/webm'
    }
    const contentType = contentTypes[ext] || 'video/mp4'

    if (range) {
      // Handle range request for video seeking
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })

      const stream = createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('Video stream error:', error)
    res.status(500).json({ error: 'Failed to stream video' })
  }
})

// Background NBA scan function - scans folder and adds to database
async function scanNBAFolder() {
  if (!existsSync(NBA_ROOT_PATH)) {
    console.log('[NBA Scan] Folder not found:', NBA_ROOT_PATH)
    return { series: 0, games: 0 }
  }

  console.log('[NBA Scan] Starting scan of', NBA_ROOT_PATH)
  const folders = await readdir(NBA_ROOT_PATH)
  let seriesCount = 0
  let gamesCount = 0

  for (const folderName of folders) {
    const folderPath = join(NBA_ROOT_PATH, folderName)
    const folderStat = await stat(folderPath)

    if (!folderStat.isDirectory() || folderName.startsWith('.')) continue

    // Extract year from folder name (e.g., "2020总决赛 湖人VS热火中文版" -> 2020)
    const yearMatch = folderName.match(/^(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1]) : null
    if (!year) continue

    // Detect category (chinese/english) from folder name
    const lowerName = folderName.toLowerCase()
    const isEnglish = lowerName.includes('英文') || lowerName.includes('英语') ||
                      lowerName.includes('english') || lowerName.includes('-abc') ||
                      lowerName.includes('hdtv') || lowerName.includes('remux') ||
                      (lowerName.includes('720p') && !lowerName.includes('中文')) ||
                      (lowerName.includes('1080') && !lowerName.includes('央视') && !lowerName.includes('cctv'))
    const category = isEnglish ? 'english' : 'chinese'

    // Detect source from folder name
    let source = null
    if (lowerName.includes('cctv') || lowerName.includes('央视')) {
      source = 'CCTV'
    } else if (lowerName.includes('abc')) {
      source = 'ABC'
    } else if (lowerName.includes('纬来')) {
      source = '纬来'
    } else if (lowerName.includes('百事通')) {
      source = '百事通'
    }

    // Check if series already exists
    const existingSeries = db.prepare('SELECT id FROM nba_series WHERE folder_path = ?').get(folderPath)
    let seriesId

    if (existingSeries) {
      seriesId = existingSeries.id
      // Update category and source if not set
      db.prepare('UPDATE nba_series SET category = ?, source = ? WHERE id = ? AND (category IS NULL OR category = ?)').run(category, source, seriesId, 'chinese')
    } else {
      // Create new series
      const result = db.prepare(`
        INSERT INTO nba_series (year, title, folder_path, category, source) VALUES (?, ?, ?, ?, ?)
      `).run(year, folderName, folderPath, category, source)
      seriesId = result.lastInsertRowid
      seriesCount++
    }

    // Scan for video files recursively
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.ts', '.webm']
    const scanDir = async (dirPath) => {
      try {
        const items = await readdir(dirPath)
        for (const item of items) {
          if (item.startsWith('.')) continue
          const itemPath = join(dirPath, item)
          const itemStat = await stat(itemPath)

          if (itemStat.isDirectory()) {
            await scanDir(itemPath)
          } else if (videoExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
            // Check if game already exists
            const existingGame = db.prepare('SELECT id FROM nba_games WHERE file_path = ?').get(itemPath)
            if (!existingGame) {
              const ext = extname(item).toLowerCase().slice(1)
              // Try to extract game number from filename
              const gameMatch = item.match(/G(\d+)|Game\s*(\d+)|第(\d+)场/i)
              const gameNumber = gameMatch ? parseInt(gameMatch[1] || gameMatch[2] || gameMatch[3]) : null

              db.prepare(`
                INSERT INTO nba_games (series_id, game_number, title, file_path, file_type)
                VALUES (?, ?, ?, ?, ?)
              `).run(seriesId, gameNumber, item, itemPath, ext)
              gamesCount++
            }
          }
        }
      } catch (err) {
        console.error('[NBA Scan] Error scanning directory:', dirPath, err.message)
      }
    }

    await scanDir(folderPath)
  }

  console.log(`[NBA Scan] Completed: ${seriesCount} new series, ${gamesCount} new games`)
  return { series: seriesCount, games: gamesCount }
}

// API endpoint to manually trigger scan (optional, for admin)
app.post('/api/nba/scan', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await scanNBAFolder()
    res.json({ message: 'Scan completed', ...result })
  } catch (error) {
    console.error('NBA scan error:', error)
    res.status(500).json({ error: 'Failed to scan NBA folder' })
  }
})

// Get NBA stats
app.get('/api/nba/stats', (req, res) => {
  try {
    const seriesCount = db.prepare('SELECT COUNT(*) as count FROM nba_series').get().count
    const gamesCount = db.prepare('SELECT COUNT(*) as count FROM nba_games').get().count
    res.json({ series: seriesCount, games: gamesCount })
  } catch (error) {
    console.error('NBA stats error:', error)
    res.status(500).json({ error: 'Failed to get NBA stats' })
  }
})

// ==================================
// R2 Storage Migration API
// ==================================

// Get R2 storage status
app.get('/api/r2/status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    res.json({
      enabled: useR2Storage,
      bucket: r2BucketName,
      publicUrl: r2PublicUrl || null,
      s3Fallback: useS3Storage
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get R2 status' })
  }
})

// List objects in R2 bucket
app.get('/api/r2/objects', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { prefix = '', limit = 100 } = req.query
    const objects = await listStorageObjects(prefix, parseInt(limit))
    res.json({
      objects: objects.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified
      })),
      count: objects.length
    })
  } catch (error) {
    console.error('R2 list error:', error)
    res.status(500).json({ error: 'Failed to list R2 objects' })
  }
})

// Generic R2 streaming endpoint (with local fallback)
app.get('/api/r2/stream/:category/*', async (req, res) => {
  try {
    const { category } = req.params
    const filePath = req.params[0] // Everything after category
    const r2Key = `${category}/${filePath}`

    // Try R2 first
    if (storageClient) {
      try {
        const exists = await checkStorageObjectExists(r2Key)
        if (exists) {
          const result = await streamFromStorageWithRange(r2Key, req.headers.range)
          res.writeHead(result.statusCode, result.headers)
          result.stream.pipe(res)
          return
        }
      } catch (r2Error) {
        console.log(`[R2 Stream] R2 not available for ${r2Key}, trying local`)
      }
    }

    // Fallback to local file
    const basePaths = {
      magazines: process.env.MAGAZINES_FOLDER || '/Volumes/T9/杂志',
      ebooks: process.env.EBOOKS_FOLDER || '/Volumes/T9/电子书',
      audio: process.env.AUDIO_FOLDER || '/Volumes/T9/音频',
      lectures: '/Volumes/三星移动硬盘/公开课',
      speeches: '/Volumes/三星移动硬盘/演讲',
      movies: '/Volumes/CN/大陆电影',
      nba: process.env.NBA_FOLDER || '/Volumes/T9/NBA',
      tvshows: process.env.TVSHOWS_FOLDER || '/Volumes/美剧',
      animation: process.env.ANIMATION_FOLDER || '/Volumes/动画',
      documentaries: process.env.DOCUMENTARIES_FOLDER || '/Volumes/纪录片'
    }

    const basePath = basePaths[category]
    if (!basePath) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    const localPath = join(basePath, filePath)
    if (!existsSync(localPath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const fileStat = await stat(localPath)
    const fileSize = fileStat.size
    const ext = extname(localPath).toLowerCase()

    const contentTypes = {
      '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime', '.webm': 'video/webm', '.ts': 'video/mp2t',
      '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
      '.flac': 'audio/flac', '.aac': 'audio/aac', '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf', '.epub': 'application/epub+zip'
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    if (req.headers.range) {
      const parts = req.headers.range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      })
      createReadStream(localPath, { start, end }).pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      })
      createReadStream(localPath).pipe(res)
    }
  } catch (error) {
    console.error('R2 stream error:', error)
    res.status(500).json({ error: 'Failed to stream file' })
  }
})

// Upload a file to R2 (admin only)
app.post('/api/r2/upload', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { localPath, category, customKey } = req.body

    if (!localPath || !category) {
      return res.status(400).json({ error: 'localPath and category are required' })
    }

    if (!existsSync(localPath)) {
      return res.status(404).json({ error: 'Local file not found' })
    }

    const key = customKey || localPathToStorageKey(localPath, category)
    const ext = extname(localPath).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime', '.webm': 'video/webm', '.ts': 'video/mp2t',
      '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
      '.flac': 'audio/flac', '.pdf': 'application/pdf', '.epub': 'application/epub+zip'
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    const result = await uploadLargeFileToStorage(localPath, key, contentType)
    res.json({ success: true, key, result })
  } catch (error) {
    console.error('R2 upload error:', error)
    res.status(500).json({ error: 'Failed to upload to R2' })
  }
})

// Batch migration endpoint - migrate files from a category to R2
app.post('/api/r2/migrate', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { category, limit = 10, dryRun = true } = req.body

    if (!category) {
      return res.status(400).json({ error: 'category is required' })
    }

    // Get files from database based on category
    const tables = {
      audio: { table: 'audio_files', pathCol: 'file_path', keyCol: 'r2_key' },
      lectures: { table: 'lecture_videos', pathCol: 'file_path', keyCol: 'r2_key' },
      speeches: { table: 'speech_videos', pathCol: 'file_path', keyCol: 'r2_key' },
      movies: { table: 'movies', pathCol: 'file_path', keyCol: 'r2_key' },
      nba: { table: 'nba_games', pathCol: 'file_path', keyCol: 'r2_key' },
      magazines: { table: 'magazines', pathCol: 'file_path', keyCol: 's3_key' },
      tvshows: { table: 'tvshow_episodes', pathCol: 'file_path', keyCol: 'r2_key' },
      animation: { table: 'animation_episodes', pathCol: 'file_path', keyCol: 'r2_key' },
      documentaries: { table: 'documentary_episodes', pathCol: 'file_path', keyCol: 'r2_key' }
    }

    const config = tables[category]
    if (!config) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    // First, ensure the r2_key column exists
    try {
      db.exec(`ALTER TABLE ${config.table} ADD COLUMN r2_key TEXT`)
    } catch {
      // Column already exists
    }

    // Get files that haven't been migrated yet
    const files = db.prepare(`
      SELECT id, ${config.pathCol} as file_path
      FROM ${config.table}
      WHERE (${config.keyCol} IS NULL OR ${config.keyCol} = '')
      AND ${config.pathCol} IS NOT NULL
      LIMIT ?
    `).all(limit)

    if (dryRun) {
      return res.json({
        dryRun: true,
        category,
        filesToMigrate: files.length,
        files: files.map(f => ({
          id: f.id,
          localPath: f.file_path,
          r2Key: localPathToStorageKey(f.file_path, category)
        }))
      })
    }

    // Actually migrate files
    const results = []
    for (const file of files) {
      try {
        if (!existsSync(file.file_path)) {
          results.push({ id: file.id, status: 'skipped', reason: 'File not found' })
          continue
        }

        const key = localPathToStorageKey(file.file_path, category)
        const ext = extname(file.file_path).toLowerCase()
        const contentTypes = {
          '.mp4': 'video/mp4', '.mkv': 'video/x-matroska',
          '.mp3': 'audio/mpeg', '.pdf': 'application/pdf'
        }
        const contentType = contentTypes[ext] || 'application/octet-stream'

        await uploadLargeFileToStorage(file.file_path, key, contentType)

        // Update database with R2 key
        db.prepare(`UPDATE ${config.table} SET ${config.keyCol} = ? WHERE id = ?`).run(key, file.id)

        results.push({ id: file.id, status: 'success', key })
      } catch (err) {
        results.push({ id: file.id, status: 'error', error: err.message })
      }
    }

    res.json({
      category,
      migrated: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    })
  } catch (error) {
    console.error('R2 migration error:', error)
    res.status(500).json({ error: 'Failed to migrate to R2' })
  }
})

// Get migration progress for all categories
app.get('/api/r2/migration-status', authMiddleware, requireAdmin, (req, res) => {
  try {
    const categories = [
      { name: 'audio', table: 'audio_files', keyCol: 'r2_key' },
      { name: 'lectures', table: 'lecture_videos', keyCol: 'r2_key' },
      { name: 'speeches', table: 'speech_videos', keyCol: 'r2_key' },
      { name: 'movies', table: 'movies', keyCol: 'r2_key' },
      { name: 'nba', table: 'nba_games', keyCol: 'r2_key' },
      { name: 'magazines', table: 'magazines', keyCol: 's3_key' }
    ]

    const status = categories.map(cat => {
      try {
        const total = db.prepare(`SELECT COUNT(*) as count FROM ${cat.table}`).get().count
        let migrated = 0
        try {
          migrated = db.prepare(`SELECT COUNT(*) as count FROM ${cat.table} WHERE ${cat.keyCol} IS NOT NULL AND ${cat.keyCol} != ''`).get().count
        } catch {
          // Column might not exist yet
        }
        return {
          category: cat.name,
          total,
          migrated,
          remaining: total - migrated,
          progress: total > 0 ? Math.round((migrated / total) * 100) : 0
        }
      } catch {
        return { category: cat.name, error: 'Table not found' }
      }
    })

    res.json({ status, r2Enabled: useR2Storage })
  } catch (error) {
    console.error('Migration status error:', error)
    res.status(500).json({ error: 'Failed to get migration status' })
  }
})

// ============================================
// USER PROFILE & ANALYTICS API
// ============================================

// Get comprehensive user profile with analytics and predictions
app.get('/api/user/profile', authMiddleware, requireAuth, (req, res) => {
  try {
    const userId = req.user.id

    // Basic user info
    const userInfo = db.prepare(`
      SELECT id, username as email, is_admin, created_at
      FROM users WHERE id = ?
    `).get(userId)

    // Reading history stats
    const readingHistory = db.prepare(`
      SELECT item_type, COUNT(*) as count,
             MAX(last_read_at) as last_activity,
             AVG(last_page) as avg_progress
      FROM reading_history
      WHERE user_id = ?
      GROUP BY item_type
    `).all(userId)

    // Books stats
    const booksStats = db.prepare(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT author) as unique_authors,
             COUNT(DISTINCT categories) as unique_categories
      FROM books WHERE user_id = ?
    `).get(userId)

    // Get book categories distribution
    const bookCategories = db.prepare(`
      SELECT categories, COUNT(*) as count
      FROM books
      WHERE user_id = ? AND categories IS NOT NULL AND categories != ''
      GROUP BY categories
      ORDER BY count DESC
    `).all(userId)

    // Get favorite authors (by book count)
    const favoriteAuthors = db.prepare(`
      SELECT author, COUNT(*) as count
      FROM books
      WHERE user_id = ? AND author IS NOT NULL AND author != ''
      GROUP BY author
      ORDER BY count DESC
      LIMIT 10
    `).all(userId)

    // Blog posts / reading notes stats
    const notesStats = db.prepare(`
      SELECT COUNT(*) as total_posts,
             COUNT(DISTINCT book_id) as books_with_notes
      FROM blog_posts bp
      JOIN books b ON bp.book_id = b.id
      WHERE b.user_id = ?
    `).get(userId)

    // Underlines count from books
    const underlinesStats = db.prepare(`
      SELECT COUNT(*) as total
      FROM underlines u
      JOIN blog_posts bp ON u.post_id = bp.id
      JOIN books b ON bp.book_id = b.id
      WHERE b.user_id = ?
    `).get(userId)

    // Ideas count from books
    const ideasStats = db.prepare(`
      SELECT COUNT(*) as total
      FROM ideas i
      JOIN underlines u ON i.underline_id = u.id
      JOIN blog_posts bp ON u.post_id = bp.id
      JOIN books b ON bp.book_id = b.id
      WHERE b.user_id = ?
    `).get(userId)

    // Magazine underlines for this user
    const magazineUnderlinesStats = db.prepare(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT magazine_id) as magazines_count
      FROM magazine_underlines
      WHERE user_id = ?
    `).get(userId)

    // Magazine ideas for this user
    const magazineIdeasStats = db.prepare(`
      SELECT COUNT(*) as total
      FROM magazine_ideas
      WHERE user_id = ?
    `).get(userId)

    // Note underlines for this user
    const noteUnderlinesStats = db.prepare(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT note_id) as notes_count
      FROM note_underlines
      WHERE user_id = ?
    `).get(userId)

    // Note ideas for this user
    const noteIdeasStats = db.prepare(`
      SELECT COUNT(*) as total
      FROM note_ideas
      WHERE user_id = ?
    `).get(userId)

    // Reading activity over time (last 30 days)
    const readingActivity = db.prepare(`
      SELECT DATE(last_read_at) as date,
             COUNT(*) as sessions,
             item_type
      FROM reading_history
      WHERE user_id = ? AND last_read_at >= datetime('now', '-30 days')
      GROUP BY DATE(last_read_at), item_type
      ORDER BY date DESC
    `).all(userId)

    // Get recently read items
    const recentlyRead = db.prepare(`
      SELECT item_type, item_id, title, cover_url, last_page, last_read_at
      FROM reading_history
      WHERE user_id = ?
      ORDER BY last_read_at DESC
      LIMIT 10
    `).all(userId)

    // Get most underlined magazines
    const topMagazines = db.prepare(`
      SELECT m.id, m.title, p.name as publisher, COUNT(mu.id) as underline_count
      FROM magazine_underlines mu
      JOIN magazines m ON mu.magazine_id = m.id
      JOIN publishers p ON m.publisher_id = p.id
      WHERE mu.user_id = ?
      GROUP BY m.id
      ORDER BY underline_count DESC
      LIMIT 5
    `).all(userId)

    // Get publishers user engages with most
    const topPublishers = db.prepare(`
      SELECT p.name, COUNT(mu.id) as engagement_count
      FROM magazine_underlines mu
      JOIN magazines m ON mu.magazine_id = m.id
      JOIN publishers p ON m.publisher_id = p.id
      WHERE mu.user_id = ?
      GROUP BY p.id
      ORDER BY engagement_count DESC
      LIMIT 5
    `).all(userId)

    // Get ebook categories user reads most
    const topEbookCategories = db.prepare(`
      SELECT ec.name, COUNT(rh.id) as read_count
      FROM reading_history rh
      JOIN ebooks e ON rh.item_id = e.id
      JOIN ebook_categories ec ON e.category_id = ec.id
      WHERE rh.user_id = ? AND rh.item_type = 'ebook'
      GROUP BY ec.id
      ORDER BY read_count DESC
      LIMIT 5
    `).all(userId)

    // Calculate engagement score
    const totalBooks = booksStats?.total || 0
    const totalNotes = notesStats?.total_posts || 0
    const totalUnderlines = (underlinesStats?.total || 0) +
                           (magazineUnderlinesStats?.total || 0) +
                           (noteUnderlinesStats?.total || 0)
    const totalIdeas = (ideasStats?.total || 0) +
                      (magazineIdeasStats?.total || 0) +
                      (noteIdeasStats?.total || 0)

    const engagementScore = Math.min(100, Math.round(
      (totalBooks * 5) +
      (totalNotes * 3) +
      (totalUnderlines * 2) +
      (totalIdeas * 4)
    ))

    // Calculate reading streak
    const streakData = db.prepare(`
      SELECT DISTINCT DATE(last_read_at) as date
      FROM reading_history
      WHERE user_id = ?
      ORDER BY date DESC
    `).all(userId)

    let currentStreak = 0
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (streakData.length > 0) {
      const firstDate = streakData[0].date
      if (firstDate === today || firstDate === yesterday) {
        currentStreak = 1
        for (let i = 1; i < streakData.length; i++) {
          const prevDate = new Date(streakData[i - 1].date)
          const currDate = new Date(streakData[i].date)
          const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24)
          if (diffDays === 1) {
            currentStreak++
          } else {
            break
          }
        }
      }
    }

    // Generate predictions based on user behavior
    const predictions = generatePredictions({
      bookCategories,
      favoriteAuthors,
      topPublishers,
      topEbookCategories,
      readingHistory,
      totalUnderlines,
      totalIdeas,
      engagementScore
    })

    // Compile profile data
    const profile = {
      user: {
        id: userInfo.id,
        email: userInfo.email,
        isAdmin: !!userInfo.is_admin,
        memberSince: userInfo.created_at
      },
      stats: {
        totalBooks,
        uniqueAuthors: booksStats?.unique_authors || 0,
        totalNotes,
        booksWithNotes: notesStats?.books_with_notes || 0,
        totalUnderlines,
        totalIdeas,
        magazinesEngaged: magazineUnderlinesStats?.magazines_count || 0,
        notesEngaged: noteUnderlinesStats?.notes_count || 0,
        engagementScore,
        currentStreak
      },
      readingByType: readingHistory.reduce((acc, item) => {
        acc[item.item_type] = {
          count: item.count,
          lastActivity: item.last_activity,
          avgProgress: Math.round(item.avg_progress || 0)
        }
        return acc
      }, {}),
      interests: {
        categories: bookCategories.slice(0, 10),
        authors: favoriteAuthors,
        publishers: topPublishers,
        ebookCategories: topEbookCategories
      },
      activity: {
        recentlyRead,
        dailyActivity: readingActivity,
        topMagazines
      },
      predictions
    }

    res.json(profile)
  } catch (error) {
    console.error('Get user profile error:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// Helper function to generate predictions
function generatePredictions(data) {
  const predictions = {
    readingStyle: 'balanced',
    strengths: [],
    areasToExplore: [],
    personalityTraits: [],
    recommendedActions: []
  }

  // Determine reading style
  const { totalUnderlines, totalIdeas, engagementScore } = data

  if (totalIdeas > totalUnderlines * 0.5) {
    predictions.readingStyle = 'analytical'
    predictions.personalityTraits.push({
      trait: 'Deep Thinker',
      description: 'You often reflect on what you read and form your own ideas',
      score: Math.min(100, Math.round((totalIdeas / Math.max(totalUnderlines, 1)) * 100))
    })
  } else if (totalUnderlines > 50) {
    predictions.readingStyle = 'collector'
    predictions.personalityTraits.push({
      trait: 'Knowledge Collector',
      description: 'You excel at identifying and saving important information',
      score: Math.min(100, Math.round(totalUnderlines / 2))
    })
  }

  // Analyze interests
  if (data.bookCategories && data.bookCategories.length > 0) {
    const topCategory = data.bookCategories[0]
    predictions.strengths.push({
      area: topCategory.categories,
      reason: `You've collected ${topCategory.count} books in this category`
    })
  }

  if (data.favoriteAuthors && data.favoriteAuthors.length > 0) {
    const topAuthor = data.favoriteAuthors[0]
    if (topAuthor.count >= 2) {
      predictions.personalityTraits.push({
        trait: 'Loyal Reader',
        description: `You follow specific authors like ${topAuthor.author}`,
        score: Math.min(100, topAuthor.count * 20)
      })
    }
  }

  // Reading diversity
  const readingTypes = data.readingHistory?.length || 0
  if (readingTypes >= 3) {
    predictions.personalityTraits.push({
      trait: 'Diverse Reader',
      description: 'You explore multiple types of content',
      score: Math.min(100, readingTypes * 25)
    })
  }

  // Engagement analysis
  if (engagementScore >= 80) {
    predictions.personalityTraits.push({
      trait: 'Power User',
      description: 'You are highly engaged with your reading materials',
      score: engagementScore
    })
  } else if (engagementScore >= 50) {
    predictions.personalityTraits.push({
      trait: 'Active Reader',
      description: 'You regularly engage with content',
      score: engagementScore
    })
  }

  // Recommendations
  if (data.topPublishers && data.topPublishers.length === 0 && data.topEbookCategories) {
    predictions.recommendedActions.push({
      action: 'Explore Magazines',
      reason: 'You haven\'t engaged much with magazines yet - they might offer fresh perspectives'
    })
  }

  if (totalIdeas < 5) {
    predictions.recommendedActions.push({
      action: 'Add More Reflections',
      reason: 'Try adding your thoughts to underlined passages to deepen understanding'
    })
  }

  if (data.bookCategories && data.bookCategories.length === 1) {
    predictions.areasToExplore.push({
      area: 'Genre Diversity',
      suggestion: 'Consider exploring books in different categories to broaden perspectives'
    })
  }

  // Calculate overall tendencies
  const tendencies = {
    analytical: Math.min(100, (totalIdeas / Math.max(totalUnderlines, 1)) * 100),
    curious: Math.min(100, readingTypes * 25),
    focused: data.favoriteAuthors?.length > 0 ? Math.min(100, data.favoriteAuthors[0].count * 20) : 0,
    engaged: engagementScore
  }

  predictions.tendencies = tendencies

  return predictions
}

app.listen(PORT, () => {
  console.log(`BookPost server running on http://localhost:${PORT}`)

  // Start background cover generation after 5 seconds to allow server to fully initialize
  setTimeout(() => {
    startBackgroundCoverGeneration()
  }, 5000)

  // Start NBA folder scan after 3 seconds
  setTimeout(() => {
    scanNBAFolder().catch(err => console.error('[NBA Scan] Error:', err))
  }, 3000)

  // Start Audio folder scan after 4 seconds
  setTimeout(() => {
    scanAudioFolders().catch(err => console.error('[Audio Scan] Error:', err))
  }, 4000)

  // Start Lectures folder scan after 5 seconds
  setTimeout(() => {
    scanLecturesFolder().catch(err => console.error('[Lectures Scan] Error:', err))
  }, 5000)

  // Start Speeches folder scan after 6 seconds
  setTimeout(() => {
    scanSpeechesFolder().catch(err => console.error('[Speeches Scan] Error:', err))
  }, 6000)

  // Start Movies folder scan after 7 seconds
  setTimeout(() => {
    scanMoviesFolder().catch(err => console.error('[Movies Scan] Error:', err))
  }, 7000)

  // Start TV Shows folder scan after 8 seconds
  setTimeout(() => {
    scanTVShowsFolder().catch(err => console.error('[TV Shows Scan] Error:', err))
  }, 8000)

  // Start Documentaries folder scan after 9 seconds
  setTimeout(() => {
    scanDocumentariesFolder().catch(err => console.error('[Documentaries Scan] Error:', err))
  }, 9000)

  // Start Animation folder scan after 10 seconds
  setTimeout(() => {
    scanAnimationFolder().catch(err => console.error('[Animation Scan] Error:', err))
  }, 10000)
})
