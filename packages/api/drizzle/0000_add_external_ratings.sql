-- Add external rating columns to ebooks table
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "external_rating" numeric(3, 2);
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "external_ratings_count" integer;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "external_rating_source" text;
