import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface TeamScheduleProps {
  teamId: string;
  tournamentId: string;
}

export default function TeamSchedule({ teamId, tournamentId }: TeamScheduleProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [teamId, tournamentId]);

  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          group:tournament_groups(
            name,
            category:tournament_categories(name)
          )
        `)
        .eq("tournament_id", tournamentId)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order("scheduled_time", { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Spielplan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Lädt...</p>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Spielplan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Noch keine Spiele geplant</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Spielplan
        </CardTitle>
        <CardDescription>Deine Spiele im Turnier</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {matches.map((match) => {
            const isHomeTeam = match.home_team_id === teamId;
            const opponentTeam = isHomeTeam ? match.away_team : match.home_team;
            const myScore = isHomeTeam ? match.home_score : match.away_score;
            const opponentScore = isHomeTeam ? match.away_score : match.home_score;
            const categoryName = (match.group?.category as any)?.name || "";

            return (
              <div key={match.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{categoryName}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Feld {match.field_number}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(match.scheduled_time), "dd.MM.yyyy - HH:mm", {
                        locale: de,
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      match.status === "completed"
                        ? "default"
                        : match.status === "in_progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {match.status === "completed"
                      ? "Beendet"
                      : match.status === "in_progress"
                      ? "Läuft"
                      : "Geplant"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`font-semibold ${isHomeTeam ? "text-primary" : ""}`}>
                      {match.home_team.name}
                    </p>
                    <p className={`font-semibold ${!isHomeTeam ? "text-primary" : ""}`}>
                      {match.away_team.name}
                    </p>
                  </div>
                  {match.status === "completed" && (
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${isHomeTeam ? "text-primary" : ""}`}>
                        {match.home_score}
                      </p>
                      <p className={`text-2xl font-bold ${!isHomeTeam ? "text-primary" : ""}`}>
                        {match.away_score}
                      </p>
                    </div>
                  )}
                </div>

                {match.status === "completed" && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-sm text-center">
                      {myScore > opponentScore ? (
                        <span className="text-green-600 font-medium">Gewonnen</span>
                      ) : myScore < opponentScore ? (
                        <span className="text-red-600 font-medium">Verloren</span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Unentschieden</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
