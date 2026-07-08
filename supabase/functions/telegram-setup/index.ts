import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json" } });

/**
 * One-click Telegram bot setup from the admin panel.
 * Admin pastes the bot token; this function validates it (getMe),
 * registers the webhook and stores the token (private category) and
 * bot username (public) in platform_settings.
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
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => ["admin", "superadmin"].includes(String(r.role)))) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "connect");

    if (action === "disconnect") {
      const { data: row } = await admin.from("platform_settings").select("value").eq("key", "telegram_bot_token").maybeSingle();
      let tok = row?.value as unknown;
      if (typeof tok === "string") { try { tok = JSON.parse(tok); } catch { /* raw */ } }
      if (tok) await fetch(`https://api.telegram.org/bot${tok}/deleteWebhook`).catch(() => null);
      await admin.from("platform_settings").delete().eq("key", "telegram_bot_token");
      await admin.from("platform_settings").upsert(
        { category: "telegram", key: "telegram_bot_username", value: JSON.stringify("") },
        { onConflict: "key" },
      );
      return json({ success: true, disconnected: true });
    }

    const token = String(body.token || "").trim();
    if (!/^\d+:[\w-]{30,}$/.test(token)) return json({ error: "invalid_token_format" }, 400);

    // 1. Validate the token
    const meResp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const me = await meResp.json().catch(() => null);
    if (!me?.ok || !me.result?.username) return json({ error: "token_rejected_by_telegram" }, 400);
    const username = String(me.result.username);

    // 2. Register the webhook
    const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
    const hookResp = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`,
    );
    const hook = await hookResp.json().catch(() => null);
    if (!hook?.ok) return json({ error: "webhook_failed", details: hook?.description }, 500);

    // 3. Persist: token privately, username publicly
    await admin.from("platform_settings").upsert(
      { category: "secrets", key: "telegram_bot_token", value: JSON.stringify(token) },
      { onConflict: "key" },
    );
    await admin.from("platform_settings").upsert(
      { category: "telegram", key: "telegram_bot_username", value: JSON.stringify(username) },
      { onConflict: "key" },
    );

    return json({ success: true, username });
  } catch (e) {
    console.error("telegram-setup error:", e);
    return json({ error: "Server error" }, 500);
  }
});
