import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar, MapPin, Clock, Check, X } from "lucide-react";

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
  match_type: string;
  home_placeholder: string | null;
  away_placeholder: string | null;
}

interface Team {
  id: string;
  name: string;
}

interface MatchListProps {
  tournamentId: string;
  categoryId: string;
  isAdmin?: boolean;
}

const MatchList = ({ tournamentId, categoryId, isAdmin = false }: MatchListProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScores, setEditingScores] = useState<Record<string, { home: string; away: string }>>({});
  const [editingTime, setEditingTime] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [tournamentId, categoryId]);

  const loadData = async () => {
    setLoading(true);

    // Load groups for this category
    const { data: groupsData } = await supabase
      .from("tournament_groups")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("category_id", categoryId)
      .order("name");

    if (groupsData) {
      setGroups(groupsData);
    }

    // Load teams for this category
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("tournament_id", tournamentId)
      .eq("category_id", categoryId);

    const teamIds: string[] = [];
    if (teamsData) {
      const teamsMap = teamsData.reduce((acc, team) => {
        acc[team.id] = team;
        teamIds.push(team.id);
        return acc;
      }, {} as Record<string, Team>);
      setTeams(teamsMap);
    }

    // Load matches
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("scheduled_time")
      .order("match_number");

    if (matchesData) {
      // Filter matches that belong to groups in this category OR KO matches with teams from this category
      const groupIds = groupsData?.map(g => g.id) || [];
      const categoryMatches = matchesData.filter(m => {
        // Include group stage matches for this category
        if (m.group_id && groupIds.includes(m.group_id)) {
          return true;
        }
        // Include KO matches where at least one team is from this category
        if (m.match_type !== 'group') {
          const homeInCategory = m.home_team_id && teamIds.includes(m.home_team_id);
          const awayInCategory = m.away_team_id && teamIds.includes(m.away_team_id);
          // Also check if placeholder references a group from this category
          const homePlaceholderInCategory = m.home_placeholder && groupIds.some(gId => {
            const group = groupsData?.find(g => g.id === gId);
            return group && m.home_placeholder?.includes(group.name);
          });
          const awayPlaceholderInCategory = m.away_placeholder && groupIds.some(gId => {
            const group = groupsData?.find(g => g.id === gId);
            return group && m.away_placeholder?.includes(group.name);
          });
          return homeInCategory || awayInCategory || homePlaceholderInCategory || awayPlaceholderInCategory;
        }
        return false;
      });
      setMatches(categoryMatches);
    }

    setLoading(false);
  };

  const handleScoreChange = (matchId: string, type: 'home' | 'away', value: string) => {
    setEditingScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [type]: value
      }
    }));
  };

  const handleSaveScore = async (matchId: string) => {
    const scores = editingScores[matchId];
    if (!scores) return;

    const homeScore = parseInt(scores.home);
    const awayScore = parseInt(scores.away);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      toast.error("Bitte gültige Resultate eingeben");
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "completed"
      })
      .eq("id", matchId);

    if (error) {
      toast.error("Fehler beim Speichern des Resultats");
    } else {
      toast.success("Resultat gespeichert");
      loadData();
      setEditingScores(prev => {
        const newScores = { ...prev };
        delete newScores[matchId];
        return newScores;
      });
    }
  };

  const handleStartEditTime = (matchId: string, currentTime: string) => {
    const date = new Date(currentTime);
    const timeStr = date.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
    setEditingTime(matchId);
    setNewTime(timeStr);
  };

  const handleSaveTime = async (matchId: string, currentScheduledTime: string) => {
    if (!newTime) return;

    // Parse the new time and combine with existing date
    const [hours, minutes] = newTime.split(":").map(Number);
    const existingDate = new Date(currentScheduledTime);
    existingDate.setHours(hours, minutes, 0, 0);

    const { error } = await supabase
      .from("matches")
      .update({ scheduled_time: existingDate.toISOString() })
      .eq("id", matchId);

    if (error) {
      toast.error("Fehler beim Speichern der Spielzeit");
    } else {
      toast.success("Spielzeit aktualisiert");
      setEditingTime(null);
      setNewTime("");
      loadData();
    }
  };

  const handleCancelEditTime = () => {
    setEditingTime(null);
    setNewTime("");
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return "";
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">Noch keine Spiele geplant</p>
        <p className="text-sm">Der Spielplan wird nach der Gruppeneinteilung erstellt</p>
      </div>
    );
  }

  // Group matches by group for group stage, then show KO matches separately
  const groupMatches = matches.filter(m => m.match_type === 'group');
  const koMatches = matches.filter(m => m.match_type !== 'group');

  const matchesByGroup = groupMatches.reduce((acc, match) => {
    const groupId = match.group_id || 'no-group';
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Group KO matches by match_type (e.g., ko_final, ko_semi, etc.)
  const koMatchesByRound = koMatches.reduce((acc, match) => {
    const round = match.match_type;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const getKORoundName = (matchType: string) => {
    const names: Record<string, string> = {
      'ko_final': 'Final',
      'ko_semi': 'Halbfinal',
      'ko_quarter': 'Viertelfinal',
      'ko_eighth': 'Achtelfinal',
      'ko_sixteenth': 'Sechzehntelfinal',
    };
    return names[matchType] || matchType;
  };

  return (
    <div className="space-y-6">
      {/* Group Stage Matches */}
      {Object.entries(matchesByGroup).map(([groupId, groupMatches]) => (
        <Card key={groupId}>
          <CardHeader>
            <CardTitle>{getGroupName(groupId)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupMatches.map((match) => {
              const homeTeam = teams[match.home_team_id];
              const awayTeam = teams[match.away_team_id];
              const isEditing = editingScores[match.id];
              const isEditingThisTime = editingTime === match.id;

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {isAdmin && isEditingThisTime ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <Input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="w-24 h-7 text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSaveTime(match.id, match.scheduled_time)}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleCancelEditTime}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4" />
                          <span
                            className={isAdmin ? "cursor-pointer hover:underline" : ""}
                            onClick={() => isAdmin && handleStartEditTime(match.id, match.scheduled_time)}
                            title={isAdmin ? "Klicken zum Bearbeiten" : ""}
                          >
                            {new Date(match.scheduled_time).toLocaleString("de-CH", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </>
                      )}
                      {match.field_number && (
                        <>
                          <MapPin className="w-4 h-4 ml-2" />
                          <span>Feld {match.field_number}</span>
                        </>
                      )}
                      <Badge variant="outline" className="ml-2">
                        Spiel {match.match_number}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="font-semibold min-w-[120px]">
                          {homeTeam?.name || match.home_placeholder || "Team nicht gefunden"}
                        </span>
                        {isAdmin ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              className="w-16 text-center"
                              placeholder="0"
                              value={isEditing?.home || match.home_score?.toString() || ""}
                              onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                            />
                            <span className="text-muted-foreground">:</span>
                            <Input
                              type="number"
                              min="0"
                              className="w-16 text-center"
                              placeholder="0"
                              value={isEditing?.away || match.away_score?.toString() || ""}
                              onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="text-2xl font-bold">
                            {match.home_score ?? "-"} : {match.away_score ?? "-"}
                          </div>
                        )}
                        <span className="font-semibold min-w-[120px]">
                          {awayTeam?.name || match.away_placeholder || "Team nicht gefunden"}
                        </span>
                      </div>
                      {isAdmin && isEditing && (
                        <Button onClick={() => handleSaveScore(match.id)} size="sm">
                          Speichern
                        </Button>
                      )}
                      {!isAdmin && match.status === "completed" && (
                        <Badge variant="default" className="bg-green-600">
                          Beendet
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* KO Phase Matches */}
      {Object.entries(koMatchesByRound).map(([roundType, roundMatches]) => (
        <Card key={roundType}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 {getKORoundName(roundType)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roundMatches.map((match) => {
              const homeTeam = teams[match.home_team_id];
              const awayTeam = teams[match.away_team_id];
              const isEditing = editingScores[match.id];
              const isEditingThisTime = editingTime === match.id;

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 border border-accent rounded-lg bg-accent/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {isAdmin && isEditingThisTime ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <Input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="w-24 h-7 text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSaveTime(match.id, match.scheduled_time)}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleCancelEditTime}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4" />
                          <span
                            className={isAdmin ? "cursor-pointer hover:underline" : ""}
                            onClick={() => isAdmin && handleStartEditTime(match.id, match.scheduled_time)}
                            title={isAdmin ? "Klicken zum Bearbeiten" : ""}
                          >
                            {new Date(match.scheduled_time).toLocaleString("de-CH", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </>
                      )}
                      {match.field_number && (
                        <>
                          <MapPin className="w-4 h-4 ml-2" />
                          <span>Feld {match.field_number}</span>
                        </>
                      )}
                      <Badge variant="default" className="ml-2">
                        Spiel {match.match_number}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="font-semibold min-w-[120px]">
                          {homeTeam?.name || match.home_placeholder || "Team wird ermittelt"}
                        </span>
                        {isAdmin ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              className="w-16 text-center"
                              placeholder="0"
                              value={isEditing?.home || match.home_score?.toString() || ""}
                              onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                            />
                            <span className="text-muted-foreground">:</span>
                            <Input
                              type="number"
                              min="0"
                              className="w-16 text-center"
                              placeholder="0"
                              value={isEditing?.away || match.away_score?.toString() || ""}
                              onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="text-2xl font-bold">
                            {match.home_score ?? "-"} : {match.away_score ?? "-"}
                          </div>
                        )}
                        <span className="font-semibold min-w-[120px]">
                          {awayTeam?.name || match.away_placeholder || "Team wird ermittelt"}
                        </span>
                      </div>
                      {isAdmin && isEditing && (
                        <Button onClick={() => handleSaveScore(match.id)} size="sm">
                          Speichern
                        </Button>
                      )}
                      {!isAdmin && match.status === "completed" && (
                        <Badge variant="default" className="bg-green-600">
                          Beendet
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MatchList;
