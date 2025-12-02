import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

interface TeamStandingsProps {
  teamId: string;
  tournamentId: string;
}

interface Standing {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

export default function TeamStandings({ teamId, tournamentId }: TeamStandingsProps) {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStandings();
  }, [teamId, tournamentId]);

  const loadStandings = async () => {
    try {
      // First, get the team's group
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("team_group_assignments")
        .select(`
          group_id,
          group:tournament_groups(
            id,
            name,
            category:tournament_categories(name)
          )
        `)
        .eq("team_id", teamId)
        .single();

      if (assignmentError || !assignmentData) {
        setLoading(false);
        return;
      }

      const groupId = assignmentData.group_id;
      setGroupName((assignmentData.group as any)?.name || "");

      // Get all teams in this group
      const { data: teamsInGroup, error: teamsError } = await supabase
        .from("team_group_assignments")
        .select(`
          team_id,
          team:teams(id, name)
        `)
        .eq("group_id", groupId);

      if (teamsError) throw teamsError;

      const teamIds = teamsInGroup?.map((t) => t.team_id) || [];

      // Get all completed matches for this group
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("group_id", groupId)
        .eq("status", "completed");

      if (matchesError) throw matchesError;

      // Calculate standings
      const standingsMap: Record<string, Standing> = {};

      teamsInGroup?.forEach((t) => {
        const team = t.team as any;
        standingsMap[t.team_id] = {
          team_id: t.team_id,
          team_name: team.name,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        };
      });

      matches?.forEach((match) => {
        const homeTeam = standingsMap[match.home_team_id];
        const awayTeam = standingsMap[match.away_team_id];

        if (!homeTeam || !awayTeam) return;

        homeTeam.played++;
        awayTeam.played++;

        homeTeam.goals_for += match.home_score || 0;
        homeTeam.goals_against += match.away_score || 0;
        awayTeam.goals_for += match.away_score || 0;
        awayTeam.goals_against += match.home_score || 0;

        if (match.home_score > match.away_score) {
          homeTeam.won++;
          homeTeam.points += 3;
          awayTeam.lost++;
        } else if (match.home_score < match.away_score) {
          awayTeam.won++;
          awayTeam.points += 3;
          homeTeam.lost++;
        } else {
          homeTeam.drawn++;
          awayTeam.drawn++;
          homeTeam.points += 1;
          awayTeam.points += 1;
        }
      });

      // Calculate goal difference and sort
      const standingsArray = Object.values(standingsMap).map((s) => ({
        ...s,
        goal_difference: s.goals_for - s.goals_against,
      }));

      standingsArray.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference)
          return b.goal_difference - a.goal_difference;
        return b.goals_for - a.goals_for;
      });

      setStandings(standingsArray);
    } catch (error) {
      console.error("Error loading standings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tabelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Lädt...</p>
        </CardContent>
      </Card>
    );
  }

  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tabelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Team noch keiner Gruppe zugeordnet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Tabelle
        </CardTitle>
        <CardDescription>{groupName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Team</th>
                <th className="text-center py-2 px-2">Sp</th>
                <th className="text-center py-2 px-2">S</th>
                <th className="text-center py-2 px-2">U</th>
                <th className="text-center py-2 px-2">N</th>
                <th className="text-center py-2 px-2">Tore</th>
                <th className="text-center py-2 px-2">Diff</th>
                <th className="text-center py-2 px-2 font-bold">Pkt</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => {
                const isCurrentTeam = standing.team_id === teamId;
                return (
                  <tr
                    key={standing.team_id}
                    className={`border-b border-border ${
                      isCurrentTeam ? "bg-primary/10 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2 px-2">{index + 1}</td>
                    <td className="py-2 px-2 truncate max-w-[150px]">
                      {standing.team_name}
                    </td>
                    <td className="text-center py-2 px-2">{standing.played}</td>
                    <td className="text-center py-2 px-2">{standing.won}</td>
                    <td className="text-center py-2 px-2">{standing.drawn}</td>
                    <td className="text-center py-2 px-2">{standing.lost}</td>
                    <td className="text-center py-2 px-2">
                      {standing.goals_for}:{standing.goals_against}
                    </td>
                    <td
                      className={`text-center py-2 px-2 ${
                        standing.goal_difference > 0
                          ? "text-green-600"
                          : standing.goal_difference < 0
                          ? "text-red-600"
                          : ""
                      }`}
                    >
                      {standing.goal_difference > 0 ? "+" : ""}
                      {standing.goal_difference}
                    </td>
                    <td className="text-center py-2 px-2 font-bold">{standing.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
