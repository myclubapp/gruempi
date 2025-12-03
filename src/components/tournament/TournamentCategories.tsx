import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

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

interface TournamentCategoriesProps {
  tournament: any;
  onUpdate: () => void;
}

const TournamentCategories = ({ tournament, onUpdate }: TournamentCategoriesProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

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

  const handleSave = async () => {
    setLoading(true);

    try {
      for (const category of categories) {
        if (category.id.startsWith("new_")) {
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

      toast.success("Kategorien gespeichert!");
      loadCategories();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving:", error);
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
      const { error } = await supabase
        .from("tournament_categories")
        .delete()
        .eq("id", category.id);

      if (error) {
        toast.error("Fehler beim Löschen der Kategorie");
        return;
      }
      toast.success("Kategorie gelöscht");
      onUpdate();
    }
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: keyof Category, value: any) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  return (
    <div className="space-y-6">
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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
          {loading ? "Wird gespeichert..." : "Kategorien speichern"}
        </Button>
      </div>
    </div>
  );
};

export default TournamentCategories;
