-- Add custom domain fields to tournaments
ALTER TABLE public.tournaments
ADD COLUMN custom_domain TEXT UNIQUE,
ADD COLUMN domain_verification_token TEXT,
ADD COLUMN domain_status TEXT DEFAULT 'not_configured' CHECK (domain_status IN ('not_configured', 'verifying', 'active', 'failed'));

-- Create sponsors table
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze', 'standard')),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Sponsor policies
CREATE POLICY "Sponsors are viewable by everyone"
  ON public.sponsors FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage sponsors"
  ON public.sponsors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = sponsors.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Create function to generate verification token
CREATE OR REPLACE FUNCTION public.generate_verification_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'gruempi_verify_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;