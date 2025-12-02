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
  ko_phase_teams: number;
  ko_break_before_minutes: number;
  ko_break_between_minutes: number;
}

interface GeneratedMatch {
  home_team_id: string | null;
  away_team_id: string | null;
  group_id: string | null;
  scheduled_time: Date;
  field_number: number;
  match_number: number;
  match_type: string;
  homeTeamName?: string;
  awayTeamName?: string;
  groupName?: string;
  categoryName?: string;
  home_placeholder?: string;
  away_placeholder?: string;
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

  const generateKOMatchesForCategory = (
    categoryGroups: any[],
    teamsPerGroupAdvancing: number,
    categoryName: string,
    startTime: Date,
    startField: number,
    startMatchNumber: number,
    config: ScheduleConfig
  ): { matches: GeneratedMatch[]; endTime: Date; endField: number; endMatchNumber: number } => {
    const matches: GeneratedMatch[] = [];
    let currentTime = new Date(startTime);
    let currentField = startField;
    let matchNumber = startMatchNumber;

    // Calculate total qualifying teams for this category
    const numGroups = categoryGroups.length;
    const totalQualifyingTeams = numGroups * teamsPerGroupAdvancing;

    if (totalQualifyingTeams < 2) {
      return { matches: [], endTime: currentTime, endField: currentField, endMatchNumber: matchNumber };
    }

    // Generate seeded placeholders using proper seeding
    // 1st of Group A vs last qualifier of Group B, etc.
    const seededPlaceholders: { home: string; away: string }[] = [];
    
    // Create list of all qualifiers in seeded order
    const qualifiers: string[] = [];
    for (let pos = 1; pos <= teamsPerGroupAdvancing; pos++) {
      for (let g = 0; g < numGroups; g++) {
        const groupName = categoryGroups[g]?.name || `Gruppe ${g + 1}`;
        qualifiers.push(`${pos}. ${groupName}`);
      }
    }

    // Generate proper seeding for KO bracket
    // For power of 2: 1 vs last, 2 vs second-last, etc.
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalQualifyingTeams)));
    const byes = nextPowerOf2 - totalQualifyingTeams;

    // Create bracket with proper seeding
    const bracketSize = nextPowerOf2;
    const firstRoundMatches: { home: string | null; away: string | null }[] = [];
    
    // Standard bracket seeding
    for (let i = 0; i < bracketSize / 2; i++) {
      const seed1 = i + 1;
      const seed2 = bracketSize - i;
      
      const home = seed1 <= totalQualifyingTeams ? qualifiers[seed1 - 1] : null;
      const away = seed2 <= totalQualifyingTeams ? qualifiers[seed2 - 1] : null;
      
      firstRoundMatches.push({ home, away });
    }

    // Calculate rounds
    const rounds: { name: string; matchCount: number }[] = [];
    let remaining = bracketSize;
    
    while (remaining > 1) {
      let roundName = "";
      const actualTeamsInRound = remaining;
      if (actualTeamsInRound === 2) roundName = "final";
      else if (actualTeamsInRound === 4) roundName = "semifinal";
      else if (actualTeamsInRound === 8) roundName = "quarterfinal";
      else if (actualTeamsInRound === 16) roundName = "round_of_16";
      else roundName = "round_of_32";
      
      rounds.push({ name: roundName, matchCount: remaining / 2 });
      remaining = remaining / 2;
    }
    rounds.reverse();

    // Generate matches for each round
    let currentRoundPairings = firstRoundMatches;
    
    for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
      const round = rounds[roundIdx];
      const nextRoundPairings: { home: string | null; away: string | null }[] = [];

      for (let i = 0; i < currentRoundPairings.length; i++) {
        const pairing = currentRoundPairings[i];
        
        // Check for byes (one team is null)
        if (pairing.home === null && pairing.away !== null) {
          // Away team gets bye
          if (i % 2 === 0) {
            nextRoundPairings.push({ home: pairing.away, away: null });
          } else {
            const lastIdx = nextRoundPairings.length - 1;
            nextRoundPairings[lastIdx].away = pairing.away;
          }
          continue;
        }
        if (pairing.away === null && pairing.home !== null) {
          // Home team gets bye
          if (i % 2 === 0) {
            nextRoundPairings.push({ home: pairing.home, away: null });
          } else {
            const lastIdx = nextRoundPairings.length - 1;
            nextRoundPairings[lastIdx].away = pairing.home;
          }
          continue;
        }
        if (pairing.home === null && pairing.away === null) {
          continue;
        }

        // Both teams present - create match
        matches.push({
          home_team_id: null,
          away_team_id: null,
          group_id: null,
          scheduled_time: new Date(currentTime),
          field_number: currentField,
          match_number: matchNumber,
          match_type: round.name,
          homeTeamName: pairing.home!,
          awayTeamName: pairing.away!,
          groupName: "",
          categoryName: `${categoryName} - ${getKORoundName(round.name)}`,
          home_placeholder: pairing.home!,
          away_placeholder: pairing.away!
        });

        const winnerPlaceholder = `Sieger Spiel ${matchNumber}`;
        
        // Add to next round
        if (i % 2 === 0) {
          nextRoundPairings.push({ home: winnerPlaceholder, away: null });
        } else {
          const lastIdx = nextRoundPairings.length - 1;
          nextRoundPairings[lastIdx].away = winnerPlaceholder;
        }

        matchNumber++;

        // Move to next field or next time slot
        currentField++;
        if (currentField > config.number_of_fields) {
          currentField = 1;
          currentTime = addMinutes(
            currentTime,
            config.match_duration_minutes + config.ko_break_between_minutes
          );
        }
      }

      // Add break between KO rounds
      if (roundIdx < rounds.length - 1 && matches.length > 0) {
        if (currentField !== 1) {
          currentField = 1;
          currentTime = addMinutes(currentTime, config.match_duration_minutes);
        }
        currentTime = addMinutes(currentTime, config.ko_break_between_minutes);
      }

      currentRoundPairings = nextRoundPairings;
    }

    return { matches, endTime: currentTime, endField: currentField, endMatchNumber: matchNumber };
  };

  const getKORoundName = (roundType: string): string => {
    switch (roundType) {
      case "final": return "Finale";
      case "semifinal": return "Halbfinale";
      case "quarterfinal": return "Viertelfinale";
      case "round_of_16": return "Achtelfinale";
      case "round_of_32": return "Sechzehntelfinale";
      default: return "KO-Phase";
    }
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
            match_type: "group",
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

      // Generate KO phase matches if configured
      if (scheduleConfig.ko_phase_teams > 0) {
        // Add break before KO phase
        if (currentField !== 1) {
          currentField = 1;
          currentTime = addMinutes(currentTime, scheduleConfig.match_duration_minutes);
        }
        currentTime = addMinutes(currentTime, scheduleConfig.ko_break_before_minutes);

        // Group groups by category
        const groupsByCategory: Record<string, { groups: any[]; categoryName: string }> = {};
        for (const group of groups || []) {
          const categoryId = group.category_id;
          const categoryName = (group.category as any)?.name || "Kategorie";
          if (!groupsByCategory[categoryId]) {
            groupsByCategory[categoryId] = { groups: [], categoryName };
          }
          groupsByCategory[categoryId].groups.push(group);
        }

        // Calculate teams per group that advance (ko_phase_teams is total per category)
        // We need to determine how many from each group advance
        for (const categoryId of Object.keys(groupsByCategory)) {
          const { groups: categoryGroups, categoryName } = groupsByCategory[categoryId];
          const numGroupsInCategory = categoryGroups.length;
          
          // Teams per group advancing = ko_phase_teams / number of groups (rounded)
          const teamsPerGroupAdvancing = Math.ceil(scheduleConfig.ko_phase_teams / numGroupsInCategory);
          
          const result = generateKOMatchesForCategory(
            categoryGroups,
            teamsPerGroupAdvancing,
            categoryName,
            currentTime,
            currentField,
            matchNumber,
            scheduleConfig
          );
          
          generatedMatches.push(...result.matches);
          currentTime = result.endTime;
          currentField = result.endField;
          matchNumber = result.endMatchNumber;
          
          // Add break between categories
          if (result.matches.length > 0) {
            currentTime = addMinutes(currentTime, scheduleConfig.ko_break_between_minutes);
          }
        }
      }

      // Validate: Check if any team plays twice at the same time (only for group matches)
      const timeSlotTeams: Record<string, Set<string>> = {};
      for (const match of generatedMatches) {
        // Skip KO matches with placeholders
        if (!match.home_team_id || !match.away_team_id) continue;
        
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
        match_type: m.match_type,
        status: "scheduled",
        home_placeholder: m.home_placeholder || null,
        away_placeholder: m.away_placeholder || null,
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
                  <div className="space-y-1">
                    <p>{previewMatches.length} Spiele wurden generiert:</p>
                    <ul className="text-sm list-disc list-inside">
                      <li>{previewMatches.filter(m => m.match_type === 'group').length} Gruppenspiele</li>
                      {previewMatches.filter(m => m.match_type !== 'group').length > 0 && (
                        <li>{previewMatches.filter(m => m.match_type !== 'group').length} KO-Spiele (mit Platzhaltern)</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              {(() => {
                // Group matches by time slot
                const timeSlots = new Map<string, GeneratedMatch[]>();
                const sortedMatches = [...previewMatches].sort((a, b) => 
                  a.scheduled_time.getTime() - b.scheduled_time.getTime()
                );
                
                sortedMatches.forEach(match => {
                  const timeKey = format(match.scheduled_time, "HH:mm", { locale: de });
                  if (!timeSlots.has(timeKey)) {
                    timeSlots.set(timeKey, []);
                  }
                  timeSlots.get(timeKey)!.push(match);
                });

                // Get max field number
                const maxField = Math.max(...previewMatches.map(m => m.field_number));
                const fields = Array.from({ length: maxField }, (_, i) => i + 1);

                // Detect breaks (time gaps > normal match + break duration)
                const timeKeys = Array.from(timeSlots.keys());
                
                return (
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      {/* Header row with field numbers */}
                      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `80px repeat(${maxField}, minmax(180px, 1fr))` }}>
                        <div className="font-medium text-sm text-muted-foreground p-2">Zeit</div>
                        {fields.map(field => (
                          <div key={field} className="font-medium text-sm text-center p-2 bg-muted rounded">
                            Platz {field}
                          </div>
                        ))}
                      </div>

                      {/* Match rows by time slot */}
                      {timeKeys.map((timeKey, idx) => {
                        const matchesAtTime = timeSlots.get(timeKey)!;
                        const isKOPhase = matchesAtTime.some(m => m.match_type !== 'group');
                        
                        // Check for break before this slot
                        let showBreak = false;
                        if (idx > 0) {
                          const prevTime = timeSlots.get(timeKeys[idx - 1])![0].scheduled_time;
                          const currTime = matchesAtTime[0].scheduled_time;
                          const diffMinutes = (currTime.getTime() - prevTime.getTime()) / 60000;
                          // Show break indicator if gap is significantly larger than normal
                          if (diffMinutes > 30) {
                            showBreak = true;
                          }
                        }

                        return (
                          <div key={timeKey}>
                            {showBreak && (
                              <div className="grid gap-2 my-2" style={{ gridTemplateColumns: `80px repeat(${maxField}, minmax(180px, 1fr))` }}>
                                <div></div>
                                <div className="col-span-full text-center py-2 text-sm text-muted-foreground bg-muted/50 rounded border-dashed border">
                                  ⏸ Pause
                                </div>
                              </div>
                            )}
                            <div 
                              className="grid gap-2 mb-2" 
                              style={{ gridTemplateColumns: `80px repeat(${maxField}, minmax(180px, 1fr))` }}
                            >
                              <div className="text-sm font-medium p-2 flex items-center justify-center bg-muted/30 rounded">
                                {timeKey}
                              </div>
                              {fields.map(field => {
                                const match = matchesAtTime.find(m => m.field_number === field);
                                if (!match) {
                                  return <div key={field} className="p-2 border border-dashed rounded bg-muted/10"></div>;
                                }
                                return (
                                  <div 
                                    key={field} 
                                    className={`p-2 border rounded text-xs ${
                                      match.match_type !== 'group' 
                                        ? 'bg-accent/20 border-accent' 
                                        : 'bg-card'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-muted-foreground">#{match.match_number}</span>
                                      <Badge variant={match.match_type !== 'group' ? 'default' : 'outline'} className="text-[10px] px-1 py-0">
                                        {match.categoryName}
                                      </Badge>
                                    </div>
                                    {match.groupName && (
                                      <div className="text-muted-foreground text-[10px] mb-1">{match.groupName}</div>
                                    )}
                                    <div className="font-medium truncate" title={`${match.homeTeamName} vs ${match.awayTeamName}`}>
                                      {match.homeTeamName}
                                    </div>
                                    <div className="text-center text-muted-foreground">vs</div>
                                    <div className="font-medium truncate" title={`${match.homeTeamName} vs ${match.awayTeamName}`}>
                                      {match.awayTeamName}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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