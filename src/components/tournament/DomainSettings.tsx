import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Globe, CheckCircle, AlertCircle, Clock, Copy, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

interface DomainSettingsProps {
  tournament: {
    id: string;
    custom_domain: string | null;
    domain_status: string;
    domain_verification_token: string | null;
  };
  onUpdate: () => void;
}

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  description: string;
}

interface DomainConfig {
  domain: string;
  verified: boolean;
  configured: boolean;
  verification: any[];
  records: DnsRecord[];
}

const DomainSettings = ({ tournament, onUpdate }: DomainSettingsProps) => {
  const [domain, setDomain] = useState(tournament.custom_domain || "");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [domainConfig, setDomainConfig] = useState<DomainConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Load domain config when domain is set
  useEffect(() => {
    if (tournament.custom_domain && tournament.domain_status !== "not_configured") {
      loadDomainConfig();
    }
  }, [tournament.custom_domain, tournament.domain_status]);

  const loadDomainConfig = async () => {
    if (!tournament.custom_domain) return;
    
    setConfigLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-vercel-domain', {
        body: { action: 'get-config', domain: tournament.custom_domain }
      });

      if (error) throw error;

      if (data.success && data.config) {
        setDomainConfig(data.config);
        
        // Update domain status based on verification
        if (data.config.verified && tournament.domain_status !== "active") {
          await supabase
            .from("tournaments")
            .update({ domain_status: "active" })
            .eq("id", tournament.id);
          onUpdate();
        }
      }
    } catch (error: any) {
      console.error("Error loading domain config:", error);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSetupDomain = async () => {
    if (!domain) {
      toast.error("Bitte geben Sie eine Domain ein");
      return;
    }

    // Validate domain format
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      toast.error("Ungültiges Domain-Format");
      return;
    }

    setLoading(true);

    try {
      // Add domain to Vercel
      const { data, error } = await supabase.functions.invoke('manage-vercel-domain', {
        body: { action: 'add', domain: domain }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      // Update tournament with domain info
      const { error: updateError } = await supabase
        .from("tournaments")
        .update({
          custom_domain: domain,
          domain_status: "verifying",
        })
        .eq("id", tournament.id);

      if (updateError) throw updateError;

      toast.success("Domain bei Vercel registriert! Konfigurieren Sie nun die DNS-Einträge.");
      onUpdate();
      
      // Load the domain config to show DNS records
      setTimeout(() => loadDomainConfig(), 1000);
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!tournament.custom_domain) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-vercel-domain', {
        body: { action: 'verify', domain: tournament.custom_domain }
      });

      if (error) throw error;

      if (data.verified) {
        await supabase
          .from("tournaments")
          .update({ domain_status: "active" })
          .eq("id", tournament.id);
        toast.success("Domain erfolgreich verifiziert! 🎉");
        onUpdate();
      } else {
        toast.info("Domain noch nicht verifiziert. Bitte DNS-Einträge prüfen.");
      }
      
      // Reload config
      await loadDomainConfig();
    } catch (error: any) {
      toast.error("Fehler bei der Verifizierung: " + error.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!tournament.custom_domain) return;

    setLoading(true);

    try {
      // Remove from Vercel
      const { data, error } = await supabase.functions.invoke('manage-vercel-domain', {
        body: { action: 'remove', domain: tournament.custom_domain }
      });

      if (error) throw error;

      // Update tournament
      const { error: updateError } = await supabase
        .from("tournaments")
        .update({
          custom_domain: null,
          domain_verification_token: null,
          domain_status: "not_configured",
        })
        .eq("id", tournament.id);

      if (updateError) throw updateError;

      setDomain("");
      setDomainConfig(null);
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
              Verknüpfen Sie eine eigene Domain mit Ihrem Turnier (via Vercel)
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
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird eingerichtet...
                    </>
                  ) : (
                    "Einrichten"
                  )}
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

              {configLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Alert>
                  <AlertTitle>DNS-Konfiguration {domainConfig?.verified ? "✅" : "erforderlich"}</AlertTitle>
                  <AlertDescription className="mt-3 space-y-4">
                    <div>
                      <p className="font-semibold mb-2">
                        Fügen Sie folgende DNS-Einträge bei Ihrem Domain-Provider hinzu:
                      </p>
                    </div>

                    <div className="space-y-3 bg-muted p-4 rounded-md">
                      {domainConfig?.records && domainConfig.records.length > 0 ? (
                        domainConfig.records.map((record, index) => (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{record.type} Record {record.description && `(${record.description})`}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(record.value)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-sm font-mono bg-background p-2 rounded break-all">
                              <div>Type: {record.type}</div>
                              <div>Name: {record.name}</div>
                              <div>Value: {record.value}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">A Record</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard("76.76.21.21")}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-sm font-mono bg-background p-2 rounded">
                              <div>Type: A</div>
                              <div>Name: {tournament.custom_domain}</div>
                              <div>Value: 76.76.21.21</div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">CNAME Record (für www)</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard("cname.vercel-dns.com")}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-sm font-mono bg-background p-2 rounded">
                              <div>Type: CNAME</div>
                              <div>Name: www.{tournament.custom_domain}</div>
                              <div>Value: cname.vercel-dns.com</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-sm">
                        <strong>Hinweis:</strong> Die DNS-Änderungen können bis zu 72 Stunden dauern,
                        bis sie weltweit propagiert sind. Normalerweise geht es aber viel schneller
                        (5-30 Minuten).
                      </p>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleVerifyDomain}
                        disabled={verifying}
                        className="flex-1"
                      >
                        {verifying ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Verifizierung prüfen
                      </Button>
                      <Button variant="outline" asChild className="flex-1">
                        <a
                          href={`https://dnschecker.org/#A/${tournament.custom_domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          DNS prüfen
                        </a>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
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
