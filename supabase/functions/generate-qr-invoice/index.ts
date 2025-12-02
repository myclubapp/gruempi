// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Import pdfkit and swissqrbill/pdf
const PDFDocument = (await import("https://esm.sh/pdfkit@0.15.0")).default;
const { SwissQRBill } = await import("https://esm.sh/swissqrbill@4.2.1/pdf");
const { mm2pt } = await import("https://esm.sh/swissqrbill@4.2.1/utils");
const { Table } = await import("https://esm.sh/swissqrbill@4.2.1/pdf");

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

    console.log("Creating PDF with SwissQRBill...");

    // Fetch logo first if available
    const logoUrl = team.tournament.logo_url || 'https://gruempi.my-club.app/lovable-uploads/d9a44f4c-e31a-4dea-bcb8-0ab0cca64b27.png';
    let logoBuffer: Uint8Array | undefined = undefined;

    if (logoUrl) {
      try {
        const response = await fetch(logoUrl);
        if (response.ok) {
          logoBuffer = new Uint8Array(await response.arrayBuffer());
        }
      } catch (err) {
        console.warn("Could not fetch logo:", err);
      }
    }

    // Generate PDF using PDFKit and SwissQRBill
    const pdfBuffer: Uint8Array = await new Promise((resolve, reject) => {
      const pdf = new PDFDocument({ size: 'A4' });
      const qrBill = new SwissQRBill(qrBillData);
      const chunks: Uint8Array[] = [];

      // Attach QR bill to PDF (this adds it at the bottom)
      qrBill.attachTo(pdf);

      // Add logo if available
      if (logoBuffer) {
        try {
          pdf.image(logoBuffer, mm2pt(20), mm2pt(5), { width: mm2pt(30) });
        } catch (err) {
          console.warn("Could not add logo:", err);
        }
      }

      // Add creditor address (top left)
      pdf.fontSize(12);
      pdf.fillColor('black');
      pdf.font('Helvetica');
      pdf.text(
        `${qrBillData.creditor.name}\n${qrBillData.creditor.address} ${qrBillData.creditor.buildingNumber}\n${qrBillData.creditor.zip} ${qrBillData.creditor.city}`,
        mm2pt(20),
        mm2pt(40),
        {
          align: 'left',
          height: mm2pt(50),
          width: mm2pt(100),
        }
      );

      // Add debtor address (top right)
      pdf.fontSize(12);
      pdf.font('Helvetica');
      pdf.text(
        `${qrBillData.debtor.name}\n${team.contact_email}`,
        mm2pt(130),
        mm2pt(60),
        {
          align: 'left',
          height: mm2pt(50),
          width: mm2pt(70),
        }
      );

      // Create title
      pdf.fontSize(14);
      pdf.font('Helvetica-Bold');
      pdf.text(
        `Rechnung Nr. ${formatReference(referenceNumber)}`,
        mm2pt(20),
        mm2pt(100),
        {
          align: 'left',
          width: mm2pt(170),
        }
      );

      // Add date
      const date = new Date();
      pdf.fontSize(11);
      pdf.font('Helvetica');
      pdf.text(
        `${qrBillData.creditor.city}, ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`,
        {
          align: 'right',
          width: mm2pt(170),
        }
      );

      // Add table with invoice items
      const invoicePositions = [
        {
          columns: [
            {
              text: '1',
              width: mm2pt(20),
            },
            {
              text: '1 x',
              width: mm2pt(20),
            },
            {
              text: `Startgeld ${team.tournament.name}\nTeam: ${team.name}\nKategorie: ${team.category?.name || 'N/A'}`,
            },
            {
              text: `CHF ${entryFee.toFixed(2)}`,
              width: mm2pt(30),
              align: 'right' as const,
            },
          ],
          padding: 5,
        },
      ];

      const table = new Table({
        rows: [
          {
            backgroundColor: '#4A4D51',
            columns: [
              {
                text: 'Position',
                width: mm2pt(20),
              },
              {
                text: 'Anzahl',
                width: mm2pt(20),
              },
              {
                text: 'Bezeichnung',
              },
              {
                text: 'Total',
                width: mm2pt(30),
                align: 'left' as const,
              },
            ],
            fontName: 'Helvetica-Bold',
            height: 20,
            padding: 5,
            textColor: '#fff',
            verticalAlign: 'center',
          },
          ...invoicePositions,
          {
            columns: [
              {
                text: '',
                width: mm2pt(20),
              },
              {
                text: '',
                width: mm2pt(20),
              },
              {
                fontName: 'Helvetica-Bold',
                text: 'Summe',
              },
              {
                fontName: 'Helvetica-Bold',
                text: `CHF ${entryFee.toFixed(2)}`,
                width: mm2pt(30),
                align: 'right' as const,
              },
            ],
            height: 40,
            padding: 5,
          },
          {
            columns: [
              {
                text: '',
                width: mm2pt(20),
              },
              {
                text: '',
                width: mm2pt(20),
              },
              {
                fontName: 'Helvetica-Bold',
                text: 'Rechnungstotal',
              },
              {
                fontName: 'Helvetica-Bold',
                text: `CHF ${entryFee.toFixed(2)}`,
                width: mm2pt(30),
                align: 'right' as const,
              },
            ],
            height: 40,
            padding: 5,
          },
        ],
        width: mm2pt(170),
      });

      table.attachTo(pdf);

      pdf.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      pdf.on('end', () => {
        const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      });
      pdf.on('error', reject);

      pdf.end();
    });

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
