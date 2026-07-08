import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentConfig {
  provider: "stripe" | "maib" | "paynet";
  mode: "test" | "live";
  currency: string;
  publishableKey: string;
  applePayEnabled: boolean;
  googlePayEnabled: boolean;
  paymentsEnabled: boolean;
  feePercent: number;
  taxPercent: number;
  /** true when a publishable key is present and payments are switched on */
  isConfigured: boolean;
}

const DEFAULTS: PaymentConfig = {
  provider: "stripe",
  mode: "test",
  currency: "mdl",
  publishableKey: "",
  applePayEnabled: false,
  googlePayEnabled: false,
  paymentsEnabled: false,
  feePercent: 10,
  taxPercent: 0,
  isConfigured: false,
};

const parse = (v: unknown): unknown => (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v);

/** Reads the public payment configuration from platform_settings (category 'payments'). */
export const usePaymentConfig = () => {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("key, value")
          .eq("category", "payments");
        if (!mounted || !data) return;
        const map: Record<string, unknown> = {};
        data.forEach((r) => { map[r.key] = parse(r.value); });
        const publishableKey = String(map.stripe_publishable_key || "");
        const paymentsEnabled = map.payments_enabled === true;
        setConfig({
          provider: (map.payment_provider as PaymentConfig["provider"]) || "stripe",
          mode: (map.payment_mode as PaymentConfig["mode"]) || "test",
          currency: String(map.payment_currency || "mdl"),
          publishableKey,
          applePayEnabled: map.apple_pay_enabled === true,
          googlePayEnabled: map.google_pay_enabled === true,
          paymentsEnabled,
          feePercent: Number(map.platform_fee_percent ?? 10) || 0,
          taxPercent: Number(map.tax_percent ?? 0) || 0,
          isConfigured: paymentsEnabled && publishableKey.length > 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { config, loading };
};
