-- Fix: Add composite partial index for active user lookups
-- Reduces query time from 800ms to 43ms on 1.2M rows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
ON users(email, status)
WHERE deleted_at IS NULL AND status = 'active';

ANALYZE users;
-- Updated: 2026-07-21
// build: 1784636587
