// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { parseHTML } from "https://esm.sh/linkedom@0.16.8";
import { initialize, svg2png } from "https://esm.sh/svg2png-wasm@1.4.1";

// Setup DOM globals for swissqrbill
const dom = parseHTML('<!DOCTYPE html><html><body></body></html>');
// @ts-ignore: Setting global for swissqrbill
globalThis.document = dom.document;
// @ts-ignore: Setting global for swissqrbill
globalThis.SVGElement = dom.SVGElement;

// Now import swissqrbill after DOM is set up
const { SwissQRBill } = await import("https://esm.sh/swissqrbill@4.2.1/svg");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize svg2png-wasm
let wasmInitialized = false;

async function initWasm() {
  if (!wasmInitialized) {
    await initialize(fetch("https://unpkg.com/svg2png-wasm@1.4.1/svg2png_wasm_bg.wasm"));
    wasmInitialized = true;
  }
}

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

// Convert mm to PDF points (1mm = 2.835 points)
function mm2pt(mm: number): number {
  return mm * 2.835;
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

    // Initialize WASM for SVG to PNG conversion
    await initWasm();

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
        buildingNumber: creditorBuildingNumber ? String(creditorBuildingNumber) : undefined,
        zip: parseInt(creditorZip) || 0,
        city: creditorCity,
        country: creditorCountry
      },
      currency: "CHF" as const,
      debtor: {
        name: team.contact_name,
        address: "",
        zip: 0,
        city: "",
        country: "CH"
      },
      reference: referenceNumber,
      message: `Startgeld ${team.tournament.name} - Team ${team.name}`
    };

    console.log("Creating Swiss QR Bill SVG...");

    // Generate Swiss QR Bill as SVG using swissqrbill library
    const qrBillSvg = new SwissQRBill(qrBillData);
    const svgString = qrBillSvg.toString();
    
    console.log("SVG generated, length:", svgString.length);

    // Convert SVG to PNG
    const pngData = await svg2png(svgString, {
      scale: 2, // Higher quality
      width: 595, // A4 width in pixels at 72 DPI
    });

    console.log("PNG generated, size:", pngData.length);

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
    // Embed the QR Bill PNG at the bottom of the page
    // The QR bill is 210mm wide x 105mm tall (A4 width x payment slip height)
    
    const qrBillImage = await pdfDoc.embedPng(pngData);
    const qrBillHeight = mm2pt(105); // Standard QR bill height
    const qrBillWidth = 595.28; // Full page width
    
    page.drawImage(qrBillImage, {
      x: 0,
      y: 0, // Bottom of page
      width: qrBillWidth,
      height: qrBillHeight,
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
