import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Stripe webhook: marks pending escrows as held after successful checkout.
 * Set up: supabase secrets set STRIPE_WEBHOOK_SECRET=<whsec_...>
 * Endpoint events: checkout.session.completed
 */
serve(async (req) => {
  try {
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret || !stripeKey) return new Response("not configured", { status: 200 });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as never });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature!, secret);
    } catch {
      return new Response("bad signature", { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const jobId = session.metadata?.job_id;
      if (jobId && session.metadata?.purpose === "escrow") {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false } },
        );
        const { data: escrow } = await admin
          .from("escrows")
          .update({ status: "held", updated_at: new Date().toISOString() })
          .eq("job_id", jobId)
          .eq("status", "pending")
          .select("pro_id, amount_cents")
          .maybeSingle();
        if (escrow) {
          await admin.from("notifications").insert({
            user_id: escrow.pro_id, type: "payment",
            title: "Оплата зарезервирована", title_ro: "Plata a fost rezervată",
            message: "Клиент оплатил заказ — средства зарезервированы до принятия работы.",
            message_ro: "Clientul a plătit comanda — fondurile sunt rezervate până la acceptarea lucrării.",
            data: { job_id: jobId, amount_cents: escrow.amount_cents },
          });
        }
      }
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return new Response("error", { status: 500 });
  }
});
