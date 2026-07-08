import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json" } });

/**
 * Funds an escrow for a job. In test mode the escrow is held instantly;
 * in live mode a Stripe Checkout session is created (webhook marks it held).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { job_id } = await req.json().catch(() => ({}));
    if (!job_id) return json({ error: "job_id required" }, 400);

    const { data: job } = await admin
      .from("jobs")
      .select("id, client_id, pro_id, title, status, budget_min_cents, budget_max_cents")
      .eq("id", job_id)
      .maybeSingle();
    if (!job) return json({ error: "job_not_found" }, 404);
    if (job.client_id !== user.id) return json({ error: "not_job_client" }, 403);
    if (!job.pro_id) return json({ error: "no_pro_assigned" }, 400);
    if (!["accepted", "in_progress", "done"].includes(String(job.status))) {
      return json({ error: "job_not_fundable" }, 400);
    }

    const { data: existing } = await admin
      .from("escrows").select("id, status").eq("job_id", job_id).maybeSingle();
    if (existing && existing.status !== "refunded") return json({ error: "already_funded", status: existing.status }, 409);

    const amountCents = job.budget_max_cents || job.budget_min_cents || 0;
    if (amountCents <= 0) return json({ error: "no_budget" }, 400);

    // Read payment settings
    const { data: settings } = await admin
      .from("platform_settings").select("key, value").eq("category", "payments");
    const map: Record<string, unknown> = {};
    (settings || []).forEach((r) => {
      let v = r.value;
      if (typeof v === "string") { try { v = JSON.parse(v); } catch { /* keep */ } }
      map[r.key] = v;
    });
    const mode = String(map.payment_mode || "test");
    const currency = String(map.payment_currency || "mdl");
    const feePercent = Number(map.platform_fee_percent ?? 10) || 0;
    const taxPercent = Number(map.tax_percent ?? 0) || 0;
    const feeCents = Math.round(amountCents * feePercent / 100);
    const taxCents = Math.round(amountCents * taxPercent / 100);
    const totalCents = amountCents + feeCents + taxCents;

    if (mode === "test") {
      const { error } = await admin.from("escrows").insert({
        job_id, client_id: job.client_id, pro_id: job.pro_id,
        amount_cents: totalCents, fee_cents: feeCents, tax_cents: taxCents,
        currency, status: "held",
      });
      if (error) return json({ error: error.message }, 500);
      await admin.from("notifications").insert({
        user_id: job.pro_id, type: "payment",
        title: "Оплата зарезервирована", title_ro: "Plata a fost rezervată",
        message: `Клиент зарезервировал оплату по заказу «${job.title}». Средства будут зачислены после принятия работы.`,
        message_ro: `Clientul a rezervat plata pentru comanda „${job.title}”. Fondurile vor fi creditate după acceptarea lucrării.`,
        data: { job_id, amount_cents: amountCents },
      });
      return json({ success: true, funded: true, test_mode: true, amount_cents: totalCents, base_cents: amountCents, fee_cents: feeCents, tax_cents: taxCents });
    }

    // Live mode: Stripe Checkout, escrow marked held by stripe-webhook
    const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET) return json({ error: "stripe_not_configured" }, 500);
    const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" as never });
    const origin = req.headers.get("origin") || new URL(req.url).origin;

    await admin.from("escrows").insert({
      job_id, client_id: job.client_id, pro_id: job.pro_id,
      amount_cents: totalCents, fee_cents: feeCents, tax_cents: taxCents,
      currency, status: "pending",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: { currency, product_data: { name: job.title || "ServiceHub escrow" }, unit_amount: totalCents },
        quantity: 1,
      }],
      success_url: `${origin}/job/${job_id}?escrow=funded`,
      cancel_url: `${origin}/job/${job_id}?escrow=canceled`,
      customer_email: user.email ?? undefined,
      metadata: { user_id: user.id, job_id, purpose: "escrow" },
    });
    return json({ success: true, funded: false, url: session.url });
  } catch (e) {
    console.error("escrow-fund error:", e);
    return json({ error: "Server error" }, 500);
  }
});
