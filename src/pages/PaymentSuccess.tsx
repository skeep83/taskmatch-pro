import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, CreditCard, ListChecks } from "lucide-react";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Seo } from "@/components/Seo";

const PaymentSuccess = () => {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');

  const goToNextStep = () => {
    if (jobId) {
      navigate(`/job/${jobId}?payment_success=1`);
      return;
    }
    navigate('/dashboard/client');
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <Seo
        title={`${t('app.name')} — Платёж подтверждён`}
        description="Платёж прошёл успешно. Вернитесь к заказу или продолжайте работу из кабинета."
        canonical="/payment-success"
      />
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{t('payments.success.title')}</h1>
            <p className="text-muted-foreground">{t('payments.success.message')}</p>
            <p className="text-sm text-emerald-800">
              Платёж подтверждён — теперь можно вернуться к заказу, проверить статус и продолжить работу уже внутри карточки.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white/80 p-4 text-left space-y-2">
            <div className="font-medium text-foreground">Что делать дальше</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span>1.</span><span>Вернитесь к заказу и убедитесь, что дальнейшие шаги понятны обеим сторонам.</span></li>
              <li className="flex gap-2"><span>2.</span><span>Следите за статусом заказа, сообщениями и подтверждением выполнения внутри платформы.</span></li>
              <li className="flex gap-2"><span>3.</span><span>Если вы оплатили не тот сценарий или видите несоответствие, проверьте детали в кабинете.</span></li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={goToNextStep} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              {jobId ? 'Вернуться к заказу' : 'Перейти в кабинет'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/client')} className="gap-2">
              <ListChecks className="h-4 w-4" />
              Мои заказы
            </Button>
            <Button variant="ghost" onClick={() => navigate('/payment-canceled')} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Что делать при проблеме с оплатой
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default PaymentSuccess;
