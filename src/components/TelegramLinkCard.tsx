import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { Send, Link2Off, Loader2 } from "lucide-react";

/**
 * Links the user's Telegram account for instant notifications.
 * Flow: create one-time token -> open t.me/<bot>?start=<token> -> webhook binds chat.
 */
export const TelegramLinkCard = ({ userId }: { userId: string }) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [linked, setLinked] = useState<{ username: string | null } | null>(null);
  const [botUsername, setBotUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: tg }, { data: settings }] = await Promise.all([
      supabase.from("user_telegram").select("username").eq("user_id", userId).maybeSingle(),
      supabase.from("platform_settings").select("value").eq("key", "telegram_bot_username").maybeSingle(),
    ]);
    setLinked(tg ? { username: tg.username } : null);
    let bot = settings?.value as unknown;
    if (typeof bot === "string") { try { bot = JSON.parse(bot); } catch { /* keep */ } }
    setBotUsername(String(bot || "").replace(/^@/, ""));
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const connect = async () => {
    setBusy(true);
    try {
      const { data: token, error } = await supabase.rpc("create_telegram_link_token");
      if (error || !token) throw error || new Error("no token");
      window.open(`https://t.me/${botUsername}?start=${token}`, "_blank");
      toast({ title: t("tg.opened_title"), description: t("tg.opened_desc") });
      // poll a few times for the link to appear
      let tries = 0;
      const timer = window.setInterval(async () => {
        tries += 1;
        const { data } = await supabase.from("user_telegram").select("username").eq("user_id", userId).maybeSingle();
        if (data || tries >= 15) {
          window.clearInterval(timer);
          if (data) setLinked({ username: data.username });
        }
      }, 4000);
    } catch {
      toast({ title: t("notifications.error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    await supabase.from("user_telegram").delete().eq("user_id", userId);
    setLinked(null);
    toast({ title: t("tg.unlinked") });
  };

  if (loading) return null;

  return (
    <div className="neo-card p-6">
      <div className="flex items-start gap-3">
        <div className="neo-icon-well w-10 h-10 shrink-0">
          <Send className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-tight">{t("tg.title")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("tg.hint")}</p>

          {linked ? (
            <div className="flex items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-semibold">
                {t("tg.linked")}{linked.username ? ` · @${linked.username}` : ""}
              </span>
              <button
                type="button"
                onClick={disconnect}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                <Link2Off className="w-3.5 h-3.5" />
                {t("tg.unlink")}
              </button>
            </div>
          ) : botUsername ? (
            <button
              type="button"
              onClick={connect}
              disabled={busy}
              className="neo-btn-primary mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("tg.connect")}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">{t("tg.not_configured")}</p>
          )}
        </div>
      </div>
    </div>
  );
};
