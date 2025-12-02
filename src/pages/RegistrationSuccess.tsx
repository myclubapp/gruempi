import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ModernNavigation from "@/components/ModernNavigation";
import { CheckCircle2, Copy, Share2, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";

export default function RegistrationSuccess() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          tournament:tournaments(*),
          category:tournament_categories(*)
        `)
        .eq("id", teamId)
        .single();

      if (error) throw error;
      setTeam(data);
    } catch (error) {
      console.error("Error loading team:", error);
      toast.error("Fehler beim Laden der Team-Informationen");
    } finally {
      setLoading(false);
    }
  };

  const getRegistrationUrl = () => {
    if (!team) return "";
    return `${window.location.origin}/teams/${team.id}/register/${team.registration_token}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getRegistrationUrl());
      toast.success("Link in die Zwischenablage kopiert!");
    } catch (error) {
      toast.error("Fehler beim Kopieren des Links");
    }
  };

  const shareViaWhatsApp = () => {
    const message = `Hallo! Registriere dich jetzt für unser Team "${team.name}" beim Turnier "${team.tournament.name}":\n\n${getRegistrationUrl()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Team-Registrierung: ${team.name}`);
    const body = encodeURIComponent(
      `Hallo!\n\nDu wurdest eingeladen, dich als Spieler für unser Team "${team.name}" beim Turnier "${team.tournament.name}" zu registrieren.\n\nBitte nutze diesen Link, um deine Daten zu erfassen:\n${getRegistrationUrl()}\n\nWir freuen uns auf dich!\n\nTeam-Admin: ${team.contact_name}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Anmeldung erfolgreich!</h1>
          <p className="text-xl text-muted-foreground">
            Dein Team "{team.name}" wurde erfolgreich registriert
          </p>
        </div>

        {/* Team Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Team-Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Team</p>
                <p className="font-medium">{team.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kategorie</p>
                <p className="font-medium">{team.category.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Turnier</p>
                <p className="font-medium">{team.tournament.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Datum</p>
                <p className="font-medium">
                  {new Date(team.tournament.date).toLocaleDateString("de-CH")}
                </p>
              </div>
            </div>

            {team.payment_method === "qr_invoice" && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Nächste Schritte:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Prüfe deine Downloads für die QR-Rechnung</li>
                  <li>Bezahle das Startgeld bis zum Anmeldeschluss</li>
                  <li>Nach Zahlungseingang erhältst du eine Bestätigung</li>
                </ul>
              </div>
            )}

            {team.payment_method === "stripe" && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Zahlung wird verarbeitet. Du erhältst eine Bestätigung per E-Mail.
                </p>
              </div>
            )}

            {team.payment_method === "manual" && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Zahlungsinformation:</p>
                <p className="text-sm text-muted-foreground">
                  Bitte bezahle das Startgeld (CHF {team.tournament.entry_fee.toFixed(2)}) am
                  Turniertag vor Ort. Die Bestätigung erfolgt durch den Veranstalter.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player Registration Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Spieler-Registrierung
            </CardTitle>
            <CardDescription>
              Teile diesen Link mit deinen Teammitgliedern, damit sie sich selbst registrieren
              können
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link Display */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={getRegistrationUrl()}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-md"
              />
              <Button onClick={copyToClipboard} variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Share Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={shareViaWhatsApp}
                variant="outline"
                className="flex-1 gap-2"
                size="lg"
              >
                <MessageCircle className="w-4 h-4" />
                Per WhatsApp teilen
              </Button>
              <Button
                onClick={shareViaEmail}
                variant="outline"
                className="flex-1 gap-2"
                size="lg"
              >
                <Mail className="w-4 h-4" />
                Per E-Mail teilen
              </Button>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Wichtig:</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>
                  Spieler benötigen den Link, um sich zu registrieren (Vorname, Nachname, E-Mail,
                  Telefon)
                </li>
                <li>
                  Maximale Spieleranzahl: {team.category.min_players} -{" "}
                  {team.category.max_players} Spieler
                </li>
                <li>
                  Maximal {team.category.max_licensed_players} lizenzierte Spieler pro Team
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate(`/tournaments/${team.tournament_id}`)}>
            Zurück zum Turnier
          </Button>
          <Button onClick={() => navigate("/tournaments")}>Zu allen Turnieren</Button>
        </div>
      </main>
    </div>
  );
}
