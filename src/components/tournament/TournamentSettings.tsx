import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TournamentSettingsProps {
  tournament: any;
  onUpdate: () => void;
}

const formatDateTimeLocalValue = (isoString: string | null): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
};

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
    sport_type: tournament.sport_type || "",
    registration_deadline: formatDateTimeLocalValue(tournament.registration_deadline),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
          sport_type: formData.sport_type || null,
          registration_deadline: formData.registration_deadline || null,
        })
        .eq("id", tournament.id);

      if (tournamentError) throw tournamentError;

      toast.success("Einstellungen gespeichert!");
      onUpdate();
    } catch (error: any) {
      console.error("Error updating tournament:", error);
      toast.error("Fehler beim Speichern: " + error.message);
    } finally {
      setLoading(false);
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
