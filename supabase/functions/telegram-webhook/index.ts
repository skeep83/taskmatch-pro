import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Telegram bot webhook. Handles `/start <link-token>` to bind a Telegram
 * chat to a platform account. Set up:
 *   supabase secrets set TELEGRAM_BOT_TOKEN=<token>
 *   curl "https://api.telegram.org/bot<token>/setWebhook?url=<functions-url>/telegram-webhook"
 */
serve(async (req) => {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    if (!token) {
      const { data: row } = await admin.from("platform_settings").select("value").eq("key", "telegram_bot_token").maybeSingle();
      let v = row?.value as unknown;
      if (typeof v === "string") { try { v = JSON.parse(v); } catch { /* raw */ } }
      token = String(v || "");
    }
    if (!token) return new Response("no token", { status: 200 });

    const update = await req.json().catch(() => null);
    const msg = update?.message;
    const chatId = msg?.chat?.id;
    const text: string = msg?.text || "";
    if (!chatId) return new Response("ok", { status: 200 });

    const reply = async (t: string) => {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: t, parse_mode: "HTML" }),
      });
    };

    if (text.startsWith("/start")) {
      const linkToken = text.split(/\s+/)[1]?.trim();
      if (!linkToken) {
        await reply("Здравствуйте! Чтобы получать уведомления ServiceHub, привяжите аккаунт в настройках профиля на сайте.");
        return new Response("ok", { status: 200 });
      }
      const { data: row } = await admin
        .from("telegram_link_tokens")
        .select("user_id, created_at")
        .eq("token", linkToken)
        .maybeSingle();
      if (!row || Date.now() - new Date(row.created_at).getTime() > 3600_000) {
        await reply("Ссылка устарела. Откройте настройки профиля на сайте и нажмите «Привязать Telegram» ещё раз.");
        return new Response("ok", { status: 200 });
      }
      await admin.from("user_telegram").upsert({
        user_id: row.user_id,
        chat_id: String(chatId),
        username: msg?.chat?.username || null,
        linked_at: new Date().toISOString(),
      });
      await admin.from("telegram_link_tokens").delete().eq("token", linkToken);
      await reply("Готово. Теперь уведомления ServiceHub будут приходить сюда: новые заказы, сообщения, оплаты и отзывы.");
      return new Response("ok", { status: 200 });
    }

    if (text === "/stop") {
      await admin.from("user_telegram").delete().eq("chat_id", String(chatId));
      await reply("Уведомления отключены. Привязать снова можно в настройках профиля.");
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("telegram-webhook error:", e);
    return new Response("ok", { status: 200 });
  }
});
