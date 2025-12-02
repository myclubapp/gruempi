-- Add creditor_name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creditor_name text;