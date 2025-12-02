import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { team_id } = await req.json();

    if (!team_id) {
      throw new Error("team_id ist erforderlich");
    }

    console.log("Sending confirmation email for team:", team_id);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch team details
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select(`
        *,
        tournament:tournaments(*),
        category:tournament_categories(*)
      `)
      .eq("id", team_id)
      .single();

    if (teamError || !team) {
      console.error("Team fetch error:", teamError);
      throw new Error(`Team nicht gefunden: ${teamError?.message}`);
    }

    console.log("Team loaded:", team.name);

    // Fetch organizer profile
    const { data: organizer, error: organizerError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", team.tournament.organizer_id)
      .single();

    if (organizerError) {
      console.error("Organizer fetch error:", organizerError);
    }

    console.log("Organizer loaded:", organizer?.full_name || "Unknown");

    // Generate registration URL
    const registrationUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/teams/${team.id}/register/${team.registration_token}`;

    // Setup SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
        tls: Deno.env.get("SMTP_PORT") === "465",
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASSWORD")!,
        },
      },
    });

    // Email content - using single line HTML to avoid =20 encoding issues
    const emailSubject = `Bestätigung: Team-Anmeldung ${team.name}`;
    
    // Build payment info section
    let paymentInfoHtml = '';
    if (team.payment_method === 'qr_invoice') {
      paymentInfoHtml = '<div class="payment-info"><h3 style="margin-top: 0;">💳 Zahlungsinformation</h3><p><strong>Die QR-Rechnung ist als Anhang beigefügt.</strong></p><ul><li>Startgeld: CHF ' + team.tournament.entry_fee.toFixed(2) + '</li><li>Bitte bezahle bis zum Anmeldeschluss</li><li>Nach Zahlungseingang erhältst du eine Bestätigung</li></ul></div>';
    } else if (team.payment_method === 'manual') {
      paymentInfoHtml = '<div class="payment-info"><h3 style="margin-top: 0;">💵 Zahlungsinformation</h3><p><strong>Barzahlung vor Ort:</strong> CHF ' + team.tournament.entry_fee.toFixed(2) + '</p><p>Bitte bezahle das Startgeld am Turniertag. Die Bestätigung erfolgt durch den Veranstalter.</p></div>';
    }

    // Build organizer info section
    let organizerInfoHtml = '';
    if (organizer) {
      organizerInfoHtml = '<div class="info-box" style="margin-top: 30px;"><h3 style="margin-top: 0; color: #f97316;">📋 Veranstalter-Information</h3>';
      
      if (organizer.full_name) {
        organizerInfoHtml += '<p><strong>Name:</strong> ' + organizer.full_name + '</p>';
      }
      if (organizer.organization) {
        organizerInfoHtml += '<p><strong>Organisation:</strong> ' + organizer.organization + '</p>';
      }
      if (organizer.phone) {
        organizerInfoHtml += '<p><strong>Telefon:</strong> ' + organizer.phone + '</p>';
      }
      
      organizerInfoHtml += '</div>';
    }
    
    const emailHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; } .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; } .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; } .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; } .info-label { font-weight: bold; color: #6b7280; } .link-box { background: #fffbeb; border: 2px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 20px 0; } .button { display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; } .payment-info { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; } ul { padding-left: 20px; } li { margin: 8px 0; }</style></head><body><div class="container"><div class="header"><h1 style="margin: 0;">🎉 Anmeldung erfolgreich!</h1></div><div class="content"><p>Hallo ' + team.contact_name + ',</p><p>Dein Team <strong>"' + team.name + '"</strong> wurde erfolgreich für das Turnier registriert!</p><div class="info-box"><h2 style="margin-top: 0; color: #f97316;">Team-Details</h2><div class="info-row"><span class="info-label">Team:</span><span>' + team.name + '</span></div><div class="info-row"><span class="info-label">Turnier:</span><span>' + team.tournament.name + '</span></div><div class="info-row"><span class="info-label">Kategorie:</span><span>' + team.category.name + '</span></div><div class="info-row"><span class="info-label">Datum:</span><span>' + new Date(team.tournament.date).toLocaleDateString('de-CH') + '</span></div><div class="info-row"><span class="info-label">Ort:</span><span>' + team.tournament.location + '</span></div></div>' + paymentInfoHtml + '<div class="link-box"><h3 style="margin-top: 0; color: #92400e;">👥 Spieler-Registrierung</h3><p>Teile diesen Link mit deinen Teammitgliedern, damit sie sich registrieren können:</p><a href="' + registrationUrl + '" class="button">Zur Spieler-Registrierung</a><p style="font-size: 12px; color: #6b7280; word-break: break-all; margin-top: 15px;">' + registrationUrl + '</p><p style="margin-top: 15px;"><strong>Wichtig:</strong></p><ul style="margin: 5px 0;"><li>Spieleranzahl: ' + team.category.min_players + ' - ' + team.category.max_players + ' Spieler</li><li>Max. ' + team.category.max_licensed_players + ' lizenzierte Spieler</li></ul></div>' + organizerInfoHtml + '<p>Bei Fragen erreichst du uns unter <a href="mailto:' + Deno.env.get("SMTP_FROM_EMAIL") + '">' + Deno.env.get("SMTP_FROM_EMAIL") + '</a>.</p><p>Wir freuen uns auf ein tolles Turnier!</p><p style="margin-top: 30px;">Sportliche Grüsse<br>Das Turnierteam</p></div></div></body></html>';

    // Prepare email content with optional QR invoice attachment
    let qrAttachment = null;
    
    if (team.payment_method === "qr_invoice") {
      console.log("Generating QR invoice for attachment...");
      
      try {
        // Call generate-qr-invoice function to get the PDF
        const qrResponse = await fetch(`${supabaseUrl}/functions/v1/generate-qr-invoice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ team_id }),
        });

        if (qrResponse.ok) {
          const qrHtml = await qrResponse.text();
          const encoder = new TextEncoder();
          const data = encoder.encode(qrHtml);
          
          qrAttachment = {
            filename: `QR-Rechnung-${team.name.replace(/[^a-zA-Z0-9]/g, '_')}.html`,
            content: data,
            contentType: "text/html",
            encoding: "binary" as const,
          };
          console.log("QR invoice prepared for attachment");
        } else {
          console.warn("Failed to generate QR invoice for attachment:", await qrResponse.text());
        }
      } catch (qrError) {
        console.error("Error generating QR invoice:", qrError);
        // Continue sending email without attachment
      }
    }

    // Send email
    console.log("Sending email to:", team.contact_email);
    
    await client.send({
      from: `"Turnierorganisation" <${Deno.env.get("SMTP_FROM_EMAIL")}>`,
      to: team.contact_email,
      subject: emailSubject,
      html: emailHtml,
      attachments: qrAttachment ? [qrAttachment] : undefined,
    });
    
    await client.close();
    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-team-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});