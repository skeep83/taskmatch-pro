import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";

const PaymentSuccess = () => {
  const { t } = useI18n();
  return (
    <main className="container mx-auto py-16 text-center">
      <Seo title={`${t('app.name')} — Success`} description="Payment successful" canonical="/payment-success" />
      <h1 className="text-3xl font-semibold mb-4">Payment successful</h1>
      <p className="text-muted-foreground">Спасибо! Мы получили платеж. Детали доступны в вашем аккаунте.</p>
    </main>
  );
};

export default PaymentSuccess;
