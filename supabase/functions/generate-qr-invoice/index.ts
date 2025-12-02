import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

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
  const tournamentDigits = tournamentId.replace(/[^0-9]/g, '').substring(0, 8);
  const teamDigits = teamId.replace(/[^0-9]/g, '').substring(0, 8);
  const timestampDigits = String(timestamp).slice(-9);
  
  let base = (tournamentDigits + teamDigits + timestampDigits).replace(/[^0-9]/g, '');
  base = base.padStart(26, '0').substring(0, 26);
  
  const checkDigit = calculateMod10Recursive(base);
  return base + String(checkDigit);
}

// Generate Swiss QR Bill data string according to SIX spec
function generateSwissQRBillString(data: {
  account: string;
  creditorName: string;
  creditorAddress: string;
  creditorZip: string;
  creditorCity: string;
  creditorCountry: string;
  amount: number;
  currency: string;
  debtorName: string;
  reference: string;
  message: string;
}): string {
  // Swiss QR Bill format according to SIX specification
  const lines = [
    'SPC',                              // QR Type
    '0200',                             // Version
    '1',                                // Coding Type (UTF-8)
    data.account.replace(/\s/g, ''),    // IBAN
    'S',                                // Address Type (S = Structured)
    data.creditorName.substring(0, 70), // Creditor Name
    data.creditorAddress.substring(0, 70) || '', // Street or Address Line 1
    '',                                 // Building Number or Address Line 2
    data.creditorZip.substring(0, 16),  // Postal Code
    data.creditorCity.substring(0, 35), // City
    data.creditorCountry,               // Country
    '',                                 // Ultimate Creditor (empty)
    '',                                 // UC Name
    '',                                 // UC Street
    '',                                 // UC Building Number
    '',                                 // UC Postal Code
    '',                                 // UC City
    '',                                 // UC Country
    data.amount.toFixed(2),             // Amount
    data.currency,                      // Currency
    'S',                                // Debtor Address Type
    data.debtorName.substring(0, 70),   // Debtor Name
    '',                                 // Debtor Street
    '',                                 // Debtor Building Number
    '',                                 // Debtor Postal Code
    '',                                 // Debtor City
    'CH',                               // Debtor Country
    'QRR',                              // Reference Type (QRR for QR-Reference)
    data.reference,                     // Reference
    data.message.substring(0, 140),     // Unstructured Message
    'EPD',                              // Trailer
    '',                                 // Bill Information
  ];
  
  return lines.join('\n');
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

    // Generate Swiss QR Bill data string
    const qrDataString = generateSwissQRBillString({
      account: creditorAccount,
      creditorName: creditorName,
      creditorAddress: creditorAddress + (creditorBuildingNumber ? ' ' + creditorBuildingNumber : ''),
      creditorZip: creditorZip,
      creditorCity: creditorCity,
      creditorCountry: creditorCountry,
      amount: entryFee,
      currency: 'CHF',
      debtorName: team.contact_name,
      reference: referenceNumber,
      message: `Startgeld ${team.tournament.name} - Team ${team.name}`,
    });

    console.log("QR data string generated");

    // Generate QR code as SVG
    const qrCodeSvg = await QRCode.toString(qrDataString, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 166, // Swiss QR Bill spec: 46mm at 3.6px/mm
    });

    // Format IBAN for display
    const formattedIban = creditorAccount.replace(/(.{4})/g, '$1 ').trim();

    // Create HTML document with Swiss QR Bill layout
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
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      font-size: 10pt;
    }
    .invoice-page {
      padding: 40px;
      min-height: calc(297mm - 105mm);
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
      font-size: 14px;
      margin: 0 0 10px 0;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .section p {
      margin: 4px 0;
      font-size: 11px;
    }
    .payment-box {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .amount-large {
      font-size: 18px;
      font-weight: bold;
      color: #dc2626;
    }
    
    /* Swiss QR Bill Section */
    .qr-bill {
      position: relative;
      width: 210mm;
      height: 105mm;
      border-top: 1px dashed #000;
      display: flex;
      background: white;
      page-break-inside: avoid;
    }
    .receipt {
      width: 62mm;
      height: 105mm;
      padding: 5mm;
      border-right: 1px dashed #000;
    }
    .payment-part {
      width: 148mm;
      height: 105mm;
      padding: 5mm;
      display: flex;
    }
    .payment-left {
      width: 51mm;
    }
    .payment-right {
      flex: 1;
      padding-left: 5mm;
    }
    .qr-bill h3 {
      font-size: 11pt;
      font-weight: bold;
      margin: 0 0 2mm 0;
    }
    .qr-bill .section-title {
      font-size: 6pt;
      font-weight: bold;
      margin: 3mm 0 1mm 0;
    }
    .qr-bill .value {
      font-size: 8pt;
      margin: 0;
      line-height: 1.4;
    }
    .qr-bill .value-small {
      font-size: 7pt;
    }
    .qr-bill .amount-section {
      display: flex;
      gap: 5mm;
      margin-top: 3mm;
    }
    .qr-bill .amount-box {
      flex: 1;
    }
    .qr-code-container {
      width: 46mm;
      height: 46mm;
      margin: 5mm 0;
      position: relative;
    }
    .qr-code-container svg {
      width: 100%;
      height: 100%;
    }
    .swiss-cross {
      position: absolute;
      width: 7mm;
      height: 7mm;
      background: black;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
    .swiss-cross::before,
    .swiss-cross::after {
      content: '';
      position: absolute;
      background: white;
    }
    .swiss-cross::before {
      width: 1.4mm;
      height: 4.2mm;
      left: 2.8mm;
      top: 1.4mm;
    }
    .swiss-cross::after {
      width: 4.2mm;
      height: 1.4mm;
      left: 1.4mm;
      top: 2.8mm;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
      .qr-bill {
        position: fixed;
        bottom: 0;
        left: 0;
      }
    }
    @media screen {
      .qr-bill {
        margin-top: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-page">
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
      <h2 style="margin-top: 0; font-size: 14px;">Zahlungsdetails</h2>
      <p class="amount-large">Startgeld: CHF ${entryFee.toFixed(2)}</p>
      <p><strong>Referenznummer:</strong> ${referenceNumber}</p>
      <p style="margin-top: 10px; font-size: 10px; color: #666;">
        Bitte verwenden Sie den unten stehenden Einzahlungsschein für die Zahlung.
      </p>
    </div>
  </div>

  <!-- Swiss QR Bill -->
  <div class="qr-bill">
    <!-- Receipt (Empfangsschein) -->
    <div class="receipt">
      <h3>Empfangsschein</h3>
      
      <div class="section-title">Konto / Zahlbar an</div>
      <p class="value">${formattedIban}</p>
      <p class="value">${creditorName}</p>
      ${creditorAddress ? `<p class="value">${creditorAddress}${creditorBuildingNumber ? ' ' + creditorBuildingNumber : ''}</p>` : ''}
      <p class="value">${creditorZip} ${creditorCity}</p>
      
      <div class="section-title">Referenz</div>
      <p class="value-small">${referenceNumber.replace(/(.{5})/g, '$1 ').trim()}</p>
      
      <div class="section-title">Zahlbar durch</div>
      <p class="value">${team.contact_name}</p>
      
      <div class="amount-section">
        <div class="amount-box">
          <div class="section-title">Währung</div>
          <p class="value">CHF</p>
        </div>
        <div class="amount-box">
          <div class="section-title">Betrag</div>
          <p class="value">${entryFee.toFixed(2)}</p>
        </div>
      </div>
      
      <div class="section-title" style="margin-top: 8mm;">Annahmestelle</div>
    </div>
    
    <!-- Payment Part (Zahlteil) -->
    <div class="payment-part">
      <div class="payment-left">
        <h3>Zahlteil</h3>
        <div class="qr-code-container">
          ${qrCodeSvg}
          <div class="swiss-cross"></div>
        </div>
        <div class="amount-section">
          <div class="amount-box">
            <div class="section-title">Währung</div>
            <p class="value">CHF</p>
          </div>
          <div class="amount-box">
            <div class="section-title">Betrag</div>
            <p class="value">${entryFee.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      <div class="payment-right">
        <div class="section-title">Konto / Zahlbar an</div>
        <p class="value">${formattedIban}</p>
        <p class="value">${creditorName}</p>
        ${creditorAddress ? `<p class="value">${creditorAddress}${creditorBuildingNumber ? ' ' + creditorBuildingNumber : ''}</p>` : ''}
        <p class="value">${creditorZip} ${creditorCity}</p>
        
        <div class="section-title">Referenz</div>
        <p class="value">${referenceNumber.replace(/(.{5})/g, '$1 ').trim()}</p>
        
        <div class="section-title">Zusätzliche Informationen</div>
        <p class="value">Startgeld ${team.tournament.name}</p>
        <p class="value">Team ${team.name}</p>
        
        <div class="section-title">Zahlbar durch</div>
        <p class="value">${team.contact_name}</p>
      </div>
    </div>
  </div>

  <div class="no-print" style="text-align: center; padding: 20px;">
    <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #dc2626; color: white; border: none; border-radius: 5px;">
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
