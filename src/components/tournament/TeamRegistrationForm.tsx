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
import { ArrowLeft } from "lucide-react";
import ModernNavigation from "@/components/ModernNavigation";
import { z } from "zod";

const teamAdminSchema = z.object({
  first_name: z.string().trim().min(1, "Vorname ist erforderlich").max(100, "Vorname zu lang"),
  last_name: z.string().trim().min(1, "Nachname ist erforderlich").max(100, "Nachname zu lang"),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255, "E-Mail zu lang"),
  phone: z.string().trim().min(1, "Telefonnummer ist erforderlich").max(50, "Telefonnummer zu lang"),
  team_name: z.string().trim().min(1, "Teamname ist erforderlich").max(100, "Teamname zu lang"),
  costume_description: z.string().trim().max(500, "Beschreibung zu lang").optional(),
});

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
    entry_fee: number;
  }>;
  onBack: () => void;
}

const TeamRegistrationForm = ({ tournament, categories, onBack }: TeamRegistrationFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    team_name: "",
    category_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    costume_description: "",
    payment_method: "",
  });

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const selectedCategory = categories.find((c) => c.id === formData.category_id);

  const validateForm = () => {
    // Validate using zod schema
    try {
      teamAdminSchema.parse({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        team_name: formData.team_name,
        costume_description: formData.costume_description,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
        return false;
      }
    }

    if (!formData.category_id) {
      toast.error("Bitte wähle eine Kategorie");
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
      // Create team with validated data
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          tournament_id: tournament.id,
          category_id: formData.category_id,
          name: formData.team_name.trim(),
          contact_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
          contact_email: formData.email.trim().toLowerCase(),
          contact_phone: formData.phone.trim(),
          costume_description: formData.costume_description?.trim() || null,
          payment_method: formData.payment_method,
          payment_status: "pending",
          rules_accepted: rulesAccepted,
          terms_accepted: termsAccepted,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Handle payment
      const entryFee = selectedCategory?.entry_fee || tournament.entry_fee;
      
      if (formData.payment_method === "stripe") {
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          "create-team-payment",
          {
            body: {
              team_id: team.id,
              amount: entryFee,
            },
          }
        );

        if (paymentError) throw paymentError;

        if (paymentData?.url) {
          window.open(paymentData.url, "_blank");
        }
      } else if (formData.payment_method === "qr_invoice") {
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

        const html = await response.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }

      // Send confirmation email
      try {
        console.log("Sending confirmation email for team:", team.id);
        const { data: emailData, error: emailError } = await supabase.functions.invoke("send-team-confirmation", {
          body: { team_id: team.id },
        });
        
        if (emailError) {
          console.error("Error sending confirmation email:", emailError);
          toast.error("Team registriert, aber E-Mail konnte nicht versendet werden");
        } else {
          console.log("Confirmation email sent successfully", emailData);
        }
      } catch (emailError) {
        console.error("Exception sending confirmation email:", emailError);
        // Don't block navigation if email fails
      }

      toast.success("Team erfolgreich angemeldet!");
      navigate(`/tournaments/${team.id}/registration-success`);
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
                      {cat.name} - CHF {cat.entry_fee.toFixed(2)} ({cat.min_players}-{cat.max_players} Spieler, max.{" "}
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

          {/* Team Admin / Kontaktdaten */}
          <Card>
            <CardHeader>
              <CardTitle>Team-Admin Kontaktdaten</CardTitle>
              <CardDescription>
                Nach der Anmeldung erhältst du einen Link zum Teilen mit deinen Spielern
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
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
                  <Label htmlFor="phone">Telefonnummer *</Label>
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
              <CardDescription>
                Startgeld: CHF {selectedCategory ? selectedCategory.entry_fee.toFixed(2) : tournament.entry_fee.toFixed(2)}
                {selectedCategory && selectedCategory.entry_fee !== tournament.entry_fee && (
                  <span className="text-muted-foreground"> (kategorienspezifisch)</span>
                )}
              </CardDescription>
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
