import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";

interface TournamentRulesProps {
  tournament: any;
  onUpdate: () => void;
}

const TournamentRules = ({ tournament, onUpdate }: TournamentRulesProps) => {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState(tournament.rules || "");
  const [termsAndConditions, setTermsAndConditions] = useState(tournament.terms_and_conditions || "");
  const [rulesPdf, setRulesPdf] = useState<File | null>(null);
  const [termsPdf, setTermsPdf] = useState<File | null>(null);

  const handleSave = async () => {
    setLoading(true);

    try {
      let rulesPdfUrl = tournament.rules_pdf_url;
      let termsPdfUrl = tournament.terms_pdf_url;

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

      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({
          rules,
          terms_and_conditions: termsAndConditions,
          rules_pdf_url: rulesPdfUrl,
          terms_pdf_url: termsPdfUrl,
        })
        .eq("id", tournament.id);

      if (tournamentError) throw tournamentError;

      toast.success("Regeln & Bedingungen gespeichert!");
      setRulesPdf(null);
      setTermsPdf(null);
      onUpdate();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Fehler beim Speichern: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePdf = async (type: "rules" | "terms") => {
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
            value={rules}
            onChange={(e) => setRules(e.target.value)}
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="terms">Teilnahmebedingungen (Text)</Label>
          <Textarea
            id="terms"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
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
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentRules;
