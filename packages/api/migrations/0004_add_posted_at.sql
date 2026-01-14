-- D1 MIGRATION: 0004_add_posted_at.sql
ALTER TABLE properties ADD COLUMN posted_at_schema TEXT; -- using _schema to avoid potential keyword conflicts, or just posted_at is fine. JSON extraction might be ISO.
-- Let's stick to simple posted_at
ALTER TABLE properties ADD COLUMN posted_at TEXT;
