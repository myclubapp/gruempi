import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import PDFDocument from "https://esm.sh/pdfkit@0.15.0?target=deno";
import { SwissQRBill } from "https://esm.sh/swissqrbill@4.2.1/pdf?target=deno&deps=pdfkit@0.15.0";
import { mm2pt } from "https://esm.sh/swissqrbill@4.2.1/utils?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate modulo 10 recursive checksum for QR reference
function calculateMod10Recursive(ref: string): number {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const char of ref) {
    const digit = parseInt(char, 10);
    if (isNaN(digit)) continue;
    carry = table[(carry + digit) % 10];
  }
  return (10 - carry) % 10;
}

// Convert hex string to numeric string
function hexToNumeric(hex: string): string {
  const cleanHex = hex.replace(/-/g, '').toLowerCase();
  let result = '';
  for (const char of cleanHex) {
    const val = parseInt(char, 16);
    result += val.toString().padStart(2, '0');
  }
  return result;
}

// Generate a valid 27-digit QR reference from team and tournament IDs
function generateQRReference(tournamentId: string, teamId: string): string {
  const tournamentNumeric = hexToNumeric(tournamentId);
  const teamNumeric = hexToNumeric(teamId);
  
  const tournamentPart = tournamentNumeric.substring(0, 13);
  const teamPart = teamNumeric.substring(0, 13);
  
  let base = (tournamentPart + teamPart).substring(0, 26);
  base = base.padStart(26, '0');
  
  const checkDigit = calculateMod10Recursive(base);
  return base + String(checkDigit);
}

// Format reference for display (groups of 5)
function formatReference(ref: string): string {
  return ref.replace(/(.{5})/g, '$1 ').trim();
}

// Format date in German Swiss format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-CH", { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { team_id } = await req.json();

    if (!team_id) {
      throw new Error("team_id is required");
    }

    console.log("Generating QR invoice PDF for team:", team_id);

    // Fetch team with tournament and category details
    const { data: team, error: teamError } = await supabaseClient
      .from("teams")
      .select(`
        *,
        tournament:tournaments(*),
        category:tournament_categories(*)
      `)
      .eq("id", team_id)
      .single();

    if (teamError || !team) {
      throw new Error(`Team not found: ${teamError?.message}`);
    }

    // Fetch organizer profile for default creditor information
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", team.tournament.organizer_id)
      .single();

    if (profileError || !profile) {
      console.warn("Could not load organizer profile:", profileError);
    }

    // Use tournament-specific creditor info if available, otherwise fall back to profile
    const creditorAccount = team.tournament.creditor_account || profile?.creditor_account;
    const creditorName = team.tournament.creditor_name || profile?.creditor_name || profile?.full_name || team.tournament.name;
    const creditorAddress = team.tournament.creditor_address || profile?.creditor_address || "";
    const creditorBuildingNumber = team.tournament.creditor_building_number || profile?.creditor_building_number || "";
    const creditorZip = team.tournament.creditor_zip || profile?.creditor_zip || "";
    const creditorCity = team.tournament.creditor_city || profile?.creditor_city || "";
    const creditorCountry = team.tournament.creditor_country || profile?.creditor_country || "CH";

    if (!creditorAccount) {
      throw new Error("Keine Creditor-Informationen verfügbar. Bitte Profil oder Turnier-Einstellungen aktualisieren.");
    }

    // Generate valid 27-digit QR reference
    const referenceNumber = generateQRReference(team.tournament.id, team_id);
    console.log("Generated QR reference:", referenceNumber);

    // Get entry fee from category or tournament
    const entryFee = team.category?.entry_fee || team.tournament.entry_fee || 0;

    // Prepare data for SwissQRBill (following the library's expected format)
    const qrBillData = {
      amount: entryFee,
      creditor: {
        account: creditorAccount.replace(/\s/g, ''),
        name: creditorName,
        address: creditorAddress,
        buildingNumber: creditorBuildingNumber ? String(creditorBuildingNumber) : undefined,
        zip: parseInt(creditorZip) || 0,
        city: creditorCity,
        country: creditorCountry
      },
      currency: "CHF" as const,
      debtor: {
        name: team.contact_name,
        address: "",
        buildingNumber: undefined,
        zip: 0,
        city: "",
        country: "CH"
      },
      reference: referenceNumber,
      message: `Startgeld ${team.tournament.name} - Team ${team.name}`
    };

    console.log("Creating PDF with SwissQRBill...");

    // Create PDF document following the guide
    const pdf = new PDFDocument({ size: "A4" });

    // Collect PDF chunks
    const chunks: Uint8Array[] = [];
    
    pdf.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    // === Add content to PDF following the guide ===

    // Creditor address (top left)
    pdf.fontSize(12);
    pdf.fillColor("black");
    pdf.font("Helvetica");
    pdf.text(
      `${creditorName}\n${creditorAddress}${creditorBuildingNumber ? ' ' + creditorBuildingNumber : ''}\n${creditorZip} ${creditorCity}`,
      mm2pt(20),
      mm2pt(35),
      {
        align: "left",
        height: mm2pt(50),
        width: mm2pt(100)
      }
    );

    // Debtor address (top right)
    pdf.fontSize(12);
    pdf.font("Helvetica");
    pdf.text(
      `${team.contact_name}\n${team.contact_email}`,
      mm2pt(130),
      mm2pt(60),
      {
        align: "left",
        height: mm2pt(50),
        width: mm2pt(70)
      }
    );

    // Title and date
    pdf.fontSize(14);
    pdf.font("Helvetica-Bold");
    pdf.text(
      `Rechnung - Turnieranmeldung`,
      mm2pt(20),
      mm2pt(100),
      {
        align: "left",
        width: mm2pt(170)
      }
    );

    const today = new Date();
    pdf.fontSize(11);
    pdf.font("Helvetica");
    pdf.text(
      `${creditorCity}, ${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`,
      {
        align: "right",
        width: mm2pt(170)
      }
    );

    // Tournament info section
    pdf.moveDown(2);
    pdf.fontSize(12);
    pdf.font("Helvetica-Bold");
    pdf.text("Turnier", mm2pt(20), mm2pt(120));
    
    pdf.font("Helvetica");
    pdf.fontSize(11);
    pdf.text(`${team.tournament.name}`, mm2pt(20), mm2pt(128));
    pdf.text(`Datum: ${formatDate(team.tournament.date)}`, mm2pt(20), mm2pt(135));
    pdf.text(`Ort: ${team.tournament.location}`, mm2pt(20), mm2pt(142));

    // Team info section
    pdf.font("Helvetica-Bold");
    pdf.fontSize(12);
    pdf.text("Team", mm2pt(20), mm2pt(155));
    
    pdf.font("Helvetica");
    pdf.fontSize(11);
    pdf.text(`Teamname: ${team.name}`, mm2pt(20), mm2pt(163));
    pdf.text(`Kategorie: ${team.category?.name || 'N/A'}`, mm2pt(20), mm2pt(170));
    pdf.text(`Kontaktperson: ${team.contact_name}`, mm2pt(20), mm2pt(177));

    // Payment summary
    pdf.font("Helvetica-Bold");
    pdf.fontSize(12);
    pdf.text("Rechnungsbetrag", mm2pt(20), mm2pt(195));
    
    pdf.fontSize(14);
    pdf.text(`CHF ${entryFee.toFixed(2)}`, mm2pt(140), mm2pt(195));

    pdf.font("Helvetica");
    pdf.fontSize(9);
    pdf.fillColor("#666666");
    pdf.text(`Referenznummer: ${formatReference(referenceNumber)}`, mm2pt(20), mm2pt(205));
    
    pdf.fillColor("black");

    // Create and attach the Swiss QR Bill
    const qrBill = new SwissQRBill(qrBillData);
    qrBill.attachTo(pdf);

    // Finalize PDF
    const pdfPromise = new Promise<Uint8Array>((resolve) => {
      pdf.on('end', () => {
        const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      });
    });

    pdf.end();
    
    const pdfBuffer = await pdfPromise;
    
    console.log("QR invoice PDF generated successfully, size:", pdfBuffer.length);

    // Return PDF as base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBuffer));

    return new Response(
      JSON.stringify({ 
        pdf: base64Pdf,
        filename: `rechnung-${team.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating QR invoice PDF:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
