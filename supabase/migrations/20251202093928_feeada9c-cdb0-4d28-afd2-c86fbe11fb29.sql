-- Add min/max teams and time fields to tournament_categories
ALTER TABLE public.tournament_categories
ADD COLUMN min_teams INT DEFAULT 2,
ADD COLUMN max_teams INT;

-- Add start and end time to tournaments
ALTER TABLE public.tournaments
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;