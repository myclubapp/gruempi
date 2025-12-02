import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ModernNavigation from "@/components/ModernNavigation";
import { User, Building, CreditCard } from "lucide-react";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    organization: "",
    phone: "",
    creditor_account: "",
    creditor_address: "",
    creditor_building_number: "",
    creditor_zip: "",
    creditor_city: "",
    creditor_country: "CH",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || "",
          organization: data.organization || "",
          phone: data.phone || "",
          creditor_account: data.creditor_account || "",
          creditor_address: data.creditor_address || "",
          creditor_building_number: data.creditor_building_number || "",
          creditor_zip: data.creditor_zip || "",
          creditor_city: data.creditor_city || "",
          creditor_country: data.creditor_country || "CH",
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Fehler beim Laden des Profils");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          organization: formData.organization,
          phone: formData.phone,
          creditor_account: formData.creditor_account,
          creditor_address: formData.creditor_address,
          creditor_building_number: formData.creditor_building_number,
          creditor_zip: formData.creditor_zip,
          creditor_city: formData.creditor_city,
          creditor_country: formData.creditor_country,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil aktualisiert");
      loadProfile();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Fehler beim Speichern: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ModernNavigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ModernNavigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mein Profil</h1>
          <p className="text-muted-foreground">
            Verwalte deine persönlichen Informationen und Zahlungseinstellungen
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Persönliche Informationen
              </CardTitle>
              <CardDescription>
                Diese Informationen werden für die Kommunikation und Organisation verwendet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Vollständiger Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organisation / Verein</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="FC Beispiel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+41 79 123 45 67"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment/Creditor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Zahlungsinformationen für QR-Rechnungen
              </CardTitle>
              <CardDescription>
                Diese Daten werden als Standard für QR-Rechnungen bei Turnieren verwendet. Du kannst sie pro Turnier überschreiben.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creditor_account">IBAN *</Label>
                <Input
                  id="creditor_account"
                  value={formData.creditor_account}
                  onChange={(e) => setFormData({ ...formData, creditor_account: e.target.value })}
                  placeholder="CH93 0076 2011 6238 5295 7"
                />
                <p className="text-xs text-muted-foreground">
                  Schweizer IBAN für den Empfang von Zahlungen
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditor_address">Strasse</Label>
                  <Input
                    id="creditor_address"
                    value={formData.creditor_address}
                    onChange={(e) => setFormData({ ...formData, creditor_address: e.target.value })}
                    placeholder="Musterstrasse"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditor_building_number">Hausnummer</Label>
                  <Input
                    id="creditor_building_number"
                    value={formData.creditor_building_number}
                    onChange={(e) => setFormData({ ...formData, creditor_building_number: e.target.value })}
                    placeholder="42"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditor_zip">PLZ</Label>
                  <Input
                    id="creditor_zip"
                    value={formData.creditor_zip}
                    onChange={(e) => setFormData({ ...formData, creditor_zip: e.target.value })}
                    placeholder="8000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditor_city">Stadt</Label>
                  <Input
                    id="creditor_city"
                    value={formData.creditor_city}
                    onChange={(e) => setFormData({ ...formData, creditor_city: e.target.value })}
                    placeholder="Zürich"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditor_country">Land</Label>
                  <select
                    id="creditor_country"
                    value={formData.creditor_country}
                    onChange={(e) => setFormData({ ...formData, creditor_country: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="CH">Schweiz</option>
                    <option value="LI">Liechtenstein</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleSave}
              disabled={saving || !formData.full_name}
              size="lg"
            >
              {saving ? "Wird gespeichert..." : "Änderungen speichern"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}