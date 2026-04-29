-- V27: Add CHAT value to notification_type enum
-- Used for notifications when a new chat room is opened with the user

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CHAT';
