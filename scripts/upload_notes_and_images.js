const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const r2Client = new S3Client({
  region: 'auto',
  endpoint: 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
const bucketName = process.env.R2_BUCKET_NAME || 'bookpost-media';
const db = new Database(path.join(__dirname, '../packages/server/src/bookpost.db'));

const BLOG_POSTS_DIR = '/Users/HONGBGU/Documents/blog/source/_posts';
const BLOG_IMAGES_DIR = '/Users/HONGBGU/Documents/blog/source/images';

// Get content type based on file extension
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.md': 'text/markdown',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return types[ext] || 'application/octet-stream';
}

// Sanitize string for filename/path
function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Upload file to R2
async function uploadToR2(localPath, key, contentType) {
  const fileContent = fs.readFileSync(localPath);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
    ContentType: contentType
  });
  await r2Client.send(command);
  return key;
}

async function uploadNotes() {
  process.stdout.write('=== Uploading Notes (Markdown files) to R2 ===\n\n');

  // Get all notes that need uploading
  const notes = db.prepare(`
    SELECT id, title, file_path
    FROM notes
    WHERE s3_key IS NULL OR s3_key = ''
    ORDER BY id
  `).all();

  process.stdout.write(`Found ${notes.length} notes to upload\n\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const progress = `[${i + 1}/${notes.length}]`;

    try {
      // Check if local file exists
      if (!fs.existsSync(note.file_path)) {
        process.stdout.write(`${progress} SKIP (file not found): ${note.title}\n`);
        skipped++;
        continue;
      }

      // Get file stats
      const stats = fs.statSync(note.file_path);
      if (stats.size < 10) {
        process.stdout.write(`${progress} SKIP (file too small): ${note.title}\n`);
        skipped++;
        continue;
      }

      // Generate R2 key
      const filename = path.basename(note.file_path);
      const r2Key = `notes/${sanitize(filename)}`;

      // Upload to R2
      const sizeMB = (stats.size / 1024).toFixed(2);
      process.stdout.write(`${progress} Uploading (${sizeMB}KB): ${note.title}\n`);

      await uploadToR2(note.file_path, r2Key, 'text/markdown');

      // Update database with R2 key
      db.prepare('UPDATE notes SET s3_key = ? WHERE id = ?').run(r2Key, note.id);

      uploaded++;
    } catch (err) {
      process.stderr.write(`${progress} ERROR: ${note.title} - ${err.message}\n`);
      errors++;
    }
  }

  process.stdout.write('\n=== Notes Upload Complete ===\n');
  process.stdout.write(`Uploaded: ${uploaded}\n`);
  process.stdout.write(`Skipped: ${skipped}\n`);
  process.stdout.write(`Errors: ${errors}\n`);

  return uploaded;
}

async function uploadBlogImages() {
  process.stdout.write('\n=== Uploading Blog Images to R2 ===\n\n');

  // Get all image files
  const files = fs.readdirSync(BLOG_IMAGES_DIR);
  const imageFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
  });

  process.stdout.write(`Found ${imageFiles.length} images to upload\n\n`);

  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const progress = `[${i + 1}/${imageFiles.length}]`;

    try {
      const localPath = path.join(BLOG_IMAGES_DIR, filename);
      const stats = fs.statSync(localPath);

      // Generate R2 key - preserve original filename
      const r2Key = `blog-images/${filename}`;

      // Upload to R2
      const sizeKB = (stats.size / 1024).toFixed(2);
      process.stdout.write(`${progress} Uploading (${sizeKB}KB): ${filename}\n`);

      const contentType = getContentType(filename);
      await uploadToR2(localPath, r2Key, contentType);

      uploaded++;
    } catch (err) {
      process.stderr.write(`${progress} ERROR: ${filename} - ${err.message}\n`);
      errors++;
    }
  }

  process.stdout.write('\n=== Blog Images Upload Complete ===\n');
  process.stdout.write(`Uploaded: ${uploaded}\n`);
  process.stdout.write(`Errors: ${errors}\n`);

  return uploaded;
}

async function main() {
  const notesUploaded = await uploadNotes();
  const imagesUploaded = await uploadBlogImages();

  process.stdout.write('\n=== All Uploads Complete ===\n');
  process.stdout.write(`Total Notes: ${notesUploaded}\n`);
  process.stdout.write(`Total Images: ${imagesUploaded}\n`);
}

main().catch(console.error);
