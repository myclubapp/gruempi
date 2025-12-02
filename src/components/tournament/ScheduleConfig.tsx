import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Trophy, Target } from "lucide-react";

interface ScheduleConfigProps {
  tournamentId: string;
}

interface ScheduleConfig {
  id?: string;
  tournament_id: string;
  match_duration_minutes: number;
  break_duration_minutes: number;
  number_of_fields: number;
  ranking_mode: string;
  ko_phase_teams: number;
  ko_break_before_minutes: number;
  ko_break_between_minutes: number;
}

const rankingModes = [
  { value: "points_goal_diff_direct", label: "Punkte → Tordifferenz → Direktvergleich (Fussball/Handball)" },
  { value: "points_set_diff_direct", label: "Punkte → Satzdifferenz → Direktvergleich (Volleyball/Unihockey)" },
  { value: "points_direct_goal_diff", label: "Punkte → Direktvergleich → Tordifferenz" },
  { value: "points_direct_set_diff", label: "Punkte → Direktvergleich → Satzdifferenz" },
];

const koPhaseOptions = [
  { value: 0, label: "Keine KO-Phase (nur Gruppenphase)" },
  { value: 2, label: "Finale (Top 2)" },
  { value: 4, label: "Halbfinale (Top 4)" },
  { value: 8, label: "Viertelfinale (Top 8)" },
  { value: 16, label: "Achtelfinale (Top 16)" },
  { value: 32, label: "Sechzehntelfinale (Top 32)" },
];

export default function ScheduleConfig({ tournamentId }: ScheduleConfigProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    tournament_id: tournamentId,
    match_duration_minutes: 20,
    break_duration_minutes: 5,
    number_of_fields: 1,
    ranking_mode: "points_goal_diff_direct",
    ko_phase_teams: 0,
    ko_break_before_minutes: 15,
    ko_break_between_minutes: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [tournamentId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_schedule_config")
        .select("*")
        .eq("tournament_id", tournamentId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error("Error loading schedule config:", error);
      toast.error("Fehler beim Laden der Spielplan-Konfiguration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from("tournament_schedule_config")
          .update({
            match_duration_minutes: config.match_duration_minutes,
            break_duration_minutes: config.break_duration_minutes,
            number_of_fields: config.number_of_fields,
            ranking_mode: config.ranking_mode,
            ko_phase_teams: config.ko_phase_teams,
            ko_break_before_minutes: config.ko_break_before_minutes,
            ko_break_between_minutes: config.ko_break_between_minutes,
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tournament_schedule_config")
          .insert([config])
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      }

      toast.success("Spielplan-Konfiguration gespeichert");
    } catch (error) {
      console.error("Error saving schedule config:", error);
      toast.error("Fehler beim Speichern der Konfiguration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Zeitplanung
          </CardTitle>
          <CardDescription>
            Definiere die zeitlichen Parameter für den Spielplan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="match_duration">Spieldauer (Minuten)</Label>
              <Input
                id="match_duration"
                type="number"
                min="1"
                value={config.match_duration_minutes}
                onChange={(e) =>
                  setConfig({ ...config, match_duration_minutes: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break_duration">Pause zwischen Spielen (Minuten)</Label>
              <Input
                id="break_duration"
                type="number"
                min="0"
                value={config.break_duration_minutes}
                onChange={(e) =>
                  setConfig({ ...config, break_duration_minutes: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_fields">Anzahl Spielfelder</Label>
              <Input
                id="number_of_fields"
                type="number"
                min="1"
                value={config.number_of_fields}
                onChange={(e) =>
                  setConfig({ ...config, number_of_fields: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ranglisten-Modus
          </CardTitle>
          <CardDescription>
            Wähle das Wertungssystem für die Ranglistenberechnung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="ranking_mode">Wertungssystem</Label>
            <Select
              value={config.ranking_mode}
              onValueChange={(value) => setConfig({ ...config, ranking_mode: value })}
            >
              <SelectTrigger id="ranking_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rankingModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            KO-Phase
          </CardTitle>
          <CardDescription>
            Definiere, wie viele Teams in die KO-Phase kommen. Bei ungeraden Zahlen erhalten die besten Gruppensieger ein Freilos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ko_phase">KO-Phase Teilnehmer</Label>
              <Select
                value={config.ko_phase_teams.toString()}
                onValueChange={(value) => setConfig({ ...config, ko_phase_teams: parseInt(value) })}
              >
                <SelectTrigger id="ko_phase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {koPhaseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {config.ko_phase_teams > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ko_break_before">Pause vor KO-Phase (Minuten)</Label>
                    <Input
                      id="ko_break_before"
                      type="number"
                      min="0"
                      value={config.ko_break_before_minutes}
                      onChange={(e) =>
                        setConfig({ ...config, ko_break_before_minutes: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ko_break_between">Pause zwischen KO-Spielen (Minuten)</Label>
                    <Input
                      id="ko_break_between"
                      type="number"
                      min="0"
                      value={config.ko_break_between_minutes}
                      onChange={(e) =>
                        setConfig({ ...config, ko_break_between_minutes: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-sm space-y-2 mt-4">
                  <p className="font-medium">Hinweis zur KO-Phase:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Die besten Teams aus allen Gruppen kommen weiter</li>
                    <li>Bei 6 Teams (Viertelfinale): 2 beste Teams erhalten Freilos, 4 Teams spielen Viertelfinale</li>
                    <li>Bei 12 Teams (Achtelfinale): 4 beste Teams erhalten Freilos, 8 Teams spielen Achtelfinale</li>
                    <li>Sortierung: Punkte → Tordifferenz → Erzielte Tore (gemäss Ranglisten-Modus)</li>
                    <li>KO-Spiele werden mit Platzhaltern generiert und nach Abschluss der Gruppenphase aktualisiert</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Speichern..." : "Konfiguration speichern"}
        </Button>
      </div>
    </div>
  );
}