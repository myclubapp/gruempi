import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { team_id, amount } = await req.json();

    if (!team_id || !amount) {
      throw new Error("team_id and amount are required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get team details
    const { data: team, error: teamError } = await supabaseClient
      .from("teams")
      .select("name, contact_email")
      .eq("id", team_id)
      .single();

    if (teamError) throw teamError;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: team.contact_email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : team.contact_email,
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: {
              name: `Team-Anmeldung: ${team.name}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/tournaments/payment-success?team_id=${team_id}`,
      cancel_url: `${req.headers.get("origin")}/tournaments/payment-canceled?team_id=${team_id}`,
      metadata: {
        team_id: team_id,
      },
    });

    // Update team with payment intent
    await supabaseClient
      .from("teams")
      .update({ stripe_payment_intent_id: session.id })
      .eq("id", team_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
