import { toast } from "@/hooks/use-toast";

export interface PaymentProvider {
  startOneOffPayment(params: { amountCents: number; currency?: string; name?: string }): Promise<void>;
  startSubscription(params: { priceCents: number; interval?: 'month'|'year' }): Promise<void>;
  openCustomerPortal(): Promise<void>;
}

export class StripePaymentProvider implements PaymentProvider {
  async startOneOffPayment(params: { amountCents: number; currency?: string; name?: string }) {
    // Временная заглушка - симуляция успешного платежа
    toast({ title: "Платеж обрабатывается", description: `Сумма: ${(params.amountCents / 100).toFixed(2)} ${params.currency || 'USD'}`, variant: "default" });
    setTimeout(() => {
      toast({ title: "Платеж успешен", description: "Средства зарезервированы в escrow", variant: "default" });
    }, 2000);
  }
  async startSubscription(params: { priceCents: number; interval?: 'month'|'year' }) {
    // Временная заглушка - симуляция активации подписки
    toast({ title: "Подписка активируется", description: `Plan: ${(params.priceCents / 100).toFixed(2)}/месяц`, variant: "default" });
    setTimeout(() => {
      toast({ title: "Подписка активна", description: "HomeCare план подключен", variant: "default" });
    }, 2000);
  }
  async openCustomerPortal() {
    // Временная заглушка - симуляция портала
    toast({ title: "Портал открывается", description: "Переход к управлению подпиской", variant: "default" });
  }
}

export const paymentProvider: PaymentProvider = new StripePaymentProvider();
