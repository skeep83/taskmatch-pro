import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { Gift, Copy, Check } from "lucide-react";

/** "Invite a friend" block: personal code, share link, invited count. */
export const ReferralCard = ({ userId }: { userId: string }) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [invited, setInvited] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: c }, { count }] = await Promise.all([
        supabase.rpc("get_or_create_referral_code"),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId),
      ]);
      if (!mounted) return;
      if (typeof c === "string") setCode(c);
      setInvited(count || 0);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const link = code ? `${window.location.origin}/auth?ref=${code}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: t("referral.copied") });
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  if (!code) return null;

  return (
    <div className="neo-card p-6">
      <div className="flex items-start gap-3">
        <div className="neo-icon-well w-10 h-10 shrink-0">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold leading-tight">{t("referral.title")}</h3>
            {invited > 0 && (
              <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                {t("referral.invited", { count: invited })}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("referral.hint")}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 min-w-0 rounded-xl bg-neo neo-inset-2 px-3 py-2.5 text-sm font-mono truncate">
              {link}
            </div>
            <button
              type="button"
              onClick={copy}
              aria-label={t("referral.copy")}
              className="neo-btn w-10 h-10 !p-0 rounded-xl inline-flex items-center justify-center shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
