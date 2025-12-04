import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  entry_fee: number;
  sport_type: string | null;
  start_time: string | null;
  registration_deadline: string | null;
}

const TournamentCalendar = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, date, location, entry_fee, sport_type, start_time, registration_deadline")
      .eq("status", "published")
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .limit(6);

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
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Keine bevorstehenden Turniere
        </h3>
        <p className="text-muted-foreground">
          Schau später wieder vorbei für neue Grümpelturniere!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div className="text-4xl">{getSportIcon(tournament.sport_type)}</div>
              {isRegistrationOpen(tournament.registration_deadline) ? (
                <Badge variant="default" className="bg-green-600">Offen</Badge>
              ) : (
                <Badge variant="secondary">Geschlossen</Badge>
              )}
            </div>
            <CardTitle className="text-xl">{tournament.name}</CardTitle>
            <CardDescription className="space-y-1">
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
            <div className="space-y-3">
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
                variant="default"
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
              >
                Jetzt anmelden
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TournamentCalendar;
