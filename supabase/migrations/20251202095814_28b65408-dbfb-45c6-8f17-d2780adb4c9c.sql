-- Add registration token to teams table for shareable player registration link
ALTER TABLE teams ADD COLUMN registration_token TEXT UNIQUE;

-- Generate tokens for existing teams
UPDATE teams SET registration_token = encode(gen_random_bytes(16), 'hex') WHERE registration_token IS NULL;

-- Make registration_token NOT NULL with default
ALTER TABLE teams ALTER COLUMN registration_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE teams ALTER COLUMN registration_token SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_teams_registration_token ON teams(registration_token);

-- Update RLS policy to allow players to be added via registration token
-- This allows unauthenticated users to add players if they have the valid token
CREATE POLICY "Players can self-register with valid token"
ON team_players
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_players.team_id
  )
);