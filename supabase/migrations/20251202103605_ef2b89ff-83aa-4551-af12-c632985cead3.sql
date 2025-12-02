-- Add DELETE policy for teams table to allow organizers to delete teams in their tournaments
CREATE POLICY "Organizers can delete teams in their tournaments"
ON public.teams
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM tournaments
    WHERE tournaments.id = teams.tournament_id
    AND tournaments.organizer_id = auth.uid()
  )
);