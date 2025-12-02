-- Create storage bucket for tournament documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tournament-documents',
  'tournament-documents',
  true,
  10485760,
  ARRAY['application/pdf']::text[]
);

-- Storage policies for tournament documents
CREATE POLICY "Public can view tournament documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-documents');

CREATE POLICY "Authenticated users can upload tournament documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tournament-documents' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own tournament documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tournament-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own tournament documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tournament-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add PDF URLs to tournaments table
ALTER TABLE public.tournaments
ADD COLUMN rules_pdf_url TEXT,
ADD COLUMN terms_pdf_url TEXT;

-- Fix: Allow organizers to see their own draft tournaments
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;

CREATE POLICY "Published tournaments are viewable by everyone"
  ON public.tournaments FOR SELECT
  USING (status IN ('published', 'ongoing', 'completed'));

CREATE POLICY "Organizers can view their own tournaments"
  ON public.tournaments FOR SELECT
  USING (auth.uid() = organizer_id);