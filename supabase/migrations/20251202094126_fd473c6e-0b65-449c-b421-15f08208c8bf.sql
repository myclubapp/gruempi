-- Add sport_type and registration_deadline to tournaments table
ALTER TABLE tournaments 
ADD COLUMN sport_type TEXT CHECK (sport_type IN ('volleyball', 'handball', 'unihockey', 'fussball')),
ADD COLUMN registration_deadline TIMESTAMP WITH TIME ZONE;