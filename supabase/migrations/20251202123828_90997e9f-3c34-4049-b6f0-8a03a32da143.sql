-- Add new columns for KO phase break durations
ALTER TABLE public.tournament_schedule_config
ADD COLUMN ko_break_before_minutes integer NOT NULL DEFAULT 15,
ADD COLUMN ko_break_between_minutes integer NOT NULL DEFAULT 10;

-- Make team IDs nullable for KO matches with placeholders
ALTER TABLE public.matches
ALTER COLUMN home_team_id DROP NOT NULL,
ALTER COLUMN away_team_id DROP NOT NULL;

-- Add column to store placeholder info for KO matches
ALTER TABLE public.matches
ADD COLUMN home_placeholder text,
ADD COLUMN away_placeholder text;