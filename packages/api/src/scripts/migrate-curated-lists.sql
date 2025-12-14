-- Migration: Add missing columns to curated_lists and curated_list_items tables
-- Run with: psql $DATABASE_URL -f src/scripts/migrate-curated-lists.sql
-- Or copy-paste into your database client

-- ============================================
-- curated_lists table additions
-- ============================================

-- Add source_logo_url if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'source_logo_url'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN source_logo_url TEXT;
        RAISE NOTICE 'Added source_logo_url to curated_lists';
    ELSE
        RAISE NOTICE 'source_logo_url already exists in curated_lists';
    END IF;
END $$;

-- Add source_name if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'source_name'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN source_name TEXT;
        RAISE NOTICE 'Added source_name to curated_lists';
    ELSE
        RAISE NOTICE 'source_name already exists in curated_lists';
    END IF;
END $$;

-- Add source_url if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'source_url'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN source_url TEXT;
        RAISE NOTICE 'Added source_url to curated_lists';
    ELSE
        RAISE NOTICE 'source_url already exists in curated_lists';
    END IF;
END $$;

-- Add year if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'year'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN year INTEGER;
        RAISE NOTICE 'Added year to curated_lists';
    ELSE
        RAISE NOTICE 'year already exists in curated_lists';
    END IF;
END $$;

-- Add month if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'month'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN month INTEGER;
        RAISE NOTICE 'Added month to curated_lists';
    ELSE
        RAISE NOTICE 'month already exists in curated_lists';
    END IF;
END $$;

-- Add category if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'category'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN category TEXT;
        RAISE NOTICE 'Added category to curated_lists';
    ELSE
        RAISE NOTICE 'category already exists in curated_lists';
    END IF;
END $$;

-- Add book_count if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'book_count'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN book_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added book_count to curated_lists';
    ELSE
        RAISE NOTICE 'book_count already exists in curated_lists';
    END IF;
END $$;

-- Add view_count if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'view_count'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN view_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added view_count to curated_lists';
    ELSE
        RAISE NOTICE 'view_count already exists in curated_lists';
    END IF;
END $$;

-- Add save_count if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'save_count'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN save_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added save_count to curated_lists';
    ELSE
        RAISE NOTICE 'save_count already exists in curated_lists';
    END IF;
END $$;

-- Add sort_order if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN sort_order INTEGER DEFAULT 0;
        RAISE NOTICE 'Added sort_order to curated_lists';
    ELSE
        RAISE NOTICE 'sort_order already exists in curated_lists';
    END IF;
END $$;

-- Add is_featured if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN is_featured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_featured to curated_lists';
    ELSE
        RAISE NOTICE 'is_featured already exists in curated_lists';
    END IF;
END $$;

-- Add is_active if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_lists' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE curated_lists ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active to curated_lists';
    ELSE
        RAISE NOTICE 'is_active already exists in curated_lists';
    END IF;
END $$;

-- ============================================
-- curated_list_items table fixes
-- ============================================

-- Make book_id nullable (it should allow NULL for external-only books)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'book_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE curated_list_items ALTER COLUMN book_id DROP NOT NULL;
        RAISE NOTICE 'Made book_id nullable in curated_list_items';
    ELSE
        RAISE NOTICE 'book_id already nullable or does not exist in curated_list_items';
    END IF;
END $$;

-- ============================================
-- curated_list_items table additions
-- ============================================

-- Add external_title if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'external_title'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN external_title TEXT;
        RAISE NOTICE 'Added external_title to curated_list_items';
    ELSE
        RAISE NOTICE 'external_title already exists in curated_list_items';
    END IF;
END $$;

-- Add external_author if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'external_author'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN external_author TEXT;
        RAISE NOTICE 'Added external_author to curated_list_items';
    ELSE
        RAISE NOTICE 'external_author already exists in curated_list_items';
    END IF;
END $$;

-- Add external_cover_url if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'external_cover_url'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN external_cover_url TEXT;
        RAISE NOTICE 'Added external_cover_url to curated_list_items';
    ELSE
        RAISE NOTICE 'external_cover_url already exists in curated_list_items';
    END IF;
END $$;

-- Add external_description if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'external_description'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN external_description TEXT;
        RAISE NOTICE 'Added external_description to curated_list_items';
    ELSE
        RAISE NOTICE 'external_description already exists in curated_list_items';
    END IF;
END $$;

-- Add isbn if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'isbn'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN isbn TEXT;
        RAISE NOTICE 'Added isbn to curated_list_items';
    ELSE
        RAISE NOTICE 'isbn already exists in curated_list_items';
    END IF;
END $$;

-- Add isbn_13 if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'isbn_13'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN isbn_13 TEXT;
        RAISE NOTICE 'Added isbn_13 to curated_list_items';
    ELSE
        RAISE NOTICE 'isbn_13 already exists in curated_list_items';
    END IF;
END $$;

-- Add amazon_url if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'amazon_url'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN amazon_url TEXT;
        RAISE NOTICE 'Added amazon_url to curated_list_items';
    ELSE
        RAISE NOTICE 'amazon_url already exists in curated_list_items';
    END IF;
END $$;

-- Add goodreads_url if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'goodreads_url'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN goodreads_url TEXT;
        RAISE NOTICE 'Added goodreads_url to curated_list_items';
    ELSE
        RAISE NOTICE 'goodreads_url already exists in curated_list_items';
    END IF;
END $$;

-- Add editor_note if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'curated_list_items' AND column_name = 'editor_note'
    ) THEN
        ALTER TABLE curated_list_items ADD COLUMN editor_note TEXT;
        RAISE NOTICE 'Added editor_note to curated_list_items';
    ELSE
        RAISE NOTICE 'editor_note already exists in curated_list_items';
    END IF;
END $$;

-- ============================================
-- Create indexes for better query performance
-- ============================================

-- Index on curated_lists.list_type
CREATE INDEX IF NOT EXISTS idx_curated_lists_list_type ON curated_lists(list_type);

-- Index on curated_lists.year
CREATE INDEX IF NOT EXISTS idx_curated_lists_year ON curated_lists(year);

-- Index on curated_lists.is_featured
CREATE INDEX IF NOT EXISTS idx_curated_lists_featured ON curated_lists(is_featured, sort_order);

-- Index on curated_list_items.isbn
CREATE INDEX IF NOT EXISTS idx_curated_list_items_isbn ON curated_list_items(isbn);

-- ============================================
-- Verify migration
-- ============================================

SELECT 'Migration complete!' as status;

-- Show curated_lists columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'curated_lists'
ORDER BY ordinal_position;
