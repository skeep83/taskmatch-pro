// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth-aware client (to know who calls)
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  // Admin client to bypass RLS for writes
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body.user_id;

    const { data: userData } = await authClient.auth.getUser();
    const callerId = userData?.user?.id;

    let canWrite = false;
    if (callerId) {
      if (!targetUserId || targetUserId === callerId) {
        canWrite = true;
      } else {
        // check admin
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "admin")
          .maybeSingle();
        canWrite = !!roles;
      }
    }

    if (!canWrite) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 403,
      });
    }

    const userId = targetUserId || callerId!;

    // Compute components
    // Quality from pro_rating_stats (avg 0..5 -> 0..100)
    const { data: pr } = await admin
      .from("pro_rating_stats")
      .select("avg_score")
      .eq("pro_id", userId)
      .maybeSingle();
    const quality = Math.min(100, Math.max(0, Number(pr?.avg_score || 0) * 20));

    // Social trust from endorsements (sum weights, capped at 100)
    const { data: eAgg } = await admin
      .from("endorsements")
      .select("weight");
    const socialTrust = Math.min(100, (eAgg || []).reduce((s: number, r: any) => s + Number(r.weight || 0), 0));

    // Placeholders for now (will be improved in next iterations)
    const reliability = 0;
    const priceFairness = 0;

    const total = 0.4 * quality + 0.25 * reliability + 0.2 * priceFairness + 0.15 * socialTrust;

    const { error: upErr } = await admin.from("scores").upsert({
      entity_type: "user",
      entity_id: userId,
      quality,
      reliability,
      price_fairness: priceFairness,
      social_trust: socialTrust,
      total,
    }, { onConflict: "entity_type,entity_id" });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ user_id: userId, quality, reliability, price_fairness: priceFairness, social_trust: socialTrust, total }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    console.error("scores-refresh-user error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
});
