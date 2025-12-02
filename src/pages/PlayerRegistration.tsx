import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import ModernNavigation from "@/components/ModernNavigation";
import { ArrowLeft, Users } from "lucide-react";
import { z } from "zod";
import TeamSchedule from "@/components/tournament/TeamSchedule";
import TeamStandings from "@/components/tournament/TeamStandings";

const playerSchema = z.object({
  first_name: z.string().trim().min(1, "Vorname ist erforderlich").max(100, "Vorname zu lang"),
  last_name: z.string().trim().min(1, "Nachname ist erforderlich").max(100, "Nachname zu lang"),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255, "E-Mail zu lang"),
  phone: z.string().trim().min(1, "Telefonnummer ist erforderlich").max(50, "Telefonnummer zu lang"),
  jersey_number: z.string().optional(),
  position: z.string().trim().max(50, "Position zu lang").optional(),
  license_number: z.string().trim().max(50, "Lizenznummer zu lang").optional(),
  is_licensed: z.boolean(),
});

export default function PlayerRegistration() {
  const { teamId, token } = useParams<{ teamId: string; token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [existingPlayers, setExistingPlayers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    jersey_number: "",
    position: "",
    license_number: "",
    is_licensed: false,
  });

  useEffect(() => {
    validateTokenAndLoadTeam();
  }, [teamId, token]);

  const validateTokenAndLoadTeam = async () => {
    try {
      setValidating(true);

      // Verify token and load team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select(`
          *,
          tournament:tournaments(*),
          category:tournament_categories(*)
        `)
        .eq("id", teamId)
        .eq("registration_token", token)
        .single();

      if (teamError || !teamData) {
        toast.error("Ungültiger oder abgelaufener Registrierungslink");
        navigate("/tournaments");
        return;
      }

      setTeam(teamData);

      // Load existing players
      const { data: playersData } = await supabase
        .from("team_players")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });

      setExistingPlayers(playersData || []);
    } catch (error) {
      console.error("Error validating token:", error);
      toast.error("Fehler beim Laden der Team-Informationen");
      navigate("/tournaments");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    try {
      playerSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
        return;
      }
    }

    // Check if category limits reached
    if (team.category && existingPlayers.length >= team.category.max_players) {
      toast.error(`Maximale Spieleranzahl (${team.category.max_players}) bereits erreicht`);
      return;
    }

    // Check licensed players limit
    if (formData.is_licensed) {
      const licensedCount = existingPlayers.filter((p) => p.is_licensed).length;
      if (licensedCount >= team.category.max_licensed_players) {
        toast.error(
          `Maximale Anzahl lizenzierter Spieler (${team.category.max_licensed_players}) bereits erreicht`
        );
        return;
      }
    }

    setLoading(true);

    try {
      // Create player with validated data
      const { error } = await supabase.from("team_players").insert({
        team_id: teamId,
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
        position: formData.position?.trim() || null,
        license_number: formData.license_number?.trim() || null,
        is_licensed: formData.is_licensed,
      });

      if (error) throw error;

      toast.success("Erfolgreich registriert!");

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        jersey_number: "",
        position: "",
        license_number: "",
        is_licensed: false,
      });

      // Reload players list
      await validateTokenAndLoadTeam();
    } catch (error: any) {
      console.error("Error registering player:", error);
      toast.error("Fehler bei der Registrierung: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validiere Registrierungslink...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ModernNavigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/tournaments")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zu Turnieren
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Spieler-Registrierung</h1>
          <p className="text-xl text-muted-foreground">
            {team.tournament.name} - Team {team.name}
          </p>
        </div>

        {/* Team & Tournament Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team-Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Kategorie:</span>
                <p className="font-medium">{team.category.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Turnier-Datum:</span>
                <p className="font-medium">
                  {new Date(team.tournament.date).toLocaleDateString("de-CH")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Registrierte Spieler:</span>
                <p className="font-medium">
                  {existingPlayers.length} / {team.category.max_players}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Lizenzierte Spieler:</span>
                <p className="font-medium">
                  {existingPlayers.filter((p) => p.is_licensed).length} /{" "}
                  {team.category.max_licensed_players}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Players */}
        {existingPlayers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Registrierte Spieler</CardTitle>
              <CardDescription>
                Diese Spieler sind bereits für das Team registriert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {existingPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {player.jersey_number && <span>Nr. {player.jersey_number}</span>}
                          {player.position && <span>{player.position}</span>}
                          {player.is_licensed && (
                            <span className="text-primary">Lizenziert</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Schedule and Standings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TeamSchedule teamId={teamId!} tournamentId={team.tournament.id} />
          <TeamStandings teamId={teamId!} tournamentId={team.tournament.id} />
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Spieler hinzufügen</CardTitle>
              <CardDescription>
                Gib deine persönlichen Daten ein, um dich als Spieler zu registrieren
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={255}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={50}
                    required
                  />
                </div>
              </div>

              {/* Player Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jersey_number">Trikotnummer</Label>
                  <Input
                    id="jersey_number"
                    type="number"
                    value={formData.jersey_number}
                    onChange={(e) =>
                      setFormData({ ...formData, jersey_number: e.target.value })
                    }
                    min="1"
                    max="999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <select
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Bitte wählen...</option>
                    <option value="goalie">Goalie</option>
                    <option value="field">Feldspieler</option>
                  </select>
                </div>
              </div>

              {/* Licensed Player */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={formData.is_licensed}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_licensed: checked as boolean })
                    }
                    id="is_licensed"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="is_licensed" className="cursor-pointer">
                      Lizenzierter Spieler
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Ich bin im Besitz einer gültigen Spielerlizenz
                    </p>
                  </div>
                </div>

                {formData.is_licensed && (
                  <div className="space-y-2 ml-7">
                    <Label htmlFor="license_number">Lizenznummer</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) =>
                        setFormData({ ...formData, license_number: e.target.value })
                      }
                      maxLength={50}
                      placeholder="z.B. 123456"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? "Wird registriert..." : "Spieler registrieren"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
