import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Play, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, addMinutes, parse } from "date-fns";
import { de } from "date-fns/locale";
import ScheduleEditor from "./ScheduleEditor";

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
  const [isSaved, setIsSaved] = useState(false);

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

  interface KORound {
    categoryId: string;
    categoryName: string;
    roundName: string;
    roundIndex: number;
    pairings: { home: string; away: string; matchIndex: number; bracketPosIndex: number }[];
  }

  const generateKOBracketStructure = (
    categoryId: string,
    categoryName: string,
    categoryGroups: any[],
    teamsPerGroupAdvancing: number
  ): { rounds: KORound[]; totalMatches: number } => {
    const numGroups = categoryGroups.length;
    const totalQualifyingTeams = numGroups * teamsPerGroupAdvancing;

    if (totalQualifyingTeams < 2) {
      return { rounds: [], totalMatches: 0 };
    }

    // Create list of all qualifiers in seeded order (Swiss ranking)
    // First: all 1st place teams, then all 2nd place teams, etc.
    const qualifiers: string[] = [];
    for (let pos = 1; pos <= teamsPerGroupAdvancing; pos++) {
      for (let g = 0; g < numGroups; g++) {
        const groupName = categoryGroups[g]?.name || `Gruppe ${g + 1}`;
        qualifiers.push(`${pos}. ${groupName}`);
      }
    }

    // Calculate bracket size (next power of 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalQualifyingTeams)));
    const numByes = bracketSize - totalQualifyingTeams;

    // Generate proper bracket positions
    // Standard tournament seeding: 1 vs n, 2 vs n-1, etc. within bracket positions
    // Use recursive bracket position generation for proper structure
    const getBracketPositions = (size: number): number[] => {
      if (size === 1) return [1];
      const smaller = getBracketPositions(size / 2);
      return smaller.flatMap(pos => [pos, size + 1 - pos]);
    };

    const bracketPositions = getBracketPositions(bracketSize);
    
    // Create first round pairings based on bracket positions
    // Seeds 1 to totalQualifyingTeams are actual teams, rest are byes
    let currentRoundPairings: { home: string | null; away: string | null; bracketPos: number }[] = [];
    
    for (let i = 0; i < bracketSize / 2; i++) {
      const pos1 = bracketPositions[i * 2];
      const pos2 = bracketPositions[i * 2 + 1];
      
      const home = pos1 <= totalQualifyingTeams ? qualifiers[pos1 - 1] : null;
      const away = pos2 <= totalQualifyingTeams ? qualifiers[pos2 - 1] : null;
      
      currentRoundPairings.push({ home, away, bracketPos: i });
    }

    // Calculate round names
    const getRoundName = (teamsInRound: number): string => {
      if (teamsInRound === 2) return "final";
      if (teamsInRound === 4) return "semifinal";
      if (teamsInRound === 8) return "quarterfinal";
      if (teamsInRound === 16) return "round_of_16";
      return "round_of_32";
    };

    // Build all rounds
    const rounds: KORound[] = [];
    let remaining = bracketSize;
    let roundIndex = 0;
    let matchCounter = 0;

    while (remaining > 1) {
      const roundName = getRoundName(remaining);
      const round: KORound = {
        categoryId,
        categoryName,
        roundName,
        roundIndex,
        pairings: []
      };

      const nextRoundPairings: { home: string | null; away: string | null; bracketPos: number }[] = [];

      for (let i = 0; i < currentRoundPairings.length; i++) {
        const pairing = currentRoundPairings[i];
        const nextBracketPos = Math.floor(i / 2);

        // Handle byes - advance the non-null team to next round
        if (pairing.home === null && pairing.away !== null) {
          // Away team advances via bye
          if (i % 2 === 0) {
            nextRoundPairings.push({ home: pairing.away, away: null, bracketPos: nextBracketPos });
          } else {
            if (nextRoundPairings[nextRoundPairings.length - 1]) {
              nextRoundPairings[nextRoundPairings.length - 1].away = pairing.away;
            }
          }
          continue;
        }
        if (pairing.away === null && pairing.home !== null) {
          // Home team advances via bye
          if (i % 2 === 0) {
            nextRoundPairings.push({ home: pairing.home, away: null, bracketPos: nextBracketPos });
          } else {
            if (nextRoundPairings[nextRoundPairings.length - 1]) {
              nextRoundPairings[nextRoundPairings.length - 1].away = pairing.home;
            }
          }
          continue;
        }
        if (pairing.home === null && pairing.away === null) {
          continue;
        }

        // Both teams present - add match to round
        round.pairings.push({
          home: pairing.home!,
          away: pairing.away!,
          matchIndex: matchCounter++,
          bracketPosIndex: i  // Store the original bracket position for winner placeholder lookup
        });

        // Placeholder for next round
        const winnerPlaceholder = `__WINNER_${categoryId}_${roundIndex}_${i}__`;
        if (i % 2 === 0) {
          nextRoundPairings.push({ home: winnerPlaceholder, away: null, bracketPos: nextBracketPos });
        } else {
          if (nextRoundPairings[nextRoundPairings.length - 1]) {
            nextRoundPairings[nextRoundPairings.length - 1].away = winnerPlaceholder;
          }
        }
      }

      if (round.pairings.length > 0) {
        rounds.push(round);
      }

      currentRoundPairings = nextRoundPairings;
      remaining = remaining / 2;
      roundIndex++;
    }

    return { rounds, totalMatches: matchCounter };
  };

  const generateAllKOMatches = (
    groupsByCategory: Record<string, { groups: any[]; categoryName: string }>,
    teamsPerGroupAdvancing: number,
    startTime: Date,
    startField: number,
    startMatchNumber: number,
    config: ScheduleConfig
  ): GeneratedMatch[] => {
    const allMatches: GeneratedMatch[] = [];
    
    // Step 1: Generate bracket structure for all categories
    const categoryBrackets: { categoryId: string; rounds: KORound[] }[] = [];
    
    for (const categoryId of Object.keys(groupsByCategory)) {
      const { groups: categoryGroups, categoryName } = groupsByCategory[categoryId];
      const numGroupsInCategory = categoryGroups.length;
      const teamsAdvancing = Math.ceil(teamsPerGroupAdvancing / numGroupsInCategory) * numGroupsInCategory;
      const actualTeamsPerGroup = Math.ceil(teamsPerGroupAdvancing / numGroupsInCategory);
      
      const { rounds } = generateKOBracketStructure(
        categoryId,
        categoryName,
        categoryGroups,
        actualTeamsPerGroup
      );
      
      if (rounds.length > 0) {
        categoryBrackets.push({ categoryId, rounds });
      }
    }

    if (categoryBrackets.length === 0) {
      return [];
    }

    // Step 2: Find the maximum number of rounds across all categories
    const maxRounds = Math.max(...categoryBrackets.map(cb => cb.rounds.length));

    // Step 3: Schedule round by round, all categories for each round
    let currentTime = new Date(startTime);
    let currentField = startField;
    let matchNumber = startMatchNumber;
    
    // Map to track match numbers for winner placeholders
    const matchNumberMap: Record<string, number> = {};

    for (let roundIdx = 0; roundIdx < maxRounds; roundIdx++) {
      // Add break between rounds (except before first round)
      if (roundIdx > 0) {
        if (currentField !== 1) {
          currentField = 1;
          currentTime = addMinutes(currentTime, config.match_duration_minutes);
        }
        currentTime = addMinutes(currentTime, config.ko_break_between_minutes);
      }

      // Schedule all categories for this round
      // Collect all pairings first, then sort to prioritize rest for teams from previous round
      const allRoundPairings: { 
        categoryId: string; 
        categoryRoundIdx: number;
        round: KORound; 
        pairing: { home: string; away: string; matchIndex: number; bracketPosIndex: number };
        hasWinnerPlaceholder: boolean;
      }[] = [];

      for (const { categoryId, rounds } of categoryBrackets) {
        // Find the corresponding round for this category
        // Categories with fewer rounds should skip early rounds
        const categoryMaxRounds = rounds.length;
        const roundOffset = maxRounds - categoryMaxRounds;
        const categoryRoundIdx = roundIdx - roundOffset;

        if (categoryRoundIdx < 0 || categoryRoundIdx >= rounds.length) {
          continue;
        }

        const round = rounds[categoryRoundIdx];

        for (const pairing of round.pairings) {
          // Check if this pairing involves a winner from previous round
          const hasWinnerPlaceholder = pairing.home.startsWith("__WINNER_") || pairing.away.startsWith("__WINNER_");
          
          allRoundPairings.push({
            categoryId,
            categoryRoundIdx,
            round,
            pairing,
            hasWinnerPlaceholder
          });
        }
      }

      // Sort pairings: within each category, matches WITHOUT winner placeholders first (teams have rest)
      // matches WITH winner placeholders last (to give those teams a break)
      // First group by category, then sort within category
      allRoundPairings.sort((a, b) => {
        // First, maintain category order
        if (a.categoryId !== b.categoryId) {
          return 0; // Keep original category order
        }
        // Within the same category: non-winner matches first
        if (a.hasWinnerPlaceholder && !b.hasWinnerPlaceholder) return 1;
        if (!a.hasWinnerPlaceholder && b.hasWinnerPlaceholder) return -1;
        return 0;
      });

      // Now schedule the sorted pairings
      for (const { categoryId, categoryRoundIdx, round, pairing } of allRoundPairings) {
        // Replace winner placeholders with actual match numbers
        let homeName = pairing.home;
        let awayName = pairing.away;

        if (homeName.startsWith("__WINNER_")) {
          const key = homeName;
          if (matchNumberMap[key]) {
            homeName = `Sieger Spiel ${matchNumberMap[key]}`;
          } else {
            // Fallback: show generic winner text if match number not found yet
            homeName = "Sieger Vorrunde";
          }
        }
        if (awayName.startsWith("__WINNER_")) {
          const key = awayName;
          if (matchNumberMap[key]) {
            awayName = `Sieger Spiel ${matchNumberMap[key]}`;
          } else {
            // Fallback: show generic winner text if match number not found yet
            awayName = "Sieger Vorrunde";
          }
        }

        allMatches.push({
          home_team_id: null,
          away_team_id: null,
          group_id: null,
          scheduled_time: new Date(currentTime),
          field_number: currentField,
          match_number: matchNumber,
          match_type: round.roundName,
          homeTeamName: homeName,
          awayTeamName: awayName,
          groupName: "",
          categoryName: `${round.categoryName} - ${getKORoundName(round.roundName)}`,
          home_placeholder: homeName,
          away_placeholder: awayName
        });

        // Store match number for winner placeholder lookups using bracketPosIndex
        matchNumberMap[`__WINNER_${categoryId}_${categoryRoundIdx}_${pairing.bracketPosIndex}__`] = matchNumber;

        matchNumber++;
        currentField++;
        if (currentField > config.number_of_fields) {
          currentField = 1;
          currentTime = addMinutes(
            currentTime,
            config.match_duration_minutes + config.ko_break_between_minutes
          );
        }
      }
    }

    return allMatches;
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
    setIsSaved(false);
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
        // Calculate KO start time based on when the last group match ends
        // Avoid double-adding breaks by using the last match end time directly
        const lastGroupMatch = generatedMatches[generatedMatches.length - 1];
        const lastGroupMatchEnd = lastGroupMatch 
          ? addMinutes(lastGroupMatch.scheduled_time, scheduleConfig.match_duration_minutes)
          : currentTime;
        
        // KO phase starts after the ko_break_before_minutes pause
        currentTime = addMinutes(lastGroupMatchEnd, scheduleConfig.ko_break_before_minutes);
        currentField = 1;

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

        // Generate all KO matches across categories, round by round
        const koMatches = generateAllKOMatches(
          groupsByCategory,
          scheduleConfig.ko_phase_teams,
          currentTime,
          currentField,
          matchNumber,
          scheduleConfig
        );
        
        generatedMatches.push(...koMatches);
        if (koMatches.length > 0) {
          matchNumber += koMatches.length;
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
      // If already saved, update existing matches
      if (isSaved) {
        // Delete existing matches first, then insert updated ones
        const { error: deleteError } = await supabase
          .from("matches")
          .delete()
          .eq("tournament_id", tournamentId);
        
        if (deleteError) throw deleteError;
      }

      // Insert matches
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

      toast.success(isSaved ? "Änderungen gespeichert" : "Spielplan gespeichert");
      setIsSaved(true);
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
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Tipp: Klicke auf eine Zeit um sie zu ändern. Ziehe Spiele per Drag & Drop um sie zu tauschen.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <ScheduleEditor
                matches={previewMatches}
                onMatchesChange={setPreviewMatches}
                onSave={handleSaveSchedule}
                loading={loading}
                isSaved={isSaved}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}