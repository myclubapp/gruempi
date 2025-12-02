import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Play, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, addMinutes, parse } from "date-fns";
import { de } from "date-fns/locale";

interface MatchScheduleGeneratorProps {
  tournamentId: string;
}

interface Group {
  id: string;
  name: string;
  category_id: string;
}

interface Team {
  id: string;
  name: string;
}

interface TeamAssignment {
  team_id: string;
  group_id: string;
}

interface ScheduleConfig {
  match_duration_minutes: number;
  break_duration_minutes: number;
  number_of_fields: number;
}

interface GeneratedMatch {
  home_team_id: string;
  away_team_id: string;
  group_id: string;
  scheduled_time: Date;
  field_number: number;
  match_number: number;
  homeTeamName?: string;
  awayTeamName?: string;
  groupName?: string;
  categoryName?: string;
}

export default function MatchScheduleGenerator({ tournamentId }: MatchScheduleGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [previewMatches, setPreviewMatches] = useState<GeneratedMatch[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      const [tournamentRes, configRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
        supabase
          .from("tournament_schedule_config")
          .select("*")
          .eq("tournament_id", tournamentId)
          .maybeSingle(),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      if (configRes.error) throw configRes.error;

      setTournament(tournamentRes.data);
      setScheduleConfig(configRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Fehler beim Laden der Daten");
    }
  };

  const generateRoundRobin = (teamIds: string[]): [string, string][] => {
    const matches: [string, string][] = [];
    const n = teamIds.length;

    if (n < 2) return matches;

    // Handle odd number of teams by adding a dummy "bye" team
    const teams = [...teamIds];
    const isOdd = n % 2 === 1;
    if (isOdd) {
      teams.push("BYE");
    }

    const totalTeams = teams.length;
    const rounds = totalTeams - 1;
    const matchesPerRound = totalTeams / 2;

    // Round-robin algorithm
    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const home = (round + i) % (totalTeams - 1);
        const away = (totalTeams - 1 - i + round) % (totalTeams - 1);
        
        // Last team stays fixed, others rotate
        const homeTeam = i === 0 ? teams[totalTeams - 1] : teams[home];
        const awayTeam = teams[away];
        
        // Skip matches involving the "BYE" team
        if (homeTeam !== "BYE" && awayTeam !== "BYE") {
          matches.push([homeTeam, awayTeam]);
        }
      }
    }

    return matches;
  };

  const handleGenerateSchedule = async () => {
    if (!scheduleConfig) {
      toast.error("Bitte konfiguriere zuerst die Spielplan-Einstellungen");
      return;
    }

    if (!tournament?.start_time) {
      toast.error("Bitte setze eine Startzeit für das Turnier");
      return;
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      // Delete existing matches first
      await supabase.from("matches").delete().eq("tournament_id", tournamentId);
      // Load groups and team assignments
      const { data: groups, error: groupsError } = await supabase
        .from("tournament_groups")
        .select(`
          id, 
          name, 
          category_id,
          category:tournament_categories(id, name)
        `)
        .eq("tournament_id", tournamentId);

      if (groupsError) throw groupsError;

      const { data: assignments, error: assignmentsError } = await supabase
        .from("team_group_assignments")
        .select("team_id, group_id");

      if (assignmentsError) throw assignmentsError;

      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("tournament_id", tournamentId);

      if (teamsError) throw teamsError;

      // Create maps for quick lookups
      const teamsMap: Record<string, string> = {};
      teams?.forEach((t) => {
        teamsMap[t.id] = t.name;
      });

      const groupsMap: Record<string, { name: string; categoryName: string }> = {};
      groups?.forEach((g) => {
        groupsMap[g.id] = {
          name: g.name,
          categoryName: (g.category as any)?.name || ""
        };
      });

      // Group teams by group_id
      const teamsByGroup: Record<string, string[]> = {};
      assignments?.forEach((a) => {
        if (!teamsByGroup[a.group_id]) {
          teamsByGroup[a.group_id] = [];
        }
        teamsByGroup[a.group_id].push(a.team_id);
      });

      // Generate matches for each group (organized by round)
      const errors: string[] = [];
      const matchesByGroupAndRound: Record<string, Array<[string, string]>> = {};
      let maxRounds = 0;

      // First, generate all round-robin matches for each group
      for (const group of groups || []) {
        const groupTeams = teamsByGroup[group.id] || [];

        if (groupTeams.length < 2) {
          errors.push(`Gruppe ${group.name}: Zu wenige Teams (mindestens 2 benötigt)`);
          continue;
        }

        const roundRobinMatches = generateRoundRobin(groupTeams);
        const teamsCount = groupTeams.length;
        const roundsCount = teamsCount % 2 === 0 ? teamsCount - 1 : teamsCount;
        const matchesPerRound = Math.floor(teamsCount / 2);
        
        maxRounds = Math.max(maxRounds, roundsCount);

        // Organize matches by round for this group
        for (let round = 0; round < roundsCount; round++) {
          const key = `${group.id}_${round}`;
          matchesByGroupAndRound[key] = roundRobinMatches.slice(
            round * matchesPerRound,
            (round + 1) * matchesPerRound
          );
        }
      }

      // Now interleave matches from different categories/groups across time slots
      const generatedMatches: GeneratedMatch[] = [];
      let matchNumber = 1;
      let currentTime = parse(tournament.start_time, "HH:mm:ss", new Date(tournament.date));
      let currentField = 1;

      // Process round by round, mixing categories
      for (let round = 0; round < maxRounds; round++) {
        // Collect all matches from all groups for this round
        const roundMatches: Array<{ groupId: string; homeId: string; awayId: string }> = [];
        
        for (const group of groups || []) {
          const key = `${group.id}_${round}`;
          const matches = matchesByGroupAndRound[key];
          
          if (matches) {
            for (const [homeId, awayId] of matches) {
              roundMatches.push({ groupId: group.id, homeId, awayId });
            }
          }
        }

        // Schedule all matches in this round
        for (const match of roundMatches) {
          const groupInfo = groupsMap[match.groupId];
          
          generatedMatches.push({
            home_team_id: match.homeId,
            away_team_id: match.awayId,
            group_id: match.groupId,
            scheduled_time: new Date(currentTime),
            field_number: currentField,
            match_number: matchNumber++,
            homeTeamName: teamsMap[match.homeId] || "Unbekannt",
            awayTeamName: teamsMap[match.awayId] || "Unbekannt",
            groupName: groupInfo?.name || "",
            categoryName: groupInfo?.categoryName || ""
          });

          // Move to next field or next time slot
          currentField++;
          if (currentField > scheduleConfig.number_of_fields) {
            currentField = 1;
            currentTime = addMinutes(
              currentTime,
              scheduleConfig.match_duration_minutes + scheduleConfig.break_duration_minutes
            );
          }
        }
      }

      // Validate: Check if any team plays twice at the same time
      const timeSlotTeams: Record<string, Set<string>> = {};
      for (const match of generatedMatches) {
        const timeKey = match.scheduled_time.toISOString();
        if (!timeSlotTeams[timeKey]) {
          timeSlotTeams[timeKey] = new Set();
        }

        if (timeSlotTeams[timeKey].has(match.home_team_id)) {
          errors.push(`Team hat mehrere Spiele zur gleichen Zeit (${format(match.scheduled_time, "HH:mm", { locale: de })})`);
        }
        if (timeSlotTeams[timeKey].has(match.away_team_id)) {
          errors.push(`Team hat mehrere Spiele zur gleichen Zeit (${format(match.scheduled_time, "HH:mm", { locale: de })})`);
        }

        timeSlotTeams[timeKey].add(match.home_team_id);
        timeSlotTeams[timeKey].add(match.away_team_id);
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error("Fehler bei der Spielplan-Generierung");
        setLoading(false);
        return;
      }

      setPreviewMatches(generatedMatches);
      toast.success(`${generatedMatches.length} Spiele generiert`);
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Fehler beim Generieren des Spielplans");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (previewMatches.length === 0) {
      toast.error("Keine Spiele zum Speichern vorhanden");
      return;
    }

    setLoading(true);
    try {
      // Insert new matches
      const matchesToInsert = previewMatches.map((m) => ({
        tournament_id: tournamentId,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        group_id: m.group_id,
        scheduled_time: m.scheduled_time.toISOString(),
        field_number: m.field_number,
        match_number: m.match_number,
        match_type: "group",
        status: "scheduled",
      }));

      const { error } = await supabase.from("matches").insert(matchesToInsert);

      if (error) throw error;

      toast.success("Spielplan gespeichert");
      setPreviewMatches([]);
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Fehler beim Speichern des Spielplans");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Spielplan generieren
          </CardTitle>
          <CardDescription>
            Erstelle automatisch einen Spielplan basierend auf den Gruppen und Einstellungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateSchedule} disabled={loading}>
            <Play className="h-4 w-4 mr-2" />
            {loading ? "Generiere..." : "Spielplan generieren"}
          </Button>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {previewMatches.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  {previewMatches.length} Spiele wurden generiert. Überprüfe die Vorschau und speichere den Spielplan.
                </AlertDescription>
              </Alert>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {previewMatches.slice(0, 20).map((match, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        Spiel #{match.match_number} - Feld {match.field_number}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(match.scheduled_time, "HH:mm", { locale: de })}
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{match.categoryName}</Badge>
                        <span className="text-muted-foreground">{match.groupName}</span>
                      </div>
                      <div className="font-semibold">
                        {match.homeTeamName} vs {match.awayTeamName}
                      </div>
                    </div>
                  </div>
                ))}
                {previewMatches.length > 20 && (
                  <div className="text-center text-muted-foreground">
                    ... und {previewMatches.length - 20} weitere Spiele
                  </div>
                )}
              </div>

              <Button onClick={handleSaveSchedule} disabled={loading} className="w-full">
                Spielplan speichern
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}