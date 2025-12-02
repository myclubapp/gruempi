import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, FileText, ChevronDown, ChevronUp, Banknote, QrCode, Smartphone, MoreHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Team {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  payment_status: string;
  payment_method: string | null;
  category?: {
    id: string;
    name: string;
    entry_fee: number;
  };
}

interface TeamPaymentManagementProps {
  tournamentId: string;
  teams: Team[];
  onUpdate: () => void;
}

const PAYMENT_METHODS = [
  { value: "bar", label: "Bar", icon: Banknote },
  { value: "qr_invoice", label: "QR-Rechnung", icon: QrCode },
  { value: "twint", label: "Twint", icon: Smartphone },
  { value: "other", label: "Anderes", icon: MoreHorizontal },
];

const TeamPaymentManagement = ({ tournamentId, teams, onUpdate }: TeamPaymentManagementProps) => {
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);
  const [generatingQrId, setGeneratingQrId] = useState<string | null>(null);
  const [unpaidOpen, setUnpaidOpen] = useState(true);
  const [paidOpen, setPaidOpen] = useState(true);

  const unpaidTeams = teams.filter(t => t.payment_status !== "paid");
  const paidTeams = teams.filter(t => t.payment_status === "paid");

  const handleMarkAsPaid = async (teamId: string, method: string) => {
    setLoadingTeamId(teamId);

    try {
      const { error } = await supabase
        .from("teams")
        .update({ 
          payment_status: "paid",
          payment_method: method 
        })
        .eq("id", teamId);

      if (error) throw error;

      toast.success("Zahlung bestätigt");
      onUpdate();
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setLoadingTeamId(null);
    }
  };

  const handleMarkAsUnpaid = async (teamId: string) => {
    setLoadingTeamId(teamId);

    try {
      const { error } = await supabase
        .from("teams")
        .update({ 
          payment_status: "pending",
          payment_method: null 
        })
        .eq("id", teamId);

      if (error) throw error;

      toast.success("Zahlungsstatus zurückgesetzt");
      onUpdate();
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setLoadingTeamId(null);
    }
  };

  const handleGenerateQrInvoice = async (teamId: string) => {
    setGeneratingQrId(teamId);

    try {
      const { data, error } = await supabase.functions.invoke("generate-qr-invoice", {
        body: { team_id: teamId },
      });

      if (error) throw error;

      // The function returns HTML directly as text
      const htmlContent = typeof data === 'string' ? data : data?.html || String(data);
      
      // Open the HTML in a new tab
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("QR-Rechnung generiert");
    } catch (error: any) {
      console.error("QR Invoice error:", error);
      toast.error("Fehler beim Generieren: " + error.message);
    } finally {
      setGeneratingQrId(null);
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return null;
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found?.label || method;
  };

  const renderTeamRow = (team: Team, isPaid: boolean) => {
    const isLoading = loadingTeamId === team.id;
    const isGenerating = generatingQrId === team.id;

    return (
      <div 
        key={team.id} 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg bg-card"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{team.name}</span>
            {team.category && (
              <Badge variant="secondary" className="text-xs">
                {team.category.name}
              </Badge>
            )}
            {team.category?.entry_fee && (
              <span className="text-sm text-muted-foreground">
                CHF {team.category.entry_fee.toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {team.contact_name} • {team.contact_email}
          </div>
          {isPaid && team.payment_method && (
            <div className="mt-1">
              <Badge variant="outline" className="text-xs">
                {getPaymentMethodLabel(team.payment_method)}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isPaid ? (
            <>
              <Select
                onValueChange={(value) => handleMarkAsPaid(team.id, value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Bezahlt via..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <method.icon className="w-4 h-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateQrInvoice(team.id)}
                disabled={isGenerating}
                className="gap-1"
              >
                <FileText className="w-4 h-4" />
                {isGenerating ? "..." : "QR"}
              </Button>
            </>
          ) : (
            <>
              <Badge variant="default" className="bg-green-600">
                <Check className="w-3 h-3 mr-1" />
                Bezahlt
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleMarkAsUnpaid(team.id)}
                disabled={isLoading}
                title="Zahlung zurücksetzen"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Team-Zahlungen
        </CardTitle>
        <CardDescription>
          Verwalte den Zahlungsstatus aller angemeldeten Teams
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Noch keine Teams angemeldet
          </div>
        ) : (
          <>
            {/* Unpaid Teams Section */}
            <Collapsible open={unpaidOpen} onOpenChange={setUnpaidOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {unpaidTeams.length}
                    </Badge>
                    <span className="font-semibold text-lg">Ausstehende Zahlungen</span>
                  </div>
                  {unpaidOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {unpaidTeams.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Alle Teams haben bezahlt! 🎉
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unpaidTeams.map((team) => renderTeamRow(team, false))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Paid Teams Section */}
            <Collapsible open={paidOpen} onOpenChange={setPaidOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600 text-xs">
                      {paidTeams.length}
                    </Badge>
                    <span className="font-semibold text-lg">Bezahlte Teams</span>
                  </div>
                  {paidOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {paidTeams.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Noch keine bezahlten Teams
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paidTeams.map((team) => renderTeamRow(team, true))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamPaymentManagement;
