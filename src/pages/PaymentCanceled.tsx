import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";

const PaymentCanceled = () => {
  const { t } = useI18n();
  return (
    <main className="container mx-auto py-16 text-center">
      <Seo title={`${t('app.name')} — Canceled`} description="Payment canceled" canonical="/payment-canceled" />
      <h1 className="text-3xl font-semibold mb-4">Payment canceled</h1>
      <p className="text-muted-foreground">Операция отменена. Вы можете повторить попытку позже.</p>
    </main>
  );
};

export default PaymentCanceled;
