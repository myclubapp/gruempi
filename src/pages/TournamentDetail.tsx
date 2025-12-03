import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Globe, Users, Settings as SettingsIcon, Award, CreditCard, Edit2, Trash2, Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import DomainSettings from "@/components/tournament/DomainSettings";
import PaymentSettings from "@/components/tournament/PaymentSettings";
import DashboardLayout from "@/components/DashboardLayout";

import TournamentSettings from "@/components/tournament/TournamentSettings";
import TournamentCategories from "@/components/tournament/TournamentCategories";
import TournamentRules from "@/components/tournament/TournamentRules";
import ScheduleConfig from "@/components/tournament/ScheduleConfig";
import GroupManagement from "@/components/tournament/GroupManagement";
import MatchScheduleGenerator from "@/components/tournament/MatchScheduleGenerator";
import MatchList from "@/components/tournament/MatchList";
import StandingsTable from "@/components/tournament/StandingsTable";
import TeamPaymentManagement from "@/components/tournament/TeamPaymentManagement";

interface Tournament {
  id: string;
  name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  status: string;
  entry_fee: number;
  custom_domain: string | null;
  domain_status: string;
  domain_verification_token: string | null;
  sport_type: string | null;
  registration_deadline: string | null;
  organizer_id: string;
  creditor_account: string | null;
  creditor_name: string | null;
  creditor_address: string | null;
  creditor_building_number: string | null;
  creditor_zip: string | null;
  creditor_city: string | null;
  creditor_country: string | null;
  payment_reference_prefix: string | null;
}

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

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
      console.error("Error loading tournament:", error);
      toast.error("Fehler beim Laden des Turniers: " + error.message);
      navigate("/dashboard");
      return;
    }

    setTournament(data);
    
    // Load organizer profile
    if (data?.organizer_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.organizer_id)
        .single();
      
      if (!profileError && profile) {
        setOrganizerProfile(profile);
      }
    }

    // Load categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("tournament_categories")
      .select("*")
      .eq("tournament_id", id)
      .order("name", { ascending: true });

    if (!categoriesError && categoriesData) {
      setCategories(categoriesData);
    }

    // Load teams
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select(`
        *,
        category:tournament_categories(id, name)
      `)
      .eq("tournament_id", id)
      .order("created_at", { ascending: false });

    if (!teamsError && teamsData) {
      setTeams(teamsData);
    }

    // Load groups
    const { data: groupsData } = await supabase
      .from("tournament_groups")
      .select("*, category:tournament_categories(id, name)")
      .eq("tournament_id", id)
      .order("name");

    if (groupsData) {
      setGroups(groupsData);
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

  const handleEditTeam = async (team: any) => {
    // Get current group assignment
    const { data: groupAssignment } = await supabase
      .from("team_group_assignments")
      .select("group_id")
      .eq("team_id", team.id)
      .maybeSingle();

    setEditingTeam({
      id: team.id,
      name: team.name,
      contact_name: team.contact_name,
      contact_email: team.contact_email,
      contact_phone: team.contact_phone || "",
      category_id: team.category?.id || team.category_id,
      group_id: groupAssignment?.group_id || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!editingTeam) return;

    // Update team info including category
    const { error } = await supabase
      .from("teams")
      .update({
        name: editingTeam.name,
        contact_name: editingTeam.contact_name,
        contact_email: editingTeam.contact_email,
        contact_phone: editingTeam.contact_phone,
        category_id: editingTeam.category_id,
      })
      .eq("id", editingTeam.id);

    if (error) {
      toast.error("Fehler beim Speichern");
      return;
    }

    // Update group assignment if changed
    if (editingTeam.group_id) {
      // First delete existing assignment
      await supabase
        .from("team_group_assignments")
        .delete()
        .eq("team_id", editingTeam.id);

      // Then create new assignment
      await supabase
        .from("team_group_assignments")
        .insert({
          team_id: editingTeam.id,
          group_id: editingTeam.group_id,
        });
    } else {
      // Remove from group if no group selected
      await supabase
        .from("team_group_assignments")
        .delete()
        .eq("team_id", editingTeam.id);
    }

    toast.success("Team aktualisiert");
    setEditDialogOpen(false);
    setEditingTeam(null);
    loadTournament();
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;

    // First delete all players associated with the team
    const { error: playersError } = await supabase
      .from("team_players")
      .delete()
      .eq("team_id", deleteTeamId);

    if (playersError) {
      toast.error("Fehler beim Löschen der Spieler");
      return;
    }

    // Then delete the team
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", deleteTeamId);

    if (error) {
      toast.error("Fehler beim Löschen des Teams");
    } else {
      toast.success("Team gelöscht");
      setDeleteTeamId(null);
      loadTournament();
    }
  };

  const getMicrositeUrl = () => {
    if (tournament?.custom_domain && tournament.domain_status === "active") {
      return `https://${tournament.custom_domain}/tournaments/${tournament.id}`;
    }
    return `${window.location.origin}/tournaments/${tournament?.id}`;
  };

  const handleShareMicrosite = async () => {
    const url = getMicrositeUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link in Zwischenablage kopiert!");
    } catch (error) {
      toast.error("Fehler beim Kopieren des Links");
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
    <DashboardLayout profileName={organizerProfile?.full_name}>
      {/* Tournament Sub-Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </Button>
        <div className="flex items-center gap-2">
          {tournament.status !== "draft" && (
            <Button
              variant="outline"
              onClick={handleShareMicrosite}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Microsite teilen
            </Button>
          )}
          {tournament.status !== "draft" && (
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/tournament/${id}/cockpit`)}
              className="gap-2"
            >
              🎮 Cockpit öffnen
            </Button>
          )}
          {tournament.status !== "draft" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(getMicrositeUrl(), "_blank")}
              title="Microsite öffnen"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
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

      <div className="mb-6">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {tournament.name}
        </h1>
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <span>
            📅 {new Date(tournament.date).toLocaleDateString("de-CH")}
            {tournament.start_time && tournament.end_time && 
              ` • ${tournament.start_time.slice(0, 5)} - ${tournament.end_time.slice(0, 5)} Uhr`
            }
          </span>
          <span>📍 {tournament.location}</span>
          <span>💰 CHF {tournament.entry_fee.toFixed(2)}</span>
          {tournament.sport_type && (
            <span>
              🏐 {tournament.sport_type.charAt(0).toUpperCase() + tournament.sport_type.slice(1)}
            </span>
          )}
          {tournament.registration_deadline && (
            <span>
              ⏰ Anmeldeschluss: {new Date(tournament.registration_deadline).toLocaleString("de-CH")}
            </span>
          )}
          {tournament.custom_domain && (
            <span className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              {tournament.custom_domain}
            </span>
          )}
        </div>
      </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Allgemeine Infos</TabsTrigger>
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="groups">Gruppen</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="schedule">Spielplan</TabsTrigger>
            <TabsTrigger value="payment">Finanzen</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {tournament.status === "draft" && (
              <Card>
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
                      <h4 className="font-semibold">Kategorien & Regeln konfigurieren</h4>
                      <p className="text-sm text-muted-foreground">
                        Legen Sie die Kategorien und Turnierregeln fest
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      2
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

            {/* Tournament Settings */}
            <TournamentSettings
              tournament={tournament}
              onUpdate={loadTournament}
            />

            {/* Rules and Terms */}
            <TournamentRules
              tournament={tournament}
              onUpdate={loadTournament}
            />
          </TabsContent>

          <TabsContent value="categories">
            <TournamentCategories
              tournament={tournament}
              onUpdate={loadTournament}
            />
          </TabsContent>

          <TabsContent value="teams">
            {teams.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
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
            ) : (
              <div className="space-y-6">
                {categories.map((category) => {
                  const categoryTeams = teams.filter(
                    (team) => team.category?.id === category.id
                  );
                  
                  if (categoryTeams.length === 0) return null;

                  return (
                    <Card key={category.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{category.name}</CardTitle>
                            <CardDescription>
                              {categoryTeams.length} {categoryTeams.length === 1 ? 'Team' : 'Teams'} angemeldet
                              {' • '}
                              {categoryTeams.filter(t => t.payment_status === 'paid').length} bezahlt
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-lg px-4 py-1">
                            {categoryTeams.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {categoryTeams.map((team) => (
                      <Card key={team.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">{team.name}</h3>
                                <Badge variant={team.payment_status === 'paid' ? 'default' : 'secondary'}>
                                  {team.payment_status === 'paid' ? 'Bezahlt' : 'Ausstehend'}
                                </Badge>
                                <Badge variant="outline">
                                  {team.category?.name || 'Keine Kategorie'}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong>Kontakt:</strong> {team.contact_name}</p>
                                <p><strong>E-Mail:</strong> {team.contact_email}</p>
                                {team.contact_phone && <p><strong>Telefon:</strong> {team.contact_phone}</p>}
                                <p><strong>Zahlungsmethode:</strong> {
                                  team.payment_method === 'stripe' ? 'Online (Stripe)' :
                                  team.payment_method === 'qr_invoice' ? 'QR-Rechnung' :
                                  team.payment_method === 'manual' ? 'Bar vor Ort' : 'Unbekannt'
                                }</p>
                                <p className="text-xs">
                                  <strong>Registriert:</strong> {new Date(team.created_at).toLocaleString('de-CH')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTeam(team)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Bearbeiten
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTeamId(team.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <GroupManagement tournamentId={id!} />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <MatchScheduleGenerator tournamentId={id!} />
            
            {categories.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Spielpläne & Resultate</CardTitle>
                  <CardDescription>
                    Verwalten Sie Spielpläne und erfassen Sie Resultate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={categories[0]?.id || ""}>
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
                      {categories.map((category) => (
                        <TabsTrigger key={category.id} value={category.id}>
                          {category.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {categories.map((category) => (
                      <TabsContent key={category.id} value={category.id} className="mt-6 space-y-8">
                        <div>
                          <h3 className="text-xl font-semibold mb-4">Tabelle</h3>
                          <StandingsTable tournamentId={id!} categoryId={category.id} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-4">Spielplan & Resultate</h3>
                          <MatchList tournamentId={id!} categoryId={category.id} isAdmin={true} />
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <TeamPaymentManagement
              tournamentId={tournament.id}
              teams={teams}
              onUpdate={loadTournament}
            />
            <PaymentSettings
              tournament={tournament}
              organizerProfile={organizerProfile}
              onUpdate={loadTournament}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ScheduleConfig tournamentId={id!} />
            <DomainSettings
              tournament={tournament}
              onUpdate={loadTournament}
            />
          </TabsContent>
        </Tabs>

        {/* Edit Team Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Team bearbeiten</DialogTitle>
              <DialogDescription>
                Aktualisiere die Team-Informationen
              </DialogDescription>
            </DialogHeader>
            {editingTeam && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Teamname</Label>
                  <Input
                    id="team-name"
                    value={editingTeam.name}
                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Kontaktperson</Label>
                  <Input
                    id="contact-name"
                    value={editingTeam.contact_name}
                    onChange={(e) => setEditingTeam({ ...editingTeam, contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">E-Mail</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={editingTeam.contact_email}
                    onChange={(e) => setEditingTeam({ ...editingTeam, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Telefon</Label>
                  <Input
                    id="contact-phone"
                    value={editingTeam.contact_phone}
                    onChange={(e) => setEditingTeam({ ...editingTeam, contact_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-id">Kategorie</Label>
                  <select
                    id="category-id"
                    value={editingTeam.category_id}
                    onChange={(e) => setEditingTeam({ ...editingTeam, category_id: e.target.value, group_id: '' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-id">Gruppe</Label>
                  <select
                    id="group-id"
                    value={editingTeam.group_id}
                    onChange={(e) => setEditingTeam({ ...editingTeam, group_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Keine Gruppe</option>
                    {groups
                      .filter(g => g.category_id === editingTeam.category_id)
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Nur Gruppen der gewählten Kategorie werden angezeigt
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveTeam}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTeamId} onOpenChange={(open) => !open && setDeleteTeamId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Team löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Das Team und alle zugehörigen Spieler werden dauerhaft gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </DashboardLayout>
  );
};

export default TournamentDetail;
