import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Users, Settings as SettingsIcon, Award } from "lucide-react";
import { toast } from "sonner";
import DomainSettings from "@/components/tournament/DomainSettings";
import SponsorManagement from "@/components/tournament/SponsorManagement";

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  status: string;
  entry_fee: number;
  custom_domain: string | null;
  domain_status: string;
  domain_verification_token: string | null;
}

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Fehler beim Laden des Turniers");
      navigate("/dashboard");
    } else {
      setTournament(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      published: "default",
      ongoing: "default",
      completed: "outline",
    };
    const labels: Record<string, string> = {
      draft: "Entwurf",
      published: "Veröffentlicht",
      ongoing: "Laufend",
      completed: "Abgeschlossen",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const updateStatus = async (newStatus: string) => {
    if (!tournament) return;

    const { error } = await supabase
      .from("tournaments")
      .update({ status: newStatus })
      .eq("id", tournament.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren des Status");
    } else {
      toast.success("Status aktualisiert");
      setTournament({ ...tournament, status: newStatus });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zum Dashboard
            </Button>
            <div className="flex items-center gap-2">
              {getStatusBadge(tournament.status)}
              {tournament.status === "draft" && (
                <Button
                  variant="hero"
                  onClick={() => updateStatus("published")}
                >
                  Veröffentlichen
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {tournament.name}
          </h1>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <span>📅 {new Date(tournament.date).toLocaleDateString("de-CH")}</span>
            <span>📍 {tournament.location}</span>
            <span>💰 CHF {tournament.entry_fee.toFixed(2)}</span>
            {tournament.custom_domain && (
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {tournament.custom_domain}
              </span>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsoren</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Angemeldete Teams
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Noch keine Anmeldungen
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Einnahmen
                  </CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">CHF 0.00</div>
                  <p className="text-xs text-muted-foreground">
                    Keine Zahlungen
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Domain Status
                  </CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {tournament.domain_status === "not_configured"
                      ? "Nicht konfiguriert"
                      : tournament.domain_status}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tournament.custom_domain || "Keine Domain verknüpft"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {tournament.status === "draft" && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Nächste Schritte</CardTitle>
                  <CardDescription>
                    Vervollständigen Sie Ihr Turnier-Setup
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Domain verknüpfen (optional)</h4>
                      <p className="text-sm text-muted-foreground">
                        Verbinden Sie eine eigene Domain für Ihr Turnier
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Sponsoren hinzufügen</h4>
                      <p className="text-sm text-muted-foreground">
                        Fügen Sie Ihre Turnier-Sponsoren hinzu
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Turnier veröffentlichen</h4>
                      <p className="text-sm text-muted-foreground">
                        Machen Sie Ihr Turnier öffentlich für Anmeldungen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <CardTitle>Angemeldete Teams</CardTitle>
                <CardDescription>
                  Verwalten Sie die Team-Anmeldungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Noch keine Teams angemeldet</p>
                  {tournament.status === "draft" && (
                    <p className="text-sm mt-2">
                      Veröffentlichen Sie das Turnier, um Anmeldungen zu ermöglichen
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain">
            <DomainSettings
              tournament={tournament}
              onUpdate={loadTournament}
            />
          </TabsContent>

          <TabsContent value="sponsors">
            <SponsorManagement tournamentId={tournament.id} />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Turnier-Einstellungen</CardTitle>
                <CardDescription>
                  Verwalten Sie die Einstellungen Ihres Turniers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Status</h4>
                    <div className="flex gap-2">
                      {["draft", "published", "ongoing", "completed"].map((status) => (
                        <Button
                          key={status}
                          variant={tournament.status === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateStatus(status)}
                        >
                          {status === "draft" && "Entwurf"}
                          {status === "published" && "Veröffentlicht"}
                          {status === "ongoing" && "Laufend"}
                          {status === "completed" && "Abgeschlossen"}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TournamentDetail;
