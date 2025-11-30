-- PostgreSQL Schema for BookPost
-- This file creates all tables for a fresh PostgreSQL deployment

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    refresh_token TEXT,
    refresh_expires_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
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
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    page_photo_url TEXT,
    page_number INTEGER,
    extracted_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Underlines table
CREATE TABLE IF NOT EXISTS underlines (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    idea TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
    id SERIAL PRIMARY KEY,
    underline_id INTEGER NOT NULL REFERENCES underlines(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Publishers table
CREATE TABLE IF NOT EXISTS publishers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Magazines table
CREATE TABLE IF NOT EXISTS magazines (
    id SERIAL PRIMARY KEY,
    publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    page_count INTEGER,
    year INTEGER,
    issue TEXT,
    cover_url TEXT,
    s3_key TEXT,
    preprocessed INTEGER DEFAULT 0,
    author TEXT,
    description TEXT,
    publisher_name TEXT,
    language TEXT,
    publish_date TEXT,
    metadata_extracted INTEGER DEFAULT 0,
    metadata_extracted_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Magazine underlines table
CREATE TABLE IF NOT EXISTS magazine_underlines (
    id SERIAL PRIMARY KEY,
    magazine_id INTEGER NOT NULL REFERENCES magazines(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Magazine ideas table
CREATE TABLE IF NOT EXISTS magazine_ideas (
    id SERIAL PRIMARY KEY,
    underline_id INTEGER NOT NULL REFERENCES magazine_underlines(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ebook categories table
CREATE TABLE IF NOT EXISTS ebook_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ebooks table
CREATE TABLE IF NOT EXISTS ebooks (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES ebook_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    cover_url TEXT,
    s3_key TEXT,
    file_type TEXT DEFAULT 'pdf',
    normalized_title TEXT,
    author TEXT,
    description TEXT,
    publisher TEXT,
    language TEXT,
    page_count INTEGER,
    chapter_count INTEGER,
    toc_json TEXT,
    publish_date TEXT,
    isbn TEXT,
    metadata_extracted INTEGER DEFAULT 0,
    metadata_extracted_at TEXT,
    -- External API metadata (Google Books, Open Library)
    google_books_id TEXT,
    open_library_key TEXT,
    average_rating REAL,
    ratings_count INTEGER,
    categories TEXT,
    subjects TEXT,
    preview_link TEXT,
    info_link TEXT,
    external_cover_url TEXT,
    external_metadata_source TEXT,
    external_metadata_fetched_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ebook underlines table
CREATE TABLE IF NOT EXISTS ebook_underlines (
    id SERIAL PRIMARY KEY,
    ebook_id INTEGER NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    paragraph TEXT,
    chapter_index INTEGER NOT NULL DEFAULT 0,
    paragraph_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    cfi_range TEXT,
    idea_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ebook ideas table
CREATE TABLE IF NOT EXISTS ebook_ideas (
    id SERIAL PRIMARY KEY,
    underline_id INTEGER NOT NULL REFERENCES ebook_underlines(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note underlines table
CREATE TABLE IF NOT EXISTS note_underlines (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    paragraph_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note ideas table
CREATE TABLE IF NOT EXISTS note_ideas (
    id SERIAL PRIMARY KEY,
    underline_id INTEGER NOT NULL REFERENCES note_underlines(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note comments table
CREATE TABLE IF NOT EXISTS note_comments (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    nick TEXT,
    content TEXT NOT NULL,
    original_date TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reading history table
CREATE TABLE IF NOT EXISTS reading_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    cover_url TEXT,
    last_page INTEGER DEFAULT 1,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_type, item_id)
);

-- NBA series table
CREATE TABLE IF NOT EXISTS nba_series (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    teams TEXT,
    folder_path TEXT NOT NULL,
    cover_url TEXT,
    category TEXT DEFAULT 'chinese',
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NBA games table
CREATE TABLE IF NOT EXISTS nba_games (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES nba_series(id) ON DELETE CASCADE,
    game_number INTEGER,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT DEFAULT 'mkv',
    duration INTEGER,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audio series table
CREATE TABLE IF NOT EXISTS audio_series (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audio files table
CREATE TABLE IF NOT EXISTS audio_files (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES audio_series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp3',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lecture series table
CREATE TABLE IF NOT EXISTS lecture_series (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lecture videos table
CREATE TABLE IF NOT EXISTS lecture_videos (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES lecture_series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Speech series table
CREATE TABLE IF NOT EXISTS speech_series (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Speech videos table
CREATE TABLE IF NOT EXISTS speech_videos (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES speech_series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    year INTEGER,
    genre TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TV Show series table
CREATE TABLE IF NOT EXISTS tvshow_series (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    episode_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TV Show episodes table
CREATE TABLE IF NOT EXISTS tvshow_episodes (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES tvshow_series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    season INTEGER,
    episode INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documentary series table
CREATE TABLE IF NOT EXISTS documentary_series (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    episode_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documentary episodes table
CREATE TABLE IF NOT EXISTS documentary_episodes (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES documentary_series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animation series table
CREATE TABLE IF NOT EXISTS animation_series (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT NOT NULL UNIQUE,
    episode_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animation episodes table
CREATE TABLE IF NOT EXISTS animation_episodes (
    id SERIAL PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES animation_series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    duration INTEGER,
    file_type TEXT DEFAULT 'mp4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ebooks_category ON ebooks(category_id);
CREATE INDEX IF NOT EXISTS idx_ebooks_metadata ON ebooks(metadata_extracted, external_metadata_fetched_at);
CREATE INDEX IF NOT EXISTS idx_magazines_publisher ON magazines(publisher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id);
