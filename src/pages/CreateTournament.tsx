import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";

interface Category {
  name: string;
  description: string;
  max_licensed_players: number;
  min_players: number;
  max_players: number;
}

const CreateTournament = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
    entry_fee: "",
    description: "",
    rules: "",
    terms_and_conditions: "",
  });

  const [categories, setCategories] = useState<Category[]>([
    {
      name: "Sportler/innen",
      description: "Für ambitionierte Teams. Max. 3 lizenzierte Spieler erlaubt.",
      max_licensed_players: 3,
      min_players: 4,
      max_players: 10,
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sie müssen angemeldet sein");
        navigate("/auth");
        return;
      }

      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .insert({
          organizer_id: user.id,
          name: formData.name,
          date: formData.date,
          location: formData.location,
          entry_fee: parseFloat(formData.entry_fee),
          description: formData.description,
          rules: formData.rules,
          terms_and_conditions: formData.terms_and_conditions,
          status: "draft",
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Create categories
      const categoryInserts = categories.map((cat) => ({
        tournament_id: tournament.id,
        name: cat.name,
        description: cat.description,
        max_licensed_players: cat.max_licensed_players,
        min_players: cat.min_players,
        max_players: cat.max_players,
      }));

      const { error: categoriesError } = await supabase
        .from("tournament_categories")
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;

      toast.success("Turnier erfolgreich erstellt!");
      navigate(`/dashboard/tournament/${tournament.id}`);
    } catch (error: any) {
      console.error("Error creating tournament:", error);
      toast.error("Fehler beim Erstellen des Turniers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    setCategories([
      ...categories,
      {
        name: "",
        description: "",
        max_licensed_players: 0,
        min_players: 4,
        max_players: 10,
      },
    ]);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: keyof Category, value: string | number) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Neues Turnier erstellen</h1>
          <p className="text-muted-foreground">
            Füllen Sie die Details für Ihr Turnier aus
          </p>
        </div>

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
                  placeholder="z.B. Grümpelturnier 2025"
                  required
                />
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
                  <Label htmlFor="entry_fee">Startgeld (CHF) *</Label>
                  <Input
                    id="entry_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                    placeholder="30.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Austragungsort *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="z.B. BBC Arena, Schaffhausen"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreiben Sie das Turnier..."
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
                <div key={index} className="p-4 border border-border rounded-lg space-y-3">
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
                        placeholder="z.B. Mixed, Sportler/innen"
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
                  </div>

                  <div className="space-y-2">
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={category.description}
                      onChange={(e) => updateCategory(index, "description", e.target.value)}
                      placeholder="Beschreiben Sie die Kategorie..."
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
                <Label htmlFor="rules">Turnierregeln</Label>
                <Textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="z.B. Spielzeit, Ausrüstung, Fair Play..."
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Teilnahmebedingungen (AGB)</Label>
                <Textarea
                  id="terms"
                  value={formData.terms_and_conditions}
                  onChange={(e) =>
                    setFormData({ ...formData, terms_and_conditions: e.target.value })
                  }
                  placeholder="z.B. Haftungsausschluss, Versicherung..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" variant="hero" disabled={loading} className="flex-1">
              {loading ? "Wird erstellt..." : "Turnier erstellen"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateTournament;
