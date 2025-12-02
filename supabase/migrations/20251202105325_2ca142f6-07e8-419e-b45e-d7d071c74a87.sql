-- Create tournament_schedule_config table for scheduling parameters
CREATE TABLE IF NOT EXISTS public.tournament_schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_duration_minutes INTEGER NOT NULL DEFAULT 20,
  break_duration_minutes INTEGER NOT NULL DEFAULT 5,
  number_of_fields INTEGER NOT NULL DEFAULT 1,
  ranking_mode TEXT NOT NULL DEFAULT 'points_goal_diff_direct', -- points_goal_diff_direct, points_set_diff_direct, etc.
  ko_phase_teams INTEGER DEFAULT 0, -- 0 = no KO phase, 2, 4, 8, 16, 32, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id)
);

-- Create team_group_assignments table
CREATE TABLE IF NOT EXISTS public.team_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id)
);

-- Add RLS policies for tournament_schedule_config
ALTER TABLE public.tournament_schedule_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schedule configs are viewable by everyone"
  ON public.tournament_schedule_config FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage schedule configs"
  ON public.tournament_schedule_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_schedule_config.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Add RLS policies for team_group_assignments
ALTER TABLE public.team_group_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team group assignments are viewable by everyone"
  ON public.team_group_assignments FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage team group assignments"
  ON public.team_group_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      JOIN public.tournaments ON tournaments.id = teams.tournament_id
      WHERE teams.id = team_group_assignments.team_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Add trigger for updated_at on tournament_schedule_config
CREATE TRIGGER update_tournament_schedule_config_updated_at
  BEFORE UPDATE ON public.tournament_schedule_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();