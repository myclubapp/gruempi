import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Globe, CheckCircle, AlertCircle, Clock, Copy } from "lucide-react";

interface DomainSettingsProps {
  tournament: {
    id: string;
    custom_domain: string | null;
    domain_status: string;
    domain_verification_token: string | null;
  };
  onUpdate: () => void;
}

const DomainSettings = ({ tournament, onUpdate }: DomainSettingsProps) => {
  const [domain, setDomain] = useState(tournament.custom_domain || "");
  const [loading, setLoading] = useState(false);

  const generateToken = async () => {
    const { data, error } = await supabase.rpc("generate_verification_token");
    if (error) {
      console.error("Error generating token:", error);
      return null;
    }
    return data;
  };

  const handleSetupDomain = async () => {
    if (!domain) {
      toast.error("Bitte geben Sie eine Domain ein");
      return;
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      toast.error("Ungültiges Domain-Format");
      return;
    }

    setLoading(true);

    try {
      // Generate verification token
      const token = await generateToken();
      if (!token) {
        throw new Error("Fehler beim Generieren des Verification-Tokens");
      }

      // Update tournament with domain info
      const { error } = await supabase
        .from("tournaments")
        .update({
          custom_domain: domain,
          domain_verification_token: token,
          domain_status: "verifying",
        })
        .eq("id", tournament.id);

      if (error) throw error;

      toast.success("Domain-Setup gestartet!");
      onUpdate();
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("tournaments")
        .update({
          custom_domain: null,
          domain_verification_token: null,
          domain_status: "not_configured",
        })
        .eq("id", tournament.id);

      if (error) throw error;

      setDomain("");
      toast.success("Domain entfernt");
      onUpdate();
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("In Zwischenablage kopiert");
  };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: any }> = {
      not_configured: { label: "Nicht konfiguriert", variant: "secondary", icon: AlertCircle },
      verifying: { label: "Verifizierung läuft", variant: "default", icon: Clock },
      active: { label: "Aktiv", variant: "default", icon: CheckCircle },
      failed: { label: "Fehlgeschlagen", variant: "outline", icon: AlertCircle },
    };

    const config = statusConfig[tournament.domain_status] || statusConfig.not_configured;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Custom Domain
            </CardTitle>
            <CardDescription>
              Verknüpfen Sie eine eigene Domain mit Ihrem Turnier
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {tournament.domain_status === "not_configured" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="domain">Ihre Domain</Label>
              <div className="flex gap-2">
                <Input
                  id="domain"
                  placeholder="turnier.example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.toLowerCase())}
                />
                <Button onClick={handleSetupDomain} disabled={loading}>
                  {loading ? "Wird verarbeitet..." : "Einrichten"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Geben Sie die Domain oder Subdomain ein, die Sie verwenden möchten
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Was Sie benötigen</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Zugriff auf die DNS-Einstellungen Ihrer Domain</li>
                  <li>Ca. 5-10 Minuten für die DNS-Propagierung</li>
                </ul>
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Konfigurierte Domain</Label>
                <p className="text-lg font-semibold">{tournament.custom_domain}</p>
              </div>

              <Alert>
                <AlertTitle>DNS-Konfiguration erforderlich</AlertTitle>
                <AlertDescription className="mt-3 space-y-4">
                  <div>
                    <p className="font-semibold mb-2">
                      Fügen Sie folgende DNS-Einträge bei Ihrem Domain-Provider hinzu:
                    </p>
                  </div>

                  <div className="space-y-3 bg-muted p-4 rounded-md">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">A Record</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("185.158.133.1")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm font-mono bg-background p-2 rounded">
                        <div>Type: A</div>
                        <div>Name: @ (oder Ihre Subdomain)</div>
                        <div>Value: 185.158.133.1</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">TXT Record (Verification)</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(tournament.domain_verification_token || "")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm font-mono bg-background p-2 rounded break-all">
                        <div>Type: TXT</div>
                        <div>Name: _gruempi</div>
                        <div>Value: {tournament.domain_verification_token}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      <strong>Hinweis:</strong> Die DNS-Änderungen können bis zu 72 Stunden dauern,
                      bis sie weltweit propagiert sind. Normalerweise geht es aber viel schneller
                      (5-30 Minuten).
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button variant="outline" asChild className="w-full">
                      <a
                        href="https://docs.lovable.dev/features/custom-domain"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📖 Detaillierte Anleitung
                      </a>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              {tournament.domain_status === "active" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Domain ist aktiv! 🎉</AlertTitle>
                  <AlertDescription>
                    Ihr Turnier ist jetzt unter{" "}
                    <a
                      href={`https://${tournament.custom_domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline"
                    >
                      {tournament.custom_domain}
                    </a>{" "}
                    erreichbar.
                  </AlertDescription>
                </Alert>
              )}

              <div className="pt-4 border-t">
                <Button variant="destructive" onClick={handleRemoveDomain} disabled={loading}>
                  Domain entfernen
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DomainSettings;
