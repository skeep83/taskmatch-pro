import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!STRIPE_SECRET) return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } });
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return new Response(JSON.stringify({ error: "Missing Supabase env" }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } });

    const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" as any });

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' } });

    // find or create customer by email
    let customerId: string | undefined;
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const created = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
        customerId = created.id;
      }
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId as string,
      return_url: (req.headers.get('origin') || new URL(req.url).origin) + '/'
    });

    return new Response(JSON.stringify({ url: portal.url }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});
