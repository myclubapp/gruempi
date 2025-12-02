import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import ModernNavigation from "@/components/ModernNavigation";
import ModernFooter from "@/components/ModernFooter";

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  entry_fee: number;
  sport_type: string | null;
  start_time: string | null;
  registration_deadline: string | null;
  description: string | null;
}

const PublicTournaments = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, date, location, entry_fee, sport_type, start_time, registration_deadline, description")
      .eq("status", "published")
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (!error && data) {
      setTournaments(data);
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

  const isRegistrationOpen = (deadline: string | null) => {
    if (!deadline) return true;
    return new Date(deadline) > new Date();
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

  return (
    <div className="min-h-screen bg-background">
      <ModernNavigation />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Kommende Grümpelturniere
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Finde dein nächstes Turnier und melde dein Team an
          </p>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Keine bevorstehenden Turniere
            </h3>
            <p className="text-muted-foreground">
              Schau später wieder vorbei für neue Grümpelturniere!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-4xl">{getSportIcon(tournament.sport_type)}</div>
                    {isRegistrationOpen(tournament.registration_deadline) ? (
                      <Badge variant="default" className="bg-green-600">Anmeldung offen</Badge>
                    ) : (
                      <Badge variant="secondary">Anmeldung geschlossen</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{tournament.name}</CardTitle>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(tournament.date).toLocaleDateString("de-CH")}</span>
                      {tournament.start_time && (
                        <span className="text-xs">• {tournament.start_time.slice(0, 5)} Uhr</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{tournament.location}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tournament.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Startgeld:</span>
                      <span className="font-semibold">CHF {tournament.entry_fee.toFixed(2)}</span>
                    </div>
                    
                    {tournament.registration_deadline && isRegistrationOpen(tournament.registration_deadline) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          Anmeldung bis {new Date(tournament.registration_deadline).toLocaleDateString("de-CH")}
                        </span>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    >
                      Details & Anmelden
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <ModernFooter />
    </div>
  );
};

export default PublicTournaments;
