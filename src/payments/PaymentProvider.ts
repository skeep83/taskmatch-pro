import { toast } from "@/hooks/use-toast";

export interface PaymentProvider {
  startOneOffPayment(params: { amountCents: number; currency?: string; name?: string }): Promise<void>;
  startSubscription(params: { priceCents: number; interval?: 'month'|'year' }): Promise<void>;
  openCustomerPortal(): Promise<void>;
}

export class StripePaymentProvider implements PaymentProvider {
  async startOneOffPayment(params: { amountCents: number; currency?: string; name?: string }) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: params,
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      console.error(e);
      toast({ title: "Платеж недоступен", description: "Подключите Supabase и Stripe секреты", variant: "destructive" });
    }
  }
  async startSubscription(params: { priceCents: number; interval?: 'month'|'year' }) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: params,
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      console.error(e);
      toast({ title: "Подписка недоступна", description: "Подключите Supabase и Stripe секреты", variant: "destructive" });
    }
  }
  async openCustomerPortal() {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      console.error(e);
      toast({ title: "Портал недоступен", description: "Подключите Supabase и Stripe секреты", variant: "destructive" });
    }
  }
}

export const paymentProvider: PaymentProvider = new StripePaymentProvider();
