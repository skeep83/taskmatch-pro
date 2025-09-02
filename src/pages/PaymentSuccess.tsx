import { useEnhancedI18n } from "@/i18n/enhanced";
import { Seo } from "@/components/Seo";

const PaymentSuccess = () => {
  const { t } = useEnhancedI18n();
  return (
    <main className="container mx-auto py-16 text-center">
      <Seo title={`${t('app.name')} — Success`} description="Payment successful" canonical="/payment-success" />
      <h1 className="text-3xl font-semibold mb-4">{t('payments.success.title')}</h1>
      <p className="text-muted-foreground">{t('payments.success.message')}</p>
    </main>
  );
};

export default PaymentSuccess;
