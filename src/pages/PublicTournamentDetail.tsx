import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Clock, FileText, Award } from "lucide-react";
import { toast } from "sonner";
import ModernNavigation from "@/components/ModernNavigation";
import ModernFooter from "@/components/ModernFooter";
import TeamRegistrationForm from "@/components/tournament/TeamRegistrationForm";

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  entry_fee: number;
  sport_type: string | null;
  start_time: string | null;
  end_time: string | null;
  registration_deadline: string | null;
  description: string | null;
  rules: string | null;
  terms_and_conditions: string | null;
  rules_pdf_url: string | null;
  terms_pdf_url: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  max_licensed_players: number;
  min_players: number;
  max_players: number;
  min_teams: number | null;
  max_teams: number | null;
}

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
}

const PublicTournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    loadTournamentData();
  }, [id]);

  const loadTournamentData = async () => {
    if (!id) return;

    // Load tournament
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (tournamentError) {
      toast.error("Turnier nicht gefunden");
      navigate("/tournaments");
      return;
    }

    setTournament(tournamentData);

    // Load categories
    const { data: categoriesData } = await supabase
      .from("tournament_categories")
      .select("*")
      .eq("tournament_id", id)
      .order("name");

    if (categoriesData) {
      setCategories(categoriesData);
    }

    // Load sponsors
    const { data: sponsorsData } = await supabase
      .from("sponsors")
      .select("*")
      .eq("tournament_id", id)
      .order("display_order");

    if (sponsorsData) {
      setSponsors(sponsorsData);
    }

    setLoading(false);
  };

  const getSportIcon = (sport: string | null) => {
    const icons: Record<string, string> = {
      volleyball: "🏐",
      handball: "🤾",
      unihockey: "🏑",
      fussball: "⚽",
    };
    return sport ? icons[sport] || "🏆" : "🏆";
  };

  const isRegistrationOpen = () => {
    if (!tournament?.registration_deadline) return true;
    return new Date(tournament.registration_deadline) > new Date();
  };

  if (loading) {
  return (
    <div className="min-h-screen bg-background">
      <ModernNavigation />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  if (showRegistration) {
    return (
      <TeamRegistrationForm
        tournament={tournament}
        categories={categories}
        onBack={() => setShowRegistration(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ModernNavigation />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/tournaments")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Übersicht
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="text-6xl">{getSportIcon(tournament.sport_type)}</div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {tournament.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(tournament.date).toLocaleDateString("de-CH")}
                    {tournament.start_time && tournament.end_time && 
                      ` • ${tournament.start_time.slice(0, 5)} - ${tournament.end_time.slice(0, 5)} Uhr`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{tournament.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span>CHF {tournament.entry_fee.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {isRegistrationOpen() ? (
              <Badge variant="default" className="bg-green-600">Anmeldung offen</Badge>
            ) : (
              <Badge variant="secondary">Anmeldung geschlossen</Badge>
            )}
          </div>

          {tournament.registration_deadline && isRegistrationOpen() && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Anmeldeschluss: {new Date(tournament.registration_deadline).toLocaleString("de-CH")}
              </span>
            </div>
          )}

          {tournament.description && (
            <p className="mt-4 text-lg text-muted-foreground">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Categories */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Kategorien</CardTitle>
            <CardDescription>
              Wähle die passende Kategorie für dein Team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="p-4 border border-border rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {category.description}
                    </p>
                  )}
                  <div className="space-y-1 text-sm">
                    <p>Spieler: {category.min_players} - {category.max_players}</p>
                    <p>Max. lizenzierte: {category.max_licensed_players}</p>
                    {category.min_teams && (
                      <p className="text-muted-foreground">
                        Min. {category.min_teams} Teams für Durchführung
                      </p>
                    )}
                    {category.max_teams && (
                      <p className="text-muted-foreground">
                        Max. {category.max_teams} Teams
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rules & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(tournament.rules || tournament.rules_pdf_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Turnierregeln
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournament.rules && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                    {tournament.rules}
                  </p>
                )}
                {tournament.rules_pdf_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(tournament.rules_pdf_url!, "_blank")}
                    className="w-full"
                  >
                    PDF herunterladen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {(tournament.terms_and_conditions || tournament.terms_pdf_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Teilnahmebedingungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournament.terms_and_conditions && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                    {tournament.terms_and_conditions}
                  </p>
                )}
                {tournament.terms_pdf_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(tournament.terms_pdf_url!, "_blank")}
                    className="w-full"
                  >
                    PDF herunterladen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sponsors */}
        {sponsors.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Sponsoren</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {sponsors.map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className="flex items-center justify-center p-4 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => sponsor.website_url && window.open(sponsor.website_url, "_blank")}
                  >
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="max-h-16 w-auto"
                      />
                    ) : (
                      <span className="text-sm font-semibold">{sponsor.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration CTA */}
        {isRegistrationOpen() ? (
          <Card className="bg-primary/5 border-primary">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">Bereit zum Anmelden?</h3>
                <p className="text-muted-foreground mb-6">
                  Melde dein Team jetzt für dieses Turnier an
                </p>
                <Button size="lg" onClick={() => setShowRegistration(true)}>
                  Team anmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>Die Anmeldung für dieses Turnier ist geschlossen.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <ModernFooter />
    </div>
  );
};

export default PublicTournamentDetail;
