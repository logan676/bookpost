#!/usr/bin/env node
/**
 * S3 Upload Script for BookPost
 *
 * This script uploads all magazines and ebooks from local storage to AWS S3
 * and updates the database with S3 keys.
 *
 * Usage:
 *   node scripts/upload-to-s3.js [--magazines] [--ebooks] [--dry-run]
 *
 * Options:
 *   --magazines  Upload only magazines
 *   --ebooks     Upload only ebooks
 *   --dry-run    Show what would be uploaded without actually uploading
 *   --limit N    Limit uploads to N files (for testing)
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import Database from 'better-sqlite3'
import { readFile, stat } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') })

// Parse command line arguments
const args = process.argv.slice(2)
const uploadMagazines = args.includes('--magazines') || (!args.includes('--ebooks'))
const uploadEbooks = args.includes('--ebooks') || (!args.includes('--magazines'))
const dryRun = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null

// AWS Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})
const s3BucketName = process.env.S3_BUCKET_NAME || 'bookpost-files'

// Magazine and Ebook base paths
const MAGAZINES_FOLDER = process.env.MAGAZINES_FOLDER || '/Volumes/T9/杂志'
const EBOOKS_FOLDER = process.env.EBOOKS_FOLDER || '/Volumes/T9/电子书'

// Database
const db = new Database(join(__dirname, '../packages/server/src/bookpost.db'))

// Progress tracking
let totalFiles = 0
let uploadedFiles = 0
let skippedFiles = 0
let failedFiles = 0

// Convert local path to S3 key
function localPathToS3Key(localPath, type) {
  const basePath = type === 'magazines' ? MAGAZINES_FOLDER : EBOOKS_FOLDER
  if (localPath.startsWith(basePath)) {
    const relativePath = localPath.slice(basePath.length + 1)
    return `${type}/${relativePath}`
  }
  return `${type}/${basename(localPath)}`
}

// Check if object exists in S3
async function s3ObjectExists(s3Key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: s3BucketName,
      Key: s3Key
    }))
    return true
  } catch {
    return false
  }
}

// Upload file to S3
async function uploadFileToS3(localPath, s3Key) {
  const fileContent = await readFile(localPath)
  await s3Client.send(new PutObjectCommand({
    Bucket: s3BucketName,
    Key: s3Key,
    Body: fileContent,
    ContentType: 'application/pdf'
  }))
}

// Upload magazines
async function uploadMagazinesToS3() {
  console.log('\n=== Uploading Magazines to S3 ===')

  let query = 'SELECT id, file_path, s3_key FROM magazines WHERE s3_key IS NULL'
  if (limit) query += ` LIMIT ${limit}`

  const magazines = db.prepare(query).all()
  totalFiles += magazines.length

  console.log(`Found ${magazines.length} magazines to upload`)

  const updateStmt = db.prepare('UPDATE magazines SET s3_key = ? WHERE id = ?')

  for (const magazine of magazines) {
    const s3Key = localPathToS3Key(magazine.file_path, 'magazines')

    try {
      // Check if file exists locally
      const fileStat = await stat(magazine.file_path)

      if (dryRun) {
        console.log(`[DRY RUN] Would upload: ${magazine.file_path}`)
        console.log(`          To: s3://${s3BucketName}/${s3Key}`)
        console.log(`          Size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB`)
        uploadedFiles++
        continue
      }

      // Check if already exists in S3
      const exists = await s3ObjectExists(s3Key)
      if (exists) {
        console.log(`[SKIP] Already in S3: ${s3Key}`)
        updateStmt.run(s3Key, magazine.id)
        skippedFiles++
        continue
      }

      // Upload file
      console.log(`[UPLOAD] ${magazine.file_path}`)
      console.log(`         Size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB`)

      await uploadFileToS3(magazine.file_path, s3Key)
      updateStmt.run(s3Key, magazine.id)

      uploadedFiles++
      console.log(`         Done! (${uploadedFiles}/${totalFiles})`)

    } catch (error) {
      console.error(`[ERROR] Failed to upload ${magazine.file_path}: ${error.message}`)
      failedFiles++
    }
  }
}

// Upload ebooks
async function uploadEbooksToS3() {
  console.log('\n=== Uploading Ebooks to S3 ===')

  let query = 'SELECT id, file_path, s3_key FROM ebooks WHERE s3_key IS NULL'
  if (limit) query += ` LIMIT ${limit}`

  const ebooks = db.prepare(query).all()
  totalFiles += ebooks.length

  console.log(`Found ${ebooks.length} ebooks to upload`)

  const updateStmt = db.prepare('UPDATE ebooks SET s3_key = ? WHERE id = ?')

  for (const ebook of ebooks) {
    const s3Key = localPathToS3Key(ebook.file_path, 'ebooks')

    try {
      // Check if file exists locally
      const fileStat = await stat(ebook.file_path)

      if (dryRun) {
        console.log(`[DRY RUN] Would upload: ${ebook.file_path}`)
        console.log(`          To: s3://${s3BucketName}/${s3Key}`)
        console.log(`          Size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB`)
        uploadedFiles++
        continue
      }

      // Check if already exists in S3
      const exists = await s3ObjectExists(s3Key)
      if (exists) {
        console.log(`[SKIP] Already in S3: ${s3Key}`)
        updateStmt.run(s3Key, ebook.id)
        skippedFiles++
        continue
      }

      // Upload file
      console.log(`[UPLOAD] ${ebook.file_path}`)
      console.log(`         Size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB`)

      await uploadFileToS3(ebook.file_path, s3Key)
      updateStmt.run(s3Key, ebook.id)

      uploadedFiles++
      console.log(`         Done! (${uploadedFiles}/${totalFiles})`)

    } catch (error) {
      console.error(`[ERROR] Failed to upload ${ebook.file_path}: ${error.message}`)
      failedFiles++
    }
  }
}

// Main function
async function main() {
  console.log('BookPost S3 Upload Script')
  console.log('========================')
  console.log(`Bucket: ${s3BucketName}`)
  console.log(`Region: ${process.env.AWS_REGION || 'ap-northeast-2'}`)
  console.log(`Dry Run: ${dryRun}`)
  if (limit) console.log(`Limit: ${limit} files`)

  // Verify AWS credentials
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_ACCESS_KEY_ID === 'your_access_key_id') {
    console.error('\n[ERROR] AWS credentials not configured!')
    console.error('Please update .env file with valid AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY')
    process.exit(1)
  }

  try {
    if (uploadMagazines) {
      await uploadMagazinesToS3()
    }

    if (uploadEbooks) {
      await uploadEbooksToS3()
    }

    console.log('\n=== Summary ===')
    console.log(`Total files: ${totalFiles}`)
    console.log(`Uploaded: ${uploadedFiles}`)
    console.log(`Skipped (already in S3): ${skippedFiles}`)
    console.log(`Failed: ${failedFiles}`)

    if (dryRun) {
      console.log('\n[DRY RUN] No files were actually uploaded.')
    }

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    db.close()
  }
}

main()
