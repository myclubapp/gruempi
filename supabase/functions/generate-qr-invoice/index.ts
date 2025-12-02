import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SwissQRBill } from "https://esm.sh/swissqrbill@4.2.0/svg";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Generate reference number (simplified format)
    const tournamentPart = team.tournament.id.substring(0, 8).replace(/-/g, "").toUpperCase();
    const teamPart = team_id.substring(0, 8).replace(/-/g, "").toUpperCase();
    const referenceNumber = `${tournamentPart}${teamPart}`;

    // Swiss QR Bill data
    const qrData = {
      amount: team.tournament.entry_fee,
      currency: "CHF" as "CHF" | "EUR",
      creditor: {
        account: "CH44 3199 9123 0008 8901 2", // TODO: Replace with actual tournament organizer account
        name: team.tournament.name.substring(0, 70), // Max 70 characters
        address: team.tournament.location.substring(0, 70),
        buildingNumber: "",
        zip: 8000,
        city: team.tournament.location.substring(0, 35),
        country: "CH",
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
    <p class="amount">Startgeld: CHF ${team.tournament.entry_fee.toFixed(2)}</p>
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
