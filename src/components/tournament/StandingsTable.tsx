import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StandingsTableProps {
  tournamentId: string;
  categoryId: string;
}

interface TeamStats {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

const StandingsTable = ({ tournamentId, categoryId }: StandingsTableProps) => {
  const [standingsByGroup, setStandingsByGroup] = useState<Record<string, TeamStats[]>>({});
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStandings();
  }, [tournamentId, categoryId]);

  const loadStandings = async () => {
    setLoading(true);

    // Load groups for this category
    const { data: groupsData } = await supabase
      .from("tournament_groups")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("category_id", categoryId)
      .order("name");

    if (!groupsData) {
      setLoading(false);
      return;
    }

    setGroups(groupsData);

    // Load teams
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("tournament_id", tournamentId)
      .eq("category_id", categoryId);

    if (!teamsData) {
      setLoading(false);
      return;
    }

    // Load team assignments
    const { data: assignmentsData } = await supabase
      .from("team_group_assignments")
      .select("team_id, group_id")
      .in("team_id", teamsData.map(t => t.id));

    // Load completed matches
    const groupIds = groupsData.map(g => g.id);
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "completed")
      .in("group_id", groupIds);

    // Calculate standings for each group
    const standings: Record<string, TeamStats[]> = {};

    groupsData.forEach((group) => {
      const groupTeams = assignmentsData?.filter(a => a.group_id === group.id).map(a => a.team_id) || [];
      const groupMatches = matchesData?.filter(m => m.group_id === group.id) || [];

      const teamStats: Record<string, TeamStats> = {};

      // Initialize stats for all teams in group
      groupTeams.forEach((teamId) => {
        const team = teamsData.find(t => t.id === teamId);
        if (team) {
          teamStats[teamId] = {
            teamId,
            teamName: team.name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
          };
        }
      });

      // Calculate stats from matches
      groupMatches.forEach((match) => {
        if (match.home_score === null || match.away_score === null) return;

        const homeStats = teamStats[match.home_team_id];
        const awayStats = teamStats[match.away_team_id];

        if (!homeStats || !awayStats) return;

        homeStats.played++;
        awayStats.played++;

        homeStats.goalsFor += match.home_score;
        homeStats.goalsAgainst += match.away_score;
        awayStats.goalsFor += match.away_score;
        awayStats.goalsAgainst += match.home_score;

        if (match.home_score > match.away_score) {
          homeStats.won++;
          homeStats.points += 3;
          awayStats.lost++;
        } else if (match.home_score < match.away_score) {
          awayStats.won++;
          awayStats.points += 3;
          homeStats.lost++;
        } else {
          homeStats.drawn++;
          awayStats.drawn++;
          homeStats.points += 1;
          awayStats.points += 1;
        }

        homeStats.goalDifference = homeStats.goalsFor - homeStats.goalsAgainst;
        awayStats.goalDifference = awayStats.goalsFor - awayStats.goalsAgainst;
      });

      // Sort by points, then goal difference, then goals scored
      const sortedStats = Object.values(teamStats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      standings[group.id] = sortedStats;
    });

    setStandingsByGroup(standings);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">Noch keine Gruppen erstellt</p>
        <p className="text-sm">Erstellen Sie zuerst Gruppen und weisen Sie Teams zu</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const stats = standingsByGroup[group.id] || [];
        
        if (stats.length === 0) return null;

        return (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">Sp</TableHead>
                    <TableHead className="text-center">S</TableHead>
                    <TableHead className="text-center">U</TableHead>
                    <TableHead className="text-center">N</TableHead>
                    <TableHead className="text-center">Tore</TableHead>
                    <TableHead className="text-center">Diff</TableHead>
                    <TableHead className="text-center font-bold">Pkt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat, index) => (
                    <TableRow key={stat.teamId}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-semibold">{stat.teamName}</TableCell>
                      <TableCell className="text-center">{stat.played}</TableCell>
                      <TableCell className="text-center">{stat.won}</TableCell>
                      <TableCell className="text-center">{stat.drawn}</TableCell>
                      <TableCell className="text-center">{stat.lost}</TableCell>
                      <TableCell className="text-center">
                        {stat.goalsFor}:{stat.goalsAgainst}
                      </TableCell>
                      <TableCell className="text-center">
                        {stat.goalDifference > 0 ? '+' : ''}{stat.goalDifference}
                      </TableCell>
                      <TableCell className="text-center font-bold">{stat.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StandingsTable;
