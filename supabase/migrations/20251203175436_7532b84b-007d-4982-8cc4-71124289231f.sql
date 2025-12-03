-- Drop old constraint and add new one with all needed values
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_match_type_check;

ALTER TABLE public.matches ADD CONSTRAINT matches_match_type_check 
CHECK (match_type = ANY (ARRAY[
  'group'::text, 
  'quarterfinal'::text, 
  'semifinal'::text, 
  'third_place'::text, 
  'fifth_place'::text, 
  'seventh_place'::text, 
  'final'::text,
  'round_of_16'::text,
  'round_of_32'::text
]));