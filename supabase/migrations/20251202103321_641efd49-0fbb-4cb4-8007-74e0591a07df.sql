-- Add entry fee field to tournament categories
ALTER TABLE public.tournament_categories
ADD COLUMN entry_fee NUMERIC NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.tournament_categories.entry_fee IS 'Entry fee for teams in this category (CHF)';