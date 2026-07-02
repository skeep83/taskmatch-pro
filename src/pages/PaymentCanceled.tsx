import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, CreditCard, ListChecks } from "lucide-react";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Seo } from "@/components/Seo";

const PaymentCanceled = () => {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');
  const returnToJob = () => {
    if (jobId) {
      navigate(`/job/${jobId}`);
      return;
    }
    navigate('/dashboard/client');
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <Seo title={`${t('app.name')} — Оплата отменена`} description="Оплата была прервана или отменена. Вы можете вернуться к заказу и повторить попытку." canonical="/payment-canceled" />
      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{t('payments.canceled.title')}</h1>
            <p className="text-muted-foreground">{t('payments.canceled.message')}</p>
            <p className="text-sm text-amber-800">
              Платёж не завершён — заказ не оплачен. Вы можете вернуться к заказу, проверить детали и при необходимости повторить оплату.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-white/80 p-4 text-left space-y-2">
            <div className="font-medium text-foreground">Что делать дальше</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span>1.</span><span>Вернитесь к заказу и проверьте, нужен ли повторный запуск оплаты.</span></li>
              <li className="flex gap-2"><span>2.</span><span>Если заказ уже неактуален, просто оставьте его без оплаты или удалите позже из кабинета.</span></li>
              <li className="flex gap-2"><span>3.</span><span>Если отмена была случайной, повторите попытку из карточки заказа.</span></li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={returnToJob} className="gap-2">
              <CreditCard className="h-4 w-4" />
              {jobId ? 'Вернуться к заказу' : 'Перейти в кабинет'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/client')} className="gap-2">
              <ListChecks className="h-4 w-4" />
              Мои заказы
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default PaymentCanceled;
