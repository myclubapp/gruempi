// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Use jsPDF which is browser-native (no fs dependencies)
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

// Import SwissQRBill for SVG generation
import { SwissQRBill } from "https://esm.sh/swissqrbill@4.2.1/svg?bundle";
import { mm2pt } from "https://esm.sh/swissqrbill@4.2.1/utils";

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

// mm to points conversion for jsPDF (1mm = 2.83465pt, jsPDF uses mm by default)
function mmToPt(mm: number): number {
  return mm * 2.83465;
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

    // Prepare QR Bill data for swissqrbill
    const qrBillData = {
      amount: entryFee,
      creditor: {
        account: creditorAccount.replace(/\s/g, ''),
        name: creditorName,
        address: creditorAddress,
        buildingNumber: creditorBuildingNumber ? String(creditorBuildingNumber) : "",
        zip: parseInt(creditorZip) || 0,
        city: creditorCity,
        country: creditorCountry
      },
      currency: "CHF" as const,
      debtor: {
        name: team.contact_name,
        address: "",
        buildingNumber: "",
        zip: 0,
        city: creditorCity,
        country: "CH"
      },
      reference: referenceNumber,
      message: `Startgeld ${team.tournament.name} - Team ${team.name}`,
      additionalInformation: formatReference(referenceNumber)
    };

    console.log("Creating PDF with jsPDF...");

    // Create jsPDF document (A4 in mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add creditor address (top left)
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(
      `${qrBillData.creditor.name}\n${qrBillData.creditor.address} ${qrBillData.creditor.buildingNumber}\n${qrBillData.creditor.zip} ${qrBillData.creditor.city}`,
      20,
      40
    );

    // Add debtor address (top right)
    pdf.setFontSize(12);
    pdf.text(
      `${qrBillData.debtor.name}\n${team.contact_email}`,
      130,
      60
    );

    // Create title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      `Rechnung Nr. ${formatReference(referenceNumber)}`,
      20,
      100
    );

    // Add date
    const date = new Date();
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `${qrBillData.creditor.city}, ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`,
      190,
      100,
      { align: 'right' }
    );

    // Add invoice table header
    const tableStartY = 115;
    const colWidths = [20, 20, 80, 40];
    const colPositions = [20, 40, 60, 140];

    // Table header background
    pdf.setFillColor(74, 77, 81);
    pdf.rect(20, tableStartY, 170, 8, 'F');
    
    // Table header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Position', colPositions[0] + 2, tableStartY + 5);
    pdf.text('Anzahl', colPositions[1] + 2, tableStartY + 5);
    pdf.text('Bezeichnung', colPositions[2] + 2, tableStartY + 5);
    pdf.text('Total', colPositions[3] + 2, tableStartY + 5);

    // Table content row
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const rowY = tableStartY + 14;
    pdf.text('1', colPositions[0] + 2, rowY);
    pdf.text('1 x', colPositions[1] + 2, rowY);
    
    // Multi-line description
    const description = `Startgeld ${team.tournament.name}\nTeam: ${team.name}\nKategorie: ${team.category?.name || 'N/A'}`;
    pdf.text(description, colPositions[2] + 2, rowY);
    pdf.text(`CHF ${entryFee.toFixed(2)}`, colPositions[3] + 2, rowY);

    // Sum row
    const sumY = rowY + 25;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summe', colPositions[2] + 2, sumY);
    pdf.text(`CHF ${entryFee.toFixed(2)}`, colPositions[3] + 2, sumY);

    // Total row
    const totalY = sumY + 10;
    pdf.text('Rechnungstotal', colPositions[2] + 2, totalY);
    pdf.text(`CHF ${entryFee.toFixed(2)}`, colPositions[3] + 2, totalY);

    // Draw table borders
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    // Outer border
    pdf.rect(20, tableStartY, 170, totalY - tableStartY + 10);
    // Header separator
    pdf.line(20, tableStartY + 8, 190, tableStartY + 8);
    // Row separators
    pdf.line(20, rowY + 18, 190, rowY + 18);
    pdf.line(20, sumY + 5, 190, sumY + 5);

    // Generate QR Bill SVG
    console.log("Generating Swiss QR Bill SVG...");
    const qrBill = new SwissQRBill(qrBillData);
    const svgString = qrBill.toString();
    console.log("SVG generated, length:", svgString.length);

    // Add QR Bill section at the bottom of the page
    // The QR Bill should be placed at the bottom 105mm of the A4 page
    const qrBillY = 192; // A4 height is 297mm, QR bill is ~105mm, so start at ~192mm

    // Add a separator line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(0, qrBillY - 2, 210, qrBillY - 2);

    // Since we can't easily embed SVG in jsPDF, we'll add the QR bill information as text
    // Payment section (left side)
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Empfangsschein', 5, qrBillY + 5);
    
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Konto / Zahlbar an', 5, qrBillY + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(qrBillData.creditor.account, 5, qrBillY + 15);
    pdf.text(qrBillData.creditor.name, 5, qrBillY + 18);
    pdf.text(`${qrBillData.creditor.address} ${qrBillData.creditor.buildingNumber}`, 5, qrBillY + 21);
    pdf.text(`${qrBillData.creditor.zip} ${qrBillData.creditor.city}`, 5, qrBillY + 24);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Referenz', 5, qrBillY + 30);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatReference(referenceNumber), 5, qrBillY + 33);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Zahlbar durch', 5, qrBillY + 39);
    pdf.setFont('helvetica', 'normal');
    pdf.text(qrBillData.debtor.name, 5, qrBillY + 42);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Währung', 5, qrBillY + 52);
    pdf.text('Betrag', 25, qrBillY + 52);
    pdf.setFont('helvetica', 'normal');
    pdf.text('CHF', 5, qrBillY + 56);
    pdf.text(entryFee.toFixed(2), 25, qrBillY + 56);

    // Separator line between receipt and payment section
    pdf.setLineWidth(0.3);
    pdf.line(62, qrBillY, 62, 297);

    // Payment section (right side)
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Zahlteil', 67, qrBillY + 5);

    // QR Code placeholder - in production, you would generate an actual QR code
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.rect(67, qrBillY + 10, 46, 46);
    pdf.setFontSize(8);
    pdf.text('QR', 87, qrBillY + 35);

    // Swiss cross in QR code
    pdf.setFillColor(0, 0, 0);
    pdf.rect(87, qrBillY + 30, 6, 6, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.rect(88.5, qrBillY + 31, 3, 4, 'F');
    pdf.rect(88, qrBillY + 31.5, 4, 3, 'F');

    // Payment info (right side)
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Konto / Zahlbar an', 120, qrBillY + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(qrBillData.creditor.account, 120, qrBillY + 15);
    pdf.text(qrBillData.creditor.name, 120, qrBillY + 18);
    pdf.text(`${qrBillData.creditor.address} ${qrBillData.creditor.buildingNumber}`, 120, qrBillY + 21);
    pdf.text(`${qrBillData.creditor.zip} ${qrBillData.creditor.city}`, 120, qrBillY + 24);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Referenz', 120, qrBillY + 30);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatReference(referenceNumber), 120, qrBillY + 33);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Zusätzliche Informationen', 120, qrBillY + 39);
    pdf.setFont('helvetica', 'normal');
    pdf.text(qrBillData.message, 120, qrBillY + 42);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Zahlbar durch', 120, qrBillY + 50);
    pdf.setFont('helvetica', 'normal');
    pdf.text(qrBillData.debtor.name, 120, qrBillY + 53);

    // Currency and amount
    pdf.setFont('helvetica', 'bold');
    pdf.text('Währung', 67, qrBillY + 65);
    pdf.text('Betrag', 87, qrBillY + 65);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('CHF', 67, qrBillY + 70);
    pdf.text(entryFee.toFixed(2), 87, qrBillY + 70);

    // Get PDF as array buffer
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBuffer = new Uint8Array(pdfArrayBuffer);

    console.log("QR invoice PDF generated successfully, size:", pdfBuffer.length);

    // Convert to base64
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
