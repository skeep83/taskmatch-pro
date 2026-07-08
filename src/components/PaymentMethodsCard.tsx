import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Trash2, ShieldCheck, Star } from "lucide-react";

interface PaymentMethod {
  id: string;
  provider: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
}

/** Brand chip: recognisable mark in the standard wallet-row style */
const BrandMark = ({ brand }: { brand: string | null }) => {
  const b = (brand || "").toLowerCase();
  if (b === "visa") {
    return (
      <span className="flex h-9 w-14 items-center justify-center rounded-md bg-[#1A1F71] text-white text-[13px] font-extrabold italic tracking-tight shrink-0">
        VISA
      </span>
    );
  }
  if (b === "mastercard") {
    return (
      <span className="flex h-9 w-14 items-center justify-center rounded-md bg-neutral-800 shrink-0">
        <span className="relative flex items-center">
          <span className="w-4 h-4 rounded-full bg-[#EB001B]" />
          <span className="w-4 h-4 rounded-full bg-[#F79E1B] -ml-2 mix-blend-screen" />
        </span>
      </span>
    );
  }
  if (b === "apple_pay") {
    return (
      <span className="flex h-9 w-14 items-center justify-center rounded-md bg-black text-white text-[12px] font-semibold shrink-0">
         Pay
      </span>
    );
  }
  if (b === "google_pay") {
    return (
      <span className="flex h-9 w-14 items-center justify-center rounded-md bg-white border border-border text-[12px] font-semibold text-neutral-700 shrink-0">
        G Pay
      </span>
    );
  }
  return (
    <span className="flex h-9 w-14 items-center justify-center rounded-md bg-neo neo-inset-2 shrink-0">
      <CreditCard className="w-4 h-4 text-muted-foreground" />
    </span>
  );
};

/**
 * Saved payment methods — standard wallet layout: brand mark, masked
 * number and expiry, default marker, quiet actions. Card data itself
 * lives at the payment provider (PCI DSS); we render tokens' metadata.
 */
export const PaymentMethodsCard = ({ userId }: { userId: string }) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { config, loading: configLoading } = usePaymentConfig();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("payment_methods")
      .select("id, provider, brand, last4, exp_month, exp_year, is_default")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setMethods(data || []);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const openProviderPortal = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", { body: {} });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (url) window.open(url, "_blank");
      else throw new Error("no url");
    } catch {
      toast({ title: t("notifications.error"), description: t("pay.portal_error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeMethod = async (id: string) => {
    await supabase.from("payment_methods").delete().eq("id", id);
    toast({ title: t("pay.method_deleted") });
    void load();
  };

  const makeDefault = async (id: string) => {
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("payment_methods").update({ is_default: true }).eq("id", id);
    void load();
  };

  return (
    <div className="neo-card neo-aura p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="neo-icon-well w-10 h-10 shrink-0">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{t("pay.methods_title")}</h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-success" />
            <span>{t("pay.methods_hint")}</span>
          </p>
        </div>
      </div>

      {!configLoading && !config.isConfigured ? (
        <div className="rounded-xl bg-neo neo-inset-2 px-4 py-5 text-sm text-muted-foreground">
          {t("pay.not_configured")}
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 bg-neo ${m.is_default ? "neo-2" : "neo-inset-2"}`}
            >
              <BrandMark brand={m.brand} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold tracking-wider whitespace-nowrap">
                    ••••&nbsp;{m.last4 || "····"}
                  </span>
                  {m.is_default && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
                      <Star className="w-3 h-3 fill-current" />
                      {t("pay.default")}
                    </span>
                  )}
                </div>
                {m.exp_month && m.exp_year && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!m.is_default && (
                  <button
                    type="button"
                    onClick={() => makeDefault(m.id)}
                    title={t("pay.make_default")}
                    aria-label={t("pay.make_default")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-neo hover:neo-2 transition-all"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeMethod(m.id)}
                  title={t("pay.delete_method")}
                  aria-label={t("pay.delete_method")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-neo hover:neo-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add card — classic dashed tile */}
          <button
            type="button"
            onClick={openProviderPortal}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 px-4 py-4 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {methods.length ? t("pay.manage_cards") : t("pay.add_card")}
          </button>

          {/* Accepted methods strip */}
          <div className="flex items-center gap-2 pt-1 opacity-70">
            <BrandMark brand="visa" />
            <BrandMark brand="mastercard" />
            {config.applePayEnabled && <BrandMark brand="apple_pay" />}
            {config.googlePayEnabled && <BrandMark brand="google_pay" />}
          </div>
        </div>
      )}
    </div>
  );
};
