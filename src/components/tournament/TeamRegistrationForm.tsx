import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";
import ModernNavigation from "@/components/ModernNavigation";

interface Player {
  name: string;
  jersey_number: string;
  license_number: string;
  is_licensed: boolean;
  position: string;
}

interface TeamRegistrationFormProps {
  tournament: {
    id: string;
    name: string;
    entry_fee: number;
    rules_pdf_url: string | null;
    terms_pdf_url: string | null;
  };
  categories: Array<{
    id: string;
    name: string;
    description: string | null;
    max_licensed_players: number;
    min_players: number;
    max_players: number;
  }>;
  onBack: () => void;
}

const TeamRegistrationForm = ({ tournament, categories, onBack }: TeamRegistrationFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    team_name: "",
    category_id: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    supervisor_name: "",
    costume_description: "",
    payment_method: "",
  });

  const [players, setPlayers] = useState<Player[]>([
    { name: "", jersey_number: "", license_number: "", is_licensed: false, position: "" },
  ]);

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const selectedCategory = categories.find((c) => c.id === formData.category_id);

  const addPlayer = () => {
    if (!selectedCategory || players.length >= selectedCategory.max_players) {
      toast.error(`Max. ${selectedCategory?.max_players} Spieler erlaubt`);
      return;
    }
    setPlayers([
      ...players,
      { name: "", jersey_number: "", license_number: "", is_licensed: false, position: "" },
    ]);
  };

  const removePlayer = (index: number) => {
    if (players.length <= 1) {
      toast.error("Mindestens ein Spieler erforderlich");
      return;
    }
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: keyof Player, value: string | boolean) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const validateForm = () => {
    if (!formData.team_name.trim()) {
      toast.error("Teamname ist erforderlich");
      return false;
    }

    if (!formData.category_id) {
      toast.error("Bitte wähle eine Kategorie");
      return false;
    }

    if (!formData.contact_name.trim() || !formData.contact_email.trim()) {
      toast.error("Kontaktdaten sind erforderlich");
      return false;
    }

    if (!selectedCategory) return false;

    const validPlayers = players.filter((p) => p.name.trim());
    if (validPlayers.length < selectedCategory.min_players) {
      toast.error(`Mindestens ${selectedCategory.min_players} Spieler erforderlich`);
      return false;
    }

    const licensedCount = validPlayers.filter((p) => p.is_licensed).length;
    if (licensedCount > selectedCategory.max_licensed_players) {
      toast.error(`Max. ${selectedCategory.max_licensed_players} lizenzierte Spieler erlaubt`);
      return false;
    }

    if (!rulesAccepted || !termsAccepted) {
      toast.error("Bitte akzeptiere die Regeln und Bedingungen");
      return false;
    }

    if (!formData.payment_method) {
      toast.error("Bitte wähle eine Zahlungsmethode");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          tournament_id: tournament.id,
          category_id: formData.category_id,
          name: formData.team_name,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          supervisor_name: formData.supervisor_name || null,
          costume_description: formData.costume_description || null,
          payment_method: formData.payment_method,
          payment_status: formData.payment_method === "manual" ? "pending" : "pending",
          rules_accepted: rulesAccepted,
          terms_accepted: termsAccepted,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Create players
      const validPlayers = players.filter((p) => p.name.trim());
      const playerInserts = validPlayers.map((player) => ({
        team_id: team.id,
        name: player.name,
        jersey_number: player.jersey_number ? parseInt(player.jersey_number) : null,
        license_number: player.license_number || null,
        is_licensed: player.is_licensed,
        position: player.position || null,
      }));

      const { error: playersError } = await supabase
        .from("team_players")
        .insert(playerInserts);

      if (playersError) throw playersError;

      // Handle payment
      if (formData.payment_method === "stripe") {
        // Call Stripe payment edge function
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          "create-team-payment",
          {
            body: {
              team_id: team.id,
              amount: tournament.entry_fee,
            },
          }
        );

        if (paymentError) throw paymentError;

        // Redirect to Stripe checkout
        if (paymentData?.url) {
          window.open(paymentData.url, "_blank");
        }
      } else if (formData.payment_method === "qr_invoice") {
        // Generate and download QR invoice
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-qr-invoice`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ team_id: team.id }),
          }
        );

        if (!response.ok) {
          throw new Error("Fehler beim Generieren der QR-Rechnung");
        }

        // Get HTML and open in new window
        const html = await response.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }

      toast.success("Team erfolgreich angemeldet!");
      navigate(`/tournaments/${tournament.id}/registration-success`);
    } catch (error: any) {
      console.error("Error registering team:", error);
      toast.error("Fehler bei der Anmeldung: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ModernNavigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Team-Anmeldung</h1>
          <p className="text-muted-foreground">{tournament.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Info */}
          <Card>
            <CardHeader>
              <CardTitle>Team-Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team_name">Teamname *</Label>
                <Input
                  id="team_name"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Kategorie *</Label>
                <select
                  id="category_id"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Bitte wählen...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.min_players}-{cat.max_players} Spieler, max.{" "}
                      {cat.max_licensed_players} lizenziert)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="costume_description">Kostüm-Beschreibung (optional)</Label>
                <Textarea
                  id="costume_description"
                  value={formData.costume_description}
                  onChange={(e) =>
                    setFormData({ ...formData, costume_description: e.target.value })
                  }
                  placeholder="Beschreibe euer Team-Kostüm..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Players */}
          <Card>
            <CardHeader>
              <CardTitle>Spieler</CardTitle>
              <CardDescription>
                {selectedCategory
                  ? `${selectedCategory.min_players} - ${selectedCategory.max_players} Spieler, max. ${selectedCategory.max_licensed_players} lizenziert`
                  : "Wähle zuerst eine Kategorie"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {players.map((player, index) => (
                <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Spieler {index + 1}</h4>
                    {players.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlayer(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={player.name}
                        onChange={(e) => updatePlayer(index, "name", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Trikotnummer</Label>
                      <Input
                        type="number"
                        value={player.jersey_number}
                        onChange={(e) => updatePlayer(index, "jersey_number", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input
                        value={player.position}
                        onChange={(e) => updatePlayer(index, "position", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Lizenznummer</Label>
                      <Input
                        value={player.license_number}
                        onChange={(e) => updatePlayer(index, "license_number", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={player.is_licensed}
                      onCheckedChange={(checked) =>
                        updatePlayer(index, "is_licensed", checked as boolean)
                      }
                    />
                    <Label>Lizenzierter Spieler</Label>
                  </div>
                </div>
              ))}

              {selectedCategory && players.length < selectedCategory.max_players && (
                <Button type="button" variant="outline" onClick={addPlayer} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Spieler hinzufügen
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Kontaktdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Name *</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefon</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisor_name">Betreuer</Label>
                  <Input
                    id="supervisor_name"
                    value={formData.supervisor_name}
                    onChange={(e) =>
                      setFormData({ ...formData, supervisor_name: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules & Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Regeln & Bedingungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.rules_pdf_url && (
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={rulesAccepted}
                    onCheckedChange={(checked) => setRulesAccepted(checked as boolean)}
                    required
                  />
                  <div className="space-y-1">
                    <Label>
                      Ich akzeptiere die{" "}
                      <a
                        href={tournament.rules_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Turnierregeln (PDF)
                      </a>{" "}
                      *
                    </Label>
                  </div>
                </div>
              )}

              {tournament.terms_pdf_url && (
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    required
                  />
                  <div className="space-y-1">
                    <Label>
                      Ich akzeptiere die{" "}
                      <a
                        href={tournament.terms_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Teilnahmebedingungen (PDF)
                      </a>{" "}
                      *
                    </Label>
                  </div>
                </div>
              )}

              {!tournament.rules_pdf_url && !tournament.terms_pdf_url && (
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={rulesAccepted && termsAccepted}
                    onCheckedChange={(checked) => {
                      setRulesAccepted(checked as boolean);
                      setTermsAccepted(checked as boolean);
                    }}
                    required
                  />
                  <Label>Ich akzeptiere die Turnierregeln und Teilnahmebedingungen *</Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Zahlung</CardTitle>
              <CardDescription>Startgeld: CHF {tournament.entry_fee.toFixed(2)}</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                  <RadioGroupItem value="stripe" id="stripe" />
                  <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-semibold">Online bezahlen (Stripe)</div>
                      <div className="text-sm text-muted-foreground">
                        Sofortige Bestätigung nach Zahlung
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                  <RadioGroupItem value="qr_invoice" id="qr_invoice" />
                  <Label htmlFor="qr_invoice" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-semibold">Swiss QR Rechnung</div>
                      <div className="text-sm text-muted-foreground">
                        QR-Rechnung herunterladen - Bestätigung nach Zahlungseingang
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-semibold">Barzahlung vor Ort</div>
                      <div className="text-sm text-muted-foreground">
                        Zahlung am Turniertag - Bestätigung durch Veranstalter
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Wird angemeldet..." : "Team anmelden"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default TeamRegistrationForm;
