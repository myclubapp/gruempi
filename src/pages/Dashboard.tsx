import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  status: string;
  entry_fee: number;
  teams?: { count: number }[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
    loadTournaments();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
  };

  const loadTournaments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("tournaments")
        .select(`
          *,
          teams:teams(count)
        `)
        .eq("organizer_id", user.id)
        .order("date", { ascending: false });

      if (error) {
        toast.error("Fehler beim Laden der Turniere");
      } else {
        setTournaments(data || []);
      }
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
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <DashboardLayout profileName={profile?.full_name}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Meine Turniere</h2>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Turniere und Teams
          </p>
        </div>
        <Button
          variant="hero"
          size="lg"
          onClick={() => navigate("/dashboard/create-tournament")}
        >
          <Plus className="w-5 h-5" />
          Neues Turnier
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Noch keine Turniere
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Erstellen Sie Ihr erstes Turnier und beginnen Sie mit der Organisation.
            </p>
            <Button
              variant="hero"
              onClick={() => navigate("/dashboard/create-tournament")}
            >
              <Plus className="w-5 h-5" />
              Erstes Turnier erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className="hover:shadow-elegant transition-all cursor-pointer"
              onClick={() => navigate(`/dashboard/tournament/${tournament.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{tournament.name}</CardTitle>
                  {getStatusBadge(tournament.status)}
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(tournament.date).toLocaleDateString("de-CH")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      {tournament.teams?.[0]?.count || 0} Teams angemeldet
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    📍 {tournament.location}
                  </div>
                  <div className="text-muted-foreground">
                    💰 CHF {tournament.entry_fee.toFixed(2)} Startgeld
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
