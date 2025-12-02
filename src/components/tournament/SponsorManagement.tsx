import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Award } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  display_order: number;
}

interface SponsorManagementProps {
  tournamentId: string;
}

const SponsorManagement = ({ tournamentId }: SponsorManagementProps) => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    website_url: "",
    tier: "standard",
  });

  useEffect(() => {
    loadSponsors();
  }, [tournamentId]);

  const loadSponsors = async () => {
    const { data, error } = await supabase
      .from("sponsors")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Sponsoren");
    } else {
      setSponsors(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("sponsors").insert({
      tournament_id: tournamentId,
      name: formData.name,
      logo_url: formData.logo_url || null,
      website_url: formData.website_url || null,
      tier: formData.tier,
      display_order: sponsors.length,
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen des Sponsors");
    } else {
      toast.success("Sponsor hinzugefügt");
      setFormData({ name: "", logo_url: "", website_url: "", tier: "standard" });
      setDialogOpen(false);
      loadSponsors();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sponsor wirklich löschen?")) return;

    const { error } = await supabase.from("sponsors").delete().eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Sponsor gelöscht");
      loadSponsors();
    }
  };

  const getTierBadge = (tier: string) => {
    const config: Record<string, { label: string; color: string }> = {
      platinum: { label: "Platin", color: "bg-gray-400" },
      gold: { label: "Gold", color: "bg-yellow-400" },
      silver: { label: "Silber", color: "bg-gray-300" },
      bronze: { label: "Bronze", color: "bg-orange-400" },
      standard: { label: "Standard", color: "bg-gray-200" },
    };

    const { label, color } = config[tier] || config.standard;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${color} text-gray-800`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Sponsoren
            </CardTitle>
            <CardDescription>
              Verwalten Sie die Sponsoren Ihres Turniers
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Sponsor hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuer Sponsor</DialogTitle>
                <DialogDescription>
                  Fügen Sie einen Sponsor für Ihr Turnier hinzu
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Firmenname"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier">Kategorie</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value) => setFormData({ ...formData, tier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platinum">Platin</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silber</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Hinzufügen
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sponsors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Noch keine Sponsoren hinzugefügt</p>
            <p className="text-sm mt-2">
              Fügen Sie Sponsoren hinzu, um sie auf der Turnierseite anzuzeigen
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="w-16 h-16 object-contain rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <Award className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-foreground">{sponsor.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getTierBadge(sponsor.tier)}
                      {sponsor.website_url && (
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(sponsor.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SponsorManagement;
