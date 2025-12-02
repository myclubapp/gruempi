import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SwissQRBill } from "https://esm.sh/swissqrbill@4.2.0/svg";

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

// Generate a valid 27-digit QR reference
function generateQRReference(tournamentId: string, teamId: string, timestamp: number): string {
  // Create base from IDs (only digits)
  const tournamentDigits = tournamentId.replace(/[^0-9]/g, '').substring(0, 8);
  const teamDigits = teamId.replace(/[^0-9]/g, '').substring(0, 8);
  const timestampDigits = String(timestamp).slice(-9);
  
  // Combine and pad to 26 digits
  let base = (tournamentDigits + teamDigits + timestampDigits).replace(/[^0-9]/g, '');
  base = base.padStart(26, '0').substring(0, 26);
  
  // Calculate check digit
  const checkDigit = calculateMod10Recursive(base);
  
  return base + String(checkDigit);
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

    console.log("Generating QR invoice for team:", team_id);

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
    const referenceNumber = generateQRReference(team.tournament.id, team_id, Date.now());
    
    console.log("Generated QR reference:", referenceNumber);

    // Get entry fee from category or tournament
    const entryFee = team.category?.entry_fee || team.tournament.entry_fee || 0;

    // Swiss QR Bill data using configured creditor information
    const qrData: any = {
      amount: entryFee,
      currency: "CHF",
      creditor: {
        account: creditorAccount,
        name: creditorName.substring(0, 70),
        address: creditorAddress.substring(0, 70),
        buildingNumber: creditorBuildingNumber.substring(0, 16),
        zip: creditorZip ? parseInt(creditorZip) : 0,
        city: creditorCity.substring(0, 35),
        country: creditorCountry,
      },
      debtor: {
        name: team.contact_name.substring(0, 70),
        address: "",
        buildingNumber: "",
        zip: 0,
        city: "",
        country: "CH",
      },
      reference: referenceNumber,
      message: `Startgeld ${team.tournament.name} - Team ${team.name}`.substring(0, 140),
    };

    console.log("QR data prepared:", JSON.stringify(qrData, null, 2));

    // Generate SVG QR Bill
    const qrBill = new SwissQRBill(qrData);
    const svgString = qrBill.toString();

    // Create HTML document with QR Bill
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rechnung - ${team.name}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background: white;
    }
    .invoice-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .invoice-header h1 {
      font-size: 24px;
      margin: 0 0 10px 0;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      font-size: 16px;
      margin: 0 0 10px 0;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .section p {
      margin: 5px 0;
      font-size: 14px;
    }
    .payment-box {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .amount {
      font-size: 20px;
      font-weight: bold;
      color: #dc2626;
    }
    .qr-section {
      margin-top: 40px;
      page-break-before: always;
    }
    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-header">
    <h1>Rechnung</h1>
    <p>Turnier-Anmeldung</p>
  </div>

  <div class="section">
    <h2>Turnier Details</h2>
    <p><strong>Turnier:</strong> ${team.tournament.name}</p>
    <p><strong>Datum:</strong> ${new Date(team.tournament.date).toLocaleDateString("de-CH", { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}</p>
    <p><strong>Ort:</strong> ${team.tournament.location}</p>
  </div>

  <div class="section">
    <h2>Team Details</h2>
    <p><strong>Team Name:</strong> ${team.name}</p>
    <p><strong>Kategorie:</strong> ${team.category.name}</p>
    <p><strong>Kontakt:</strong> ${team.contact_name}</p>
    <p><strong>Email:</strong> ${team.contact_email}</p>
    ${team.contact_phone ? `<p><strong>Telefon:</strong> ${team.contact_phone}</p>` : ''}
  </div>

  <div class="payment-box">
    <h2 style="margin-top: 0;">Zahlungsdetails</h2>
    <p class="amount">Startgeld: CHF ${entryFee.toFixed(2)}</p>
    <p><strong>Referenznummer:</strong> ${referenceNumber}</p>
    <p style="margin-top: 15px; font-size: 12px; color: #666;">
      Bitte verwenden Sie die unten stehende QR-Rechnung für die Zahlung.
    </p>
  </div>

  <div class="qr-section">
    ${svgString}
  </div>

  <div class="no-print" style="text-align: center; margin-top: 30px;">
    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #dc2626; color: white; border: none; border-radius: 5px;">
      Rechnung drucken
    </button>
  </div>
</body>
</html>
    `;

    console.log("QR invoice generated successfully");

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating QR invoice:", error);
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
