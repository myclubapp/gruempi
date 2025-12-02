import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

interface PaymentSettingsProps {
  tournament: {
    id: string;
    creditor_account: string | null;
    creditor_name: string | null;
    creditor_address: string | null;
    creditor_building_number: string | null;
    creditor_zip: string | null;
    creditor_city: string | null;
    creditor_country: string | null;
  };
  organizerProfile: {
    full_name: string;
    creditor_account: string | null;
    creditor_address: string | null;
    creditor_building_number: string | null;
    creditor_zip: string | null;
    creditor_city: string | null;
    creditor_country: string | null;
  } | null;
  onUpdate: () => void;
}

const PaymentSettings = ({ tournament, organizerProfile, onUpdate }: PaymentSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [useCustom, setUseCustom] = useState(!!tournament.creditor_account);
  const [formData, setFormData] = useState({
    creditor_account: tournament.creditor_account || "",
    creditor_name: tournament.creditor_name || "",
    creditor_address: tournament.creditor_address || "",
    creditor_building_number: tournament.creditor_building_number || "",
    creditor_zip: tournament.creditor_zip || "",
    creditor_city: tournament.creditor_city || "",
    creditor_country: tournament.creditor_country || "CH",
  });

  // Pre-fill from profile when enabling custom settings (only if no tournament values saved)
  const handleUseCustomChange = (checked: boolean) => {
    setUseCustom(checked);
    if (checked && !tournament.creditor_account && organizerProfile) {
      setFormData({
        creditor_account: organizerProfile.creditor_account || "",
        creditor_name: organizerProfile.full_name || "",
        creditor_address: organizerProfile.creditor_address || "",
        creditor_building_number: organizerProfile.creditor_building_number || "",
        creditor_zip: organizerProfile.creditor_zip || "",
        creditor_city: organizerProfile.creditor_city || "",
        creditor_country: organizerProfile.creditor_country || "CH",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const updateData = useCustom
        ? {
            creditor_account: formData.creditor_account,
            creditor_name: formData.creditor_name,
            creditor_address: formData.creditor_address,
            creditor_building_number: formData.creditor_building_number,
            creditor_zip: formData.creditor_zip,
            creditor_city: formData.creditor_city,
            creditor_country: formData.creditor_country,
          }
        : {
            creditor_account: null,
            creditor_name: null,
            creditor_address: null,
            creditor_building_number: null,
            creditor_zip: null,
            creditor_city: null,
            creditor_country: null,
          };

      const { error } = await supabase
        .from("tournaments")
        .update(updateData)
        .eq("id", tournament.id);

      if (error) throw error;

      toast.success("Zahlungseinstellungen aktualisiert");
      onUpdate();
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          QR-Rechnungs-Einstellungen
        </CardTitle>
        <CardDescription>
          Konfiguriere die Creditor-Informationen für QR-Rechnungen bei diesem Turnier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use_custom"
              checked={useCustom}
              onChange={(e) => handleUseCustomChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="use_custom" className="cursor-pointer">
              Turnier-spezifische Zahlungsinformationen verwenden
            </Label>
          </div>

          {!useCustom && organizerProfile && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm mb-2">
                <strong>Standard-Einstellungen aus deinem Profil:</strong>
              </p>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Name: {organizerProfile.full_name}</p>
                <p>IBAN: {organizerProfile.creditor_account || "Nicht konfiguriert"}</p>
                {organizerProfile.creditor_address && (
                  <p>
                    Adresse: {organizerProfile.creditor_address}{" "}
                    {organizerProfile.creditor_building_number}, {organizerProfile.creditor_zip}{" "}
                    {organizerProfile.creditor_city}
                  </p>
                )}
              </div>
            </div>
          )}

          {useCustom && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="creditor_account">IBAN *</Label>
                <Input
                  id="creditor_account"
                  value={formData.creditor_account}
                  onChange={(e) => setFormData({ ...formData, creditor_account: e.target.value })}
                  placeholder="CH93 0076 2011 6238 5295 7"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditor_name">Name des Empfängers *</Label>
                <Input
                  id="creditor_name"
                  value={formData.creditor_name}
                  onChange={(e) => setFormData({ ...formData, creditor_name: e.target.value })}
                  placeholder="FC Beispiel"
                />
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
                    onChange={(e) =>
                      setFormData({ ...formData, creditor_building_number: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, creditor_country: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="CH">Schweiz</option>
                    <option value="LI">Liechtenstein</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Die Referenznummer wird automatisch basierend auf der Team-ID generiert.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSettings;