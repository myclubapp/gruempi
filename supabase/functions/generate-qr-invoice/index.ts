import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { encode } from "https://esm.sh/uqr@0.1.2";

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

// Generate Swiss QR Code payload
function generateSwissQRPayload(data: {
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
  const lines = [
    "SPC",                          // QRType
    "0200",                         // Version
    "1",                            // Coding Type (UTF-8)
    data.account.replace(/\s/g, ''), // IBAN
    "S",                            // Address Type (S = structured)
    data.creditorName,              // Creditor Name
    data.creditorAddress,           // Street
    "",                             // Building Number (optional)
    data.creditorZip,               // Postal Code
    data.creditorCity,              // City
    data.creditorCountry,           // Country
    "",                             // Ultimate Creditor (empty)
    "",                             // UC Address Type
    "",                             // UC Name
    "",                             // UC Street
    "",                             // UC Building
    "",                             // UC Postal
    "",                             // UC City
    "",                             // UC Country
    data.amount.toFixed(2),         // Amount
    data.currency,                  // Currency
    "S",                            // Debtor Address Type
    data.debtorName,                // Debtor Name
    "",                             // Debtor Street
    "",                             // Debtor Building
    "",                             // Debtor Postal
    "",                             // Debtor City
    "CH",                           // Debtor Country
    "QRR",                          // Reference Type (QR Reference)
    data.reference,                 // Reference
    data.message,                   // Additional Information
    "EPD",                          // Trailer
    ""                              // Billing Information
  ];
  return lines.join("\n");
}

// Convert mm to PDF points (1mm = 2.835 points)
function mm2pt(mm: number): number {
  return mm * 2.835;
}

// Draw QR code on PDF page using rectangles
function drawQRCode(
  page: ReturnType<typeof PDFDocument.prototype.addPage>,
  qrData: boolean[][],
  x: number,
  y: number,
  size: number
) {
  const moduleCount = qrData.length;
  const moduleSize = size / moduleCount;
  
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qrData[row][col]) {
        page.drawRectangle({
          x: x + col * moduleSize,
          y: y + (moduleCount - row - 1) * moduleSize,
          width: moduleSize,
          height: moduleSize,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
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

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { height } = page.getSize();

    // Helper function to draw text (PDF coordinates start from bottom)
    const drawText = (text: string, x: number, y: number, options: { font?: typeof helvetica; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
      page.drawText(text, {
        x: mm2pt(x),
        y: height - mm2pt(y),
        size: options.size || 11,
        font: options.font || helvetica,
        color: options.color || rgb(0, 0, 0),
      });
    };

    // === Invoice Header ===
    
    // Creditor address (top left)
    const creditorFullAddress = `${creditorName}\n${creditorAddress}${creditorBuildingNumber ? ' ' + creditorBuildingNumber : ''}\n${creditorZip} ${creditorCity}`;
    let yPos = 35;
    for (const line of creditorFullAddress.split('\n')) {
      drawText(line, 20, yPos, { size: 12 });
      yPos += 5;
    }

    // Debtor address (top right)
    drawText(team.contact_name, 130, 60, { size: 12 });
    drawText(team.contact_email, 130, 66, { size: 11 });

    // Title
    drawText("Rechnung - Turnieranmeldung", 20, 100, { font: helveticaBold, size: 14 });

    // Date
    const today = new Date();
    const dateStr = `${creditorCity}, ${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
    drawText(dateStr, 140, 100, { size: 11 });

    // Tournament info
    drawText("Turnier", 20, 120, { font: helveticaBold, size: 12 });
    drawText(team.tournament.name, 20, 128, { size: 11 });
    drawText(`Datum: ${formatDate(team.tournament.date)}`, 20, 135, { size: 11 });
    drawText(`Ort: ${team.tournament.location}`, 20, 142, { size: 11 });

    // Team info
    drawText("Team", 20, 155, { font: helveticaBold, size: 12 });
    drawText(`Teamname: ${team.name}`, 20, 163, { size: 11 });
    drawText(`Kategorie: ${team.category?.name || 'N/A'}`, 20, 170, { size: 11 });
    drawText(`Kontaktperson: ${team.contact_name}`, 20, 177, { size: 11 });

    // Payment summary
    drawText("Rechnungsbetrag", 20, 195, { font: helveticaBold, size: 12 });
    drawText(`CHF ${entryFee.toFixed(2)}`, 140, 195, { font: helveticaBold, size: 14 });

    drawText(`Referenznummer: ${formatReference(referenceNumber)}`, 20, 205, { size: 9, color: rgb(0.4, 0.4, 0.4) });

    // === Swiss QR Bill Section (bottom of page) ===
    const qrBillTop = height - mm2pt(192);
    
    // Draw separator line
    page.drawLine({
      start: { x: 0, y: qrBillTop },
      end: { x: 595.28, y: qrBillTop },
      thickness: 0.5,
      color: rgb(0, 0, 0),
      dashArray: [5, 5],
    });

    // Receipt section (left side, 62mm wide)
    const receiptX = 5;
    const receiptTextY = qrBillTop - mm2pt(10);

    page.drawText("Empfangsschein", {
      x: mm2pt(receiptX),
      y: receiptTextY,
      size: 11,
      font: helveticaBold,
    });

    page.drawText("Konto / Zahlbar an", {
      x: mm2pt(receiptX),
      y: receiptTextY - mm2pt(8),
      size: 6,
      font: helveticaBold,
    });

    // Creditor info in receipt
    let receiptY = receiptTextY - mm2pt(12);
    page.drawText(creditorAccount.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim(), {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 8,
      font: helvetica,
    });
    receiptY -= mm2pt(4);
    page.drawText(creditorName, {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 8,
      font: helvetica,
    });
    receiptY -= mm2pt(4);
    page.drawText(`${creditorZip} ${creditorCity}`, {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 8,
      font: helvetica,
    });

    // Reference
    receiptY -= mm2pt(8);
    page.drawText("Referenz", {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 6,
      font: helveticaBold,
    });
    receiptY -= mm2pt(4);
    page.drawText(formatReference(referenceNumber), {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 8,
      font: helvetica,
    });

    // Amount in receipt
    receiptY -= mm2pt(10);
    page.drawText("Währung", {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 6,
      font: helveticaBold,
    });
    page.drawText("Betrag", {
      x: mm2pt(receiptX + 15),
      y: receiptY,
      size: 6,
      font: helveticaBold,
    });
    receiptY -= mm2pt(4);
    page.drawText("CHF", {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 8,
      font: helvetica,
    });
    page.drawText(entryFee.toFixed(2), {
      x: mm2pt(receiptX + 15),
      y: receiptY,
      size: 8,
      font: helvetica,
    });

    // Acceptance point
    receiptY -= mm2pt(12);
    page.drawText("Annahmestelle", {
      x: mm2pt(receiptX),
      y: receiptY,
      size: 6,
      font: helveticaBold,
    });

    // Vertical separator between receipt and payment part
    page.drawLine({
      start: { x: mm2pt(62), y: qrBillTop },
      end: { x: mm2pt(62), y: qrBillTop - mm2pt(105) },
      thickness: 0.5,
      color: rgb(0, 0, 0),
      dashArray: [5, 5],
    });

    // Payment part (right side)
    const paymentX = 67;
    const paymentTextY = qrBillTop - mm2pt(10);

    page.drawText("Zahlteil", {
      x: mm2pt(paymentX),
      y: paymentTextY,
      size: 11,
      font: helveticaBold,
    });

    // Generate QR Code payload
    const qrPayload = generateSwissQRPayload({
      account: creditorAccount,
      creditorName,
      creditorAddress: `${creditorAddress}${creditorBuildingNumber ? ' ' + creditorBuildingNumber : ''}`,
      creditorZip,
      creditorCity,
      creditorCountry,
      amount: entryFee,
      currency: "CHF",
      debtorName: team.contact_name,
      reference: referenceNumber,
      message: `Startgeld ${team.tournament.name} - Team ${team.name}`,
    });

    console.log("QR Payload:", qrPayload);

    // Generate QR code data matrix using uqr
    const qrResult = encode(qrPayload, { ecc: 'M' });
    const qrData = qrResult.data;
    
    console.log("QR code generated, size:", qrData.length);

    // Draw QR code
    const qrSize = mm2pt(46);
    const qrX = mm2pt(paymentX);
    const qrY = qrBillTop - mm2pt(56);
    
    drawQRCode(page, qrData, qrX, qrY, qrSize);

    // Swiss cross in center of QR code
    const crossSize = mm2pt(7);
    const crossX = qrX + qrSize/2 - crossSize/2;
    const crossY = qrY + qrSize/2 - crossSize/2;
    
    // White background for cross
    page.drawRectangle({
      x: crossX - mm2pt(1),
      y: crossY - mm2pt(1),
      width: crossSize + mm2pt(2),
      height: crossSize + mm2pt(2),
      color: rgb(1, 1, 1),
    });
    
    // Black border for Swiss cross
    page.drawRectangle({
      x: crossX,
      y: crossY,
      width: crossSize,
      height: crossSize,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Draw Swiss cross (white cross on black background would be inside the border)
    // For simplicity, just draw a black square border - the actual Swiss cross would be more complex

    // Payment part creditor info
    const infoX = mm2pt(118);
    let infoY = paymentTextY - mm2pt(8);

    page.drawText("Konto / Zahlbar an", {
      x: infoX,
      y: infoY,
      size: 8,
      font: helveticaBold,
    });
    infoY -= mm2pt(5);
    page.drawText(creditorAccount.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim(), {
      x: infoX,
      y: infoY,
      size: 10,
      font: helvetica,
    });
    infoY -= mm2pt(5);
    page.drawText(creditorName, {
      x: infoX,
      y: infoY,
      size: 10,
      font: helvetica,
    });
    infoY -= mm2pt(5);
    page.drawText(`${creditorZip} ${creditorCity}`, {
      x: infoX,
      y: infoY,
      size: 10,
      font: helvetica,
    });

    // Reference
    infoY -= mm2pt(10);
    page.drawText("Referenz", {
      x: infoX,
      y: infoY,
      size: 8,
      font: helveticaBold,
    });
    infoY -= mm2pt(5);
    page.drawText(formatReference(referenceNumber), {
      x: infoX,
      y: infoY,
      size: 10,
      font: helvetica,
    });

    // Additional info
    infoY -= mm2pt(10);
    page.drawText("Zusätzliche Informationen", {
      x: infoX,
      y: infoY,
      size: 8,
      font: helveticaBold,
    });
    infoY -= mm2pt(5);
    page.drawText(`Startgeld ${team.tournament.name}`, {
      x: infoX,
      y: infoY,
      size: 10,
      font: helvetica,
    });
    infoY -= mm2pt(5);
    page.drawText(`Team ${team.name}`, {
      x: infoX,
      y: infoY,
      size: 10,
      font: helvetica,
    });

    // Amount section at bottom
    const amountY = qrBillTop - mm2pt(85);
    page.drawText("Währung", {
      x: mm2pt(paymentX),
      y: amountY,
      size: 8,
      font: helveticaBold,
    });
    page.drawText("Betrag", {
      x: mm2pt(paymentX + 20),
      y: amountY,
      size: 8,
      font: helveticaBold,
    });
    page.drawText("CHF", {
      x: mm2pt(paymentX),
      y: amountY - mm2pt(5),
      size: 10,
      font: helvetica,
    });
    page.drawText(entryFee.toFixed(2), {
      x: mm2pt(paymentX + 20),
      y: amountY - mm2pt(5),
      size: 10,
      font: helvetica,
    });

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();
    
    console.log("QR invoice PDF generated successfully, size:", pdfBytes.length);

    // Return PDF as base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBytes));

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
