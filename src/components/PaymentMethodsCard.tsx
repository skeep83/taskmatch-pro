import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Trash2, ShieldCheck } from "lucide-react";

interface PaymentMethod {
  id: string;
  provider: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
}

const brandLabel = (brand: string | null) => {
  switch ((brand || "").toLowerCase()) {
    case "visa": return "Visa";
    case "mastercard": return "Mastercard";
    case "apple_pay": return " Pay";
    case "google_pay": return "Google Pay";
    default: return brand || "Card";
  }
};

/**
 * Saved payment methods for the user cabinet.
 * Card data itself lives at the payment provider (PCI DSS) — this block
 * shows tokens' display metadata and opens the provider portal to
 * add/manage cards once the provider is configured in the admin panel.
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
    <div className="neo-card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="neo-icon-well w-10 h-10"><CreditCard className="w-5 h-5 text-primary" /></div>
        <h3 className="text-lg font-semibold flex-1">{t("pay.methods_title")}</h3>
        {config.applePayEnabled && <Badge variant="secondary" className="text-xs"> Pay</Badge>}
        {config.googlePayEnabled && <Badge variant="secondary" className="text-xs">G Pay</Badge>}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        {t("pay.methods_hint")}
      </p>

      {!configLoading && !config.isConfigured ? (
        <div className="p-4 rounded-xl bg-neo neo-inset-2 text-sm text-muted-foreground">
          {t("pay.not_configured")}
        </div>
      ) : (
        <>
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">{t("pay.no_methods")}</p>
          ) : (
            <div className="space-y-3 mb-4">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-neo neo-2">
                  <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {brandLabel(m.brand)} •••• {m.last4 || "····"}
                    </div>
                    {m.exp_month && m.exp_year && (
                      <div className="text-xs text-muted-foreground">
                        {t("pay.expires")} {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)}
                      </div>
                    )}
                  </div>
                  {m.is_default ? (
                    <Badge className="text-xs">{t("pay.default")}</Badge>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => makeDefault(m.id)}>
                      {t("pay.make_default")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeMethod(m.id)}
                    aria-label={t("pay.delete_method")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button onClick={openProviderPortal} disabled={busy} variant="outline" className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            {methods.length ? t("pay.manage_cards") : t("pay.add_card")}
          </Button>
        </>
      )}
    </div>
  );
};
