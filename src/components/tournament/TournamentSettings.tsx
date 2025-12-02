import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, X, FileText, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  max_licensed_players: number;
  min_players: number;
  max_players: number;
  min_teams: number;
  max_teams: number | null;
  entry_fee: number;
}

interface TournamentSettingsProps {
  tournament: any;
  onUpdate: () => void;
}

const TournamentSettings = ({ tournament, onUpdate }: TournamentSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tournament.name || "",
    date: tournament.date || "",
    start_time: tournament.start_time || "",
    end_time: tournament.end_time || "",
    location: tournament.location || "",
    entry_fee: tournament.entry_fee?.toString() || "0",
    description: tournament.description || "",
    rules: tournament.rules || "",
    terms_and_conditions: tournament.terms_and_conditions || "",
    sport_type: tournament.sport_type || "",
    registration_deadline: tournament.registration_deadline || "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [rulesPdf, setRulesPdf] = useState<File | null>(null);
  const [termsPdf, setTermsPdf] = useState<File | null>(null);

  useEffect(() => {
    loadCategories();
  }, [tournament.id]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("tournament_categories")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("name");

    if (!error && data) {
      setCategories(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let rulesPdfUrl = tournament.rules_pdf_url;
      let termsPdfUrl = tournament.terms_pdf_url;

      // Upload new PDFs if provided
      if (rulesPdf) {
        const fileName = `${tournament.organizer_id}/${Date.now()}_rules_${rulesPdf.name}`;
        const { error: uploadError } = await supabase.storage
          .from("tournament-documents")
          .upload(fileName, rulesPdf);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("tournament-documents")
          .getPublicUrl(fileName);

        rulesPdfUrl = publicUrl;
      }

      if (termsPdf) {
        const fileName = `${tournament.organizer_id}/${Date.now()}_terms_${termsPdf.name}`;
        const { error: uploadError } = await supabase.storage
          .from("tournament-documents")
          .upload(fileName, termsPdf);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("tournament-documents")
          .getPublicUrl(fileName);

        termsPdfUrl = publicUrl;
      }

      // Update tournament
      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({
          name: formData.name,
          date: formData.date,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
          location: formData.location,
          entry_fee: parseFloat(formData.entry_fee),
          description: formData.description,
          rules: formData.rules,
          terms_and_conditions: formData.terms_and_conditions,
          rules_pdf_url: rulesPdfUrl,
          terms_pdf_url: termsPdfUrl,
          sport_type: formData.sport_type || null,
          registration_deadline: formData.registration_deadline || null,
        })
        .eq("id", tournament.id);

      if (tournamentError) throw tournamentError;

      // Update categories
      for (const category of categories) {
        if (category.id.startsWith("new_")) {
          // Insert new category
          const { error } = await supabase
            .from("tournament_categories")
            .insert({
              tournament_id: tournament.id,
              name: category.name,
              description: category.description,
              max_licensed_players: category.max_licensed_players,
              min_players: category.min_players,
              max_players: category.max_players,
              min_teams: category.min_teams,
              max_teams: category.max_teams,
              entry_fee: category.entry_fee,
            });
          if (error) throw error;
        } else {
          // Update existing category
          const { error } = await supabase
            .from("tournament_categories")
            .update({
              name: category.name,
              description: category.description,
              max_licensed_players: category.max_licensed_players,
              min_players: category.min_players,
              max_players: category.max_players,
              min_teams: category.min_teams,
              max_teams: category.max_teams,
              entry_fee: category.entry_fee,
            })
            .eq("id", category.id);
          if (error) throw error;
        }
      }

      toast.success("Einstellungen gespeichert!");
      onUpdate();
    } catch (error: any) {
      console.error("Error updating tournament:", error);
      toast.error("Fehler beim Speichern: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    setCategories([
      ...categories,
      {
        id: `new_${Date.now()}`,
        name: "",
        description: null,
        max_licensed_players: 0,
        min_players: 4,
        max_players: 10,
        min_teams: 2,
        max_teams: null,
        entry_fee: 0,
      },
    ]);
  };

  const removeCategory = async (index: number) => {
    const category = categories[index];
    if (!category.id.startsWith("new_")) {
      // Delete from database
      const { error } = await supabase
        .from("tournament_categories")
        .delete()
        .eq("id", category.id);

      if (error) {
        toast.error("Fehler beim Löschen der Kategorie");
        return;
      }
      toast.success("Kategorie gelöscht");
    }
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: keyof Category, value: any) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const deletePdf = async (type: "rules" | "terms") => {
    const url = type === "rules" ? tournament.rules_pdf_url : tournament.terms_pdf_url;
    if (!url) return;

    const { error } = await supabase
      .from("tournaments")
      .update({
        [type === "rules" ? "rules_pdf_url" : "terms_pdf_url"]: null,
      })
      .eq("id", tournament.id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("PDF gelöscht");
      onUpdate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
          <CardDescription>
            Allgemeine Informationen über das Turnier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Turniername *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport_type">Sportart *</Label>
            <select
              id="sport_type"
              value={formData.sport_type}
              onChange={(e) => setFormData({ ...formData, sport_type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">Bitte wählen...</option>
              <option value="volleyball">Volleyball</option>
              <option value="handball">Handball</option>
              <option value="unihockey">Unihockey</option>
              <option value="fussball">Fussball</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_fee">Standard-Startgeld (CHF) *</Label>
              <Input
                id="entry_fee"
                type="number"
                step="0.01"
                min="0"
                value={formData.entry_fee}
                onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Kann pro Kategorie überschrieben werden
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Startzeit</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Endzeit (ca.)</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Austragungsort *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_deadline">Anmeldeschluss</Label>
            <Input
              id="registration_deadline"
              type="datetime-local"
              value={formData.registration_deadline}
              onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Kategorien</CardTitle>
          <CardDescription>
            Definieren Sie die Turnierkategorien und Teilnahmebedingungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((category, index) => (
            <div key={category.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Kategorie {index + 1}</h4>
                {categories.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={category.name}
                    onChange={(e) => updateCategory(index, "name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Startgeld (CHF) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={category.entry_fee}
                    onChange={(e) =>
                      updateCategory(index, "entry_fee", parseFloat(e.target.value) || 0)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max. lizenzierte Spieler *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={category.max_licensed_players}
                    onChange={(e) =>
                      updateCategory(index, "max_licensed_players", parseInt(e.target.value))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min. Spieler pro Team *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={category.min_players}
                    onChange={(e) =>
                      updateCategory(index, "min_players", parseInt(e.target.value))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max. Spieler pro Team *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={category.max_players}
                    onChange={(e) =>
                      updateCategory(index, "max_players", parseInt(e.target.value))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min. Teams für Durchführung *</Label>
                  <Input
                    type="number"
                    min="2"
                    value={category.min_teams}
                    onChange={(e) =>
                      updateCategory(index, "min_teams", parseInt(e.target.value))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max. Teams (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={category.max_teams || ""}
                    onChange={(e) =>
                      updateCategory(index, "max_teams", e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="Unbegrenzt"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={category.description || ""}
                  onChange={(e) => updateCategory(index, "description", e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addCategory} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Kategorie hinzufügen
          </Button>
        </CardContent>
      </Card>

      {/* Rules and Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Regeln & Bedingungen</CardTitle>
          <CardDescription>
            Diese werden bei der Anmeldung angezeigt und müssen akzeptiert werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rules">Turnierregeln (Text)</Label>
            <Textarea
              id="rules"
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rulesPdf">Turnierregeln (PDF)</Label>
              {tournament.rules_pdf_url && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(tournament.rules_pdf_url, "_blank")}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Aktuelle PDF ansehen
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePdf("rules")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <Input
              id="rulesPdf"
              type="file"
              accept=".pdf"
              onChange={(e) => setRulesPdf(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Neue PDF hochladen um die aktuelle zu ersetzen
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Teilnahmebedingungen (Text)</Label>
            <Textarea
              id="terms"
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="termsPdf">Teilnahmebedingungen (PDF)</Label>
              {tournament.terms_pdf_url && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(tournament.terms_pdf_url, "_blank")}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Aktuelle PDF ansehen
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePdf("terms")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <Input
              id="termsPdf"
              type="file"
              accept=".pdf"
              onChange={(e) => setTermsPdf(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Neue PDF hochladen um die aktuelle zu ersetzen
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Wird gespeichert..." : "Änderungen speichern"}
        </Button>
      </div>
    </form>
  );
};

export default TournamentSettings;
