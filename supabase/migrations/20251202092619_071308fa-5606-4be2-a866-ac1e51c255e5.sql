-- Create profiles table for organizers
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  organization TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  entry_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed')),
  rules TEXT,
  terms_and_conditions TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Tournament policies
CREATE POLICY "Tournaments are viewable by everyone"
  ON public.tournaments FOR SELECT
  USING (status IN ('published', 'ongoing', 'completed'));

CREATE POLICY "Organizers can insert their own tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own tournaments"
  ON public.tournaments FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own tournaments"
  ON public.tournaments FOR DELETE
  USING (auth.uid() = organizer_id);

-- Create tournament categories
CREATE TABLE public.tournament_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  max_licensed_players INT NOT NULL DEFAULT 0,
  min_players INT NOT NULL DEFAULT 4,
  max_players INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tournament_categories ENABLE ROW LEVEL SECURITY;

-- Category policies
CREATE POLICY "Categories are viewable by everyone"
  ON public.tournament_categories FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage categories"
  ON public.tournament_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_categories.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.tournament_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  supervisor_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'confirmed_manual')),
  payment_method TEXT CHECK (payment_method IN ('stripe', 'manual', 'onsite')),
  stripe_payment_intent_id TEXT,
  rules_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'checked_in')),
  costume_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team policies
CREATE POLICY "Teams are viewable by everyone"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register a team"
  ON public.teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Team contact can update their own team"
  ON public.teams FOR UPDATE
  USING (contact_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Organizers can update teams in their tournaments"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = teams.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Create team players
CREATE TABLE public.team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  license_number TEXT,
  is_licensed BOOLEAN NOT NULL DEFAULT false,
  jersey_number INT,
  position TEXT CHECK (position IN ('goalie', 'field')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

-- Player policies
CREATE POLICY "Players are viewable by everyone"
  ON public.team_players FOR SELECT
  USING (true);

CREATE POLICY "Players can be added by anyone during registration"
  ON public.team_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Organizers can manage players"
  ON public.team_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      JOIN public.tournaments ON tournaments.id = teams.tournament_id
      WHERE teams.id = team_players.team_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Create tournament groups
CREATE TABLE public.tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.tournament_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;

-- Group policies
CREATE POLICY "Groups are viewable by everyone"
  ON public.tournament_groups FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage groups"
  ON public.tournament_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_groups.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Create matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL,
  match_number INT NOT NULL,
  field_number INT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  home_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  home_score INT,
  away_score INT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  match_type TEXT NOT NULL DEFAULT 'group' CHECK (match_type IN ('group', 'quarterfinal', 'semifinal', 'third_place', 'fifth_place', 'seventh_place', 'final')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Match policies
CREATE POLICY "Matches are viewable by everyone"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage matches"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();