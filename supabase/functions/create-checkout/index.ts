import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!STRIPE_SECRET) return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500 });
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return new Response(JSON.stringify({ error: "Missing Supabase env" }), { status: 500 });

    const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" as any });

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const body = await req.json().catch(() => ({}));
    const priceCents = Number.parseInt(String(body.priceCents ?? 0));
    const interval = (body.interval || 'month');

    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return new Response(JSON.stringify({ error: "Invalid price" }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'ServiceHub HomeCare' },
            unit_amount: priceCents,
            recurring: { interval },
          },
          quantity: 1,
        }
      ],
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/payment-canceled`,
      customer_email: user.email ?? undefined,
      metadata: { user_id: user.id, tier: 'homecare' },
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});
