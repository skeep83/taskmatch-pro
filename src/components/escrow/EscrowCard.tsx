import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";
import { useToast } from "@/hooks/use-toast";
import { Lock, CheckCircle2, Clock, ShieldCheck, Loader2 } from "lucide-react";

interface EscrowCardProps {
  jobId: string;
  clientId: string;
  proId: string | null;
  jobStatus: string;
  amountCents: number;
  currentUserId: string | null;
  onReleased?: () => void;
}

interface EscrowRow { id: string; status: string; amount_cents: number; currency: string }

const fmt = (cents: number, currency: string) =>
  `${(cents / 100).toLocaleString("ru-RU")} ${currency.toUpperCase()}`;

/**
 * Escrow safety block on the job page.
 * Client: reserve payment -> funds held -> accept work releases them to the pro.
 */
export const EscrowCard = ({ jobId, clientId, proId, jobStatus, amountCents, currentUserId, onReleased }: EscrowCardProps) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { config } = usePaymentConfig();
  const [escrow, setEscrow] = useState<EscrowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isClient = currentUserId === clientId;
  const isPro = currentUserId === proId;

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("escrows")
      .select("id, status, amount_cents, currency")
      .eq("job_id", jobId)
      .maybeSingle();
    setEscrow((data as EscrowRow) || null);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  const fund = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("escrow-fund", { body: { job_id: jobId } });
      if (error) throw error;
      const res = data as { funded?: boolean; url?: string; error?: string };
      if (res?.error) throw new Error(res.error);
      if (res?.url) {
        window.open(res.url, "_blank");
      } else if (res?.funded) {
        toast({ title: t("escrow.funded_title"), description: t("escrow.funded_desc") });
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: t("notifications.error"), description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("release_escrow", { _job_id: jobId });
      if (error) throw error;
      const res = data as { success?: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "release_failed");
      toast({ title: t("escrow.released_title"), description: t("escrow.released_desc") });
      await load();
      onReleased?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: t("notifications.error"), description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Nothing to show: not a participant, or no pro yet, or job not in a fundable state
  if (loading || (!isClient && !isPro)) return null;
  if (!proId || !["accepted", "in_progress", "done"].includes(jobStatus)) {
    if (!escrow) return null;
  }
  if (!escrow && amountCents <= 0) return null;

  return (
    <div className="neo-card p-5">
      <div className="flex items-start gap-3">
        <div className="neo-icon-well w-10 h-10 shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight">{t("escrow.title")}</h3>

          {!escrow && (() => {
            const feeCents = Math.round(amountCents * config.feePercent / 100);
            const taxCents = Math.round(amountCents * config.taxPercent / 100);
            const totalCents = amountCents + feeCents + taxCents;
            return (
              <>
                <p className="text-sm text-muted-foreground mt-1">{t("escrow.explain")}</p>
                {isClient ? (
                  <>
                    <div className="rounded-xl bg-neo neo-inset-2 px-3.5 py-2.5 mt-3 space-y-1 text-xs">
                      <div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("escrow.line_base")}</span><span className="font-medium whitespace-nowrap">{fmt(amountCents, "mdl")}</span></div>
                      {feeCents > 0 && <div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("escrow.line_fee", { percent: config.feePercent })}</span><span className="font-medium whitespace-nowrap">{fmt(feeCents, "mdl")}</span></div>}
                      {taxCents > 0 && <div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("escrow.line_tax", { percent: config.taxPercent })}</span><span className="font-medium whitespace-nowrap">{fmt(taxCents, "mdl")}</span></div>}
                      <div className="flex justify-between gap-3 pt-1 border-t border-foreground/10"><span className="font-semibold">{t("escrow.line_total")}</span><span className="font-bold whitespace-nowrap">{fmt(totalCents, "mdl")}</span></div>
                    </div>
                    <button
                      type="button"
                      onClick={fund}
                      disabled={busy}
                      className="neo-btn-primary mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      {t("escrow.fund_btn", { amount: fmt(totalCents, "mdl") })}
                    </button>
                    <p className="text-xs text-muted-foreground mt-2">{t("escrow.start_hint")}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">{t("escrow.waiting_client")}</p>
                )}
              </>
            );
          })()}

          {escrow?.status === "pending" && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{t("escrow.pending")}</span>
            </div>
          )}

          {escrow?.status === "held" && (
            <>
              <div className="inline-flex items-center gap-2 mt-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                {t("escrow.held", { amount: fmt(escrow.amount_cents, escrow.currency) })}
              </div>
              {jobStatus === "disputed" && (
                <p className="text-xs text-amber-700 mt-2 font-medium">{t("escrow.frozen_dispute")}</p>
              )}
              {isClient && jobStatus === "done" && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={release}
                    disabled={busy}
                    className="neo-btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t("escrow.release_btn")}
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">{t("escrow.release_hint")}</p>
                </div>
              )}
              {isPro && <p className="text-xs text-muted-foreground mt-2">{t("escrow.held_pro_hint")}</p>}
            </>
          )}

          {escrow?.status === "released" && (
            <div className="inline-flex items-center gap-2 mt-2 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("escrow.released", { amount: fmt(escrow.amount_cents, escrow.currency) })}
            </div>
          )}

          {escrow?.status === "refunded" && (
            <p className="text-sm text-muted-foreground mt-2">{t("escrow.refunded")}</p>
          )}
        </div>
      </div>
    </div>
  );
};
