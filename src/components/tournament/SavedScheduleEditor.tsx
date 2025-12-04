import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ScheduleEditor, { ScheduleMatch } from "./ScheduleEditor";

interface SavedScheduleEditorProps {
  tournamentId: string;
}

interface Team {
  id: string;
  name: string;
  category_id: string;
}

interface Group {
  id: string;
  name: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function SavedScheduleEditor({ tournamentId }: SavedScheduleEditorProps) {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, [tournamentId]);

  const loadSchedule = async () => {
    setLoading(true);

    // Load all necessary data
    const [matchesResult, teamsResult, groupsResult, categoriesResult] = await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("scheduled_time")
        .order("match_number"),
      supabase
        .from("teams")
        .select("id, name, category_id")
        .eq("tournament_id", tournamentId),
      supabase
        .from("tournament_groups")
        .select("id, name, category_id")
        .eq("tournament_id", tournamentId),
      supabase
        .from("tournament_categories")
        .select("id, name")
        .eq("tournament_id", tournamentId),
    ]);

    const teamsMap = new Map<string, Team>();
    teamsResult.data?.forEach((t) => teamsMap.set(t.id, t));

    const groupsMap = new Map<string, Group>();
    groupsResult.data?.forEach((g) => groupsMap.set(g.id, g));

    const categoriesMap = new Map<string, Category>();
    categoriesResult.data?.forEach((c) => categoriesMap.set(c.id, c));

    // Transform matches to ScheduleMatch format
    const scheduleMatches: ScheduleMatch[] = (matchesResult.data || []).map((m) => {
      const homeTeam = m.home_team_id ? teamsMap.get(m.home_team_id) : null;
      const awayTeam = m.away_team_id ? teamsMap.get(m.away_team_id) : null;
      const group = m.group_id ? groupsMap.get(m.group_id) : null;
      const category = group ? categoriesMap.get(group.category_id) : 
                       homeTeam ? categoriesMap.get(homeTeam.category_id) : null;

      return {
        id: m.id,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        group_id: m.group_id,
        scheduled_time: new Date(m.scheduled_time),
        field_number: m.field_number || 1,
        match_number: m.match_number,
        match_type: m.match_type,
        homeTeamName: homeTeam?.name || m.home_placeholder || "TBD",
        awayTeamName: awayTeam?.name || m.away_placeholder || "TBD",
        groupName: group?.name,
        categoryName: category?.name,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      };
    });

    setMatches(scheduleMatches);
    setLoading(false);
  };

  const handleMatchesChange = (updatedMatches: ScheduleMatch[]) => {
    setMatches(updatedMatches);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Update all matches
      for (const match of matches) {
        const { error } = await supabase
          .from("matches")
          .update({
            scheduled_time: match.scheduled_time.toISOString(),
            field_number: match.field_number,
          })
          .eq("id", match.id);

        if (error) {
          throw error;
        }
      }

      toast.success("Spielplan gespeichert!");
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Fehler beim Speichern des Spielplans");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Noch kein Spielplan erstellt</p>
            <p className="text-sm">Generiere zuerst einen Spielplan oben</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spielplan bearbeiten</CardTitle>
        <CardDescription>
          Klicke auf eine Zeit um sie zu ändern, oder ziehe Spiele per Drag & Drop
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScheduleEditor
          matches={matches}
          onMatchesChange={handleMatchesChange}
          onSave={handleSave}
          loading={saving}
          isSaved={true}
        />
      </CardContent>
    </Card>
  );
}
