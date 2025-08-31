-- Migration: add posting flags to journal_entries (SQLite/Postgres compatible where possible)
-- Adds is_posted and posted_date columns if they do not exist.

-- SQLite: simple ADD COLUMN (will ignore constraints/backfills)
ALTER TABLE journal_entries ADD COLUMN is_posted INTEGER DEFAULT 0;
ALTER TABLE journal_entries ADD COLUMN posted_date TIMESTAMP NULL;

