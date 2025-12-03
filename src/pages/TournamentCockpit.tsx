import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface Match {
  id: string;
  match_number: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  scheduled_time: string;
  field_number: number | null;
  status: string;
  group_id: string | null;
}

interface Team {
  id: string;
  name: string;
}

interface MatchWithTeams extends Match {
  homeTeam: Team;
  awayTeam: Team;
  groupName: string;
}

const TournamentCockpit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [rounds, setRounds] = useState<MatchWithTeams[][]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);

    // Load tournament
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tournamentError) {
      toast.error("Fehler beim Laden des Turniers");
      navigate("/dashboard");
      return;
    }

    setTournament(tournamentData);

    // Load all matches with teams and groups
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id)
      .order("scheduled_time")
      .order("match_number");

    if (!matchesData) {
      setLoading(false);
      return;
    }

    // Load teams
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("tournament_id", id);

    const teamsMap: Record<string, Team> = {};
    teamsData?.forEach(team => {
      teamsMap[team.id] = team;
    });

    // Load groups
    const { data: groupsData } = await supabase
      .from("tournament_groups")
      .select("*")
      .eq("tournament_id", id);

    const groupsMap: Record<string, string> = {};
    groupsData?.forEach(group => {
      groupsMap[group.id] = group.name;
    });

    // Enrich matches with team names and group names
    const enrichedMatches: MatchWithTeams[] = matchesData.map(match => ({
      ...match,
      homeTeam: teamsMap[match.home_team_id] || { id: match.home_team_id, name: "Unbekannt" },
      awayTeam: teamsMap[match.away_team_id] || { id: match.away_team_id, name: "Unbekannt" },
      groupName: match.group_id ? groupsMap[match.group_id] || "" : ""
    }));

    // Group matches by time slot (round)
    const matchesByTime: Record<string, MatchWithTeams[]> = {};
    enrichedMatches.forEach(match => {
      const timeKey = match.scheduled_time;
      if (!matchesByTime[timeKey]) {
        matchesByTime[timeKey] = [];
      }
      matchesByTime[timeKey].push(match);
    });

    const roundsArray = Object.values(matchesByTime);
    setRounds(roundsArray);

    // Find current or next round
    const now = new Date();
    const currentIndex = roundsArray.findIndex(round => {
      const roundTime = new Date(round[0].scheduled_time);
      return roundTime >= now;
    });

    setCurrentRoundIndex(currentIndex >= 0 ? currentIndex : 0);
    setLoading(false);
  };

  // Update score only (without changing status)
  const updateScore = async (matchId: string, homeScore: number, awayScore: number) => {
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
      })
      .eq("id", matchId);

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      loadData();
    }
  };

  // Confirm result and mark match as completed
  const confirmResult = async (match: MatchWithTeams) => {
    const { error } = await supabase
      .from("matches")
      .update({
        status: "completed"
      })
      .eq("id", match.id);

    if (error) {
      toast.error("Fehler beim Bestätigen");
    } else {
      toast.success(`Resultat bestätigt: ${match.homeTeam.name} ${match.home_score ?? 0} : ${match.away_score ?? 0} ${match.awayTeam.name}`);
      loadData();
    }
  };

  // Reopen a completed match for editing
  const reopenMatch = async (matchId: string) => {
    const { error } = await supabase
      .from("matches")
      .update({
        status: "scheduled"
      })
      .eq("id", matchId);

    if (error) {
      toast.error("Fehler beim Öffnen");
    } else {
      loadData();
    }
  };

  const incrementScore = (match: MatchWithTeams, team: 'home' | 'away') => {
    const currentHome = match.home_score ?? 0;
    const currentAway = match.away_score ?? 0;
    
    if (team === 'home') {
      updateScore(match.id, currentHome + 1, currentAway);
    } else {
      updateScore(match.id, currentHome, currentAway + 1);
    }
  };

  const decrementScore = (match: MatchWithTeams, team: 'home' | 'away') => {
    const currentHome = match.home_score ?? 0;
    const currentAway = match.away_score ?? 0;
    
    if (team === 'home' && currentHome > 0) {
      updateScore(match.id, currentHome - 1, currentAway);
    } else if (team === 'away' && currentAway > 0) {
      updateScore(match.id, currentHome, currentAway - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament || rounds.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Button onClick={() => navigate(`/dashboard/tournament/${id}`)} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Keine Spiele verfügbar</p>
        </div>
      </div>
    );
  }

  const currentRound = rounds[currentRoundIndex] || [];
  const nextRound = rounds[currentRoundIndex + 1];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={() => navigate(`/dashboard/tournament/${id}`)} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold">{tournament.name} - Cockpit</h1>
          <div className="w-24" />
        </div>

        {/* Round Navigation */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))}
            disabled={currentRoundIndex === 0}
            size="lg"
            variant="outline"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Runde</p>
            <p className="text-2xl font-bold">
              {currentRoundIndex + 1} / {rounds.length}
            </p>
            {currentRound.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {new Date(currentRound[0].scheduled_time).toLocaleString("de-CH", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            )}
          </div>
          <Button
            onClick={() => setCurrentRoundIndex(Math.min(rounds.length - 1, currentRoundIndex + 1))}
            disabled={currentRoundIndex === rounds.length - 1}
            size="lg"
            variant="outline"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Current Round Matches */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {currentRound.map((match) => (
            <Card key={match.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{match.groupName}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {match.field_number && (
                      <>
                        <MapPin className="w-4 h-4" />
                        <span>Feld {match.field_number}</span>
                      </>
                    )}
                    <Badge variant="outline">Spiel {match.match_number}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Home Team */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-xl">{match.homeTeam.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => decrementScore(match, 'home')}
                      className="h-16 w-16 text-2xl"
                      disabled={match.status === "completed"}
                    >
                      -
                    </Button>
                    <div className="w-20 text-center">
                      <span className="text-5xl font-bold">{match.home_score ?? 0}</span>
                    </div>
                    <Button
                      size="lg"
                      variant="default"
                      onClick={() => incrementScore(match, 'home')}
                      className="h-16 w-16 text-2xl"
                      disabled={match.status === "completed"}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4" />

                {/* Away Team */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-xl">{match.awayTeam.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => decrementScore(match, 'away')}
                      className="h-16 w-16 text-2xl"
                      disabled={match.status === "completed"}
                    >
                      -
                    </Button>
                    <div className="w-20 text-center">
                      <span className="text-5xl font-bold">{match.away_score ?? 0}</span>
                    </div>
                    <Button
                      size="lg"
                      variant="default"
                      onClick={() => incrementScore(match, 'away')}
                      className="h-16 w-16 text-2xl"
                      disabled={match.status === "completed"}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Confirm or Reopen Button */}
                {match.status === "completed" ? (
                  <Button
                    variant="outline"
                    className="w-full border-green-600 text-green-600 hover:bg-green-600/10"
                    onClick={() => reopenMatch(match.id)}
                  >
                    ✓ Beendet ({match.home_score} : {match.away_score}) - Klicken zum Bearbeiten
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => confirmResult(match)}
                  >
                    Resultat bestätigen
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Next Round Preview */}
        {nextRound && nextRound.length > 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Nächste Runde - Vorschau
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(nextRound[0].scheduled_time).toLocaleString("de-CH", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {nextRound.map((match) => (
                  <div key={match.id} className="p-4 border border-border rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {match.groupName}
                      </span>
                      {match.field_number && (
                        <span className="text-xs text-muted-foreground">
                          Feld {match.field_number}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">{match.homeTeam.name}</p>
                      <p className="text-sm text-muted-foreground">vs</p>
                      <p className="font-semibold">{match.awayTeam.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TournamentCockpit;
