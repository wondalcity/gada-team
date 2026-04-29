-- ────────────────────────────────────────────────────────────────────────────
-- V23: Fix team invitation flow
--
-- Problem: joined_at was NOT NULL with DEFAULT NOW(), so PENDING invites
--          got a joinedAt immediately and appeared as full team members.
--
-- Fix: Make joined_at nullable so PENDING members have no joinedAt.
--      It is set only when the invitation is ACCEPTED.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Drop the default so existing NULL behaviour is preserved on new inserts
ALTER TABLE team_members ALTER COLUMN joined_at DROP DEFAULT;

-- 2. Allow NULL (pending invitations have no joined_at until accepted)
ALTER TABLE team_members ALTER COLUMN joined_at DROP NOT NULL;

-- 3. Clear joinedAt for any existing PENDING members that incorrectly have it set
UPDATE team_members SET joined_at = NULL WHERE invitation_status = 'PENDING';
