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
      
      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: params.amountCents,
          currency: params.currency || 'usd',
          name: params.name || 'ServiceHub Payment'
        }
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({ 
        title: "Ошибка платежа", 
        description: error.message || "Не удалось инициировать платеж", 
        variant: "destructive" 
      });
    }
  }

  async startSubscription(params: { priceCents: number; interval?: 'month'|'year' }) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Call subscription creation edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: params.priceCents,
          interval: params.interval || 'month',
          type: 'subscription'
        }
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({ 
        title: "Ошибка подписки", 
        description: error.message || "Не удалось создать подписку", 
        variant: "destructive" 
      });
    }
  }

  async openCustomerPortal() {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Call customer portal edge function
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      // Redirect to Stripe customer portal
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({ 
        title: "Ошибка портала", 
        description: error.message || "Не удалось открыть портал", 
        variant: "destructive" 
      });
    }
  }
}

export const paymentProvider: PaymentProvider = new StripePaymentProvider();
