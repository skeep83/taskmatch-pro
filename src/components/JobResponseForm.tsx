import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clock, Euro, Shield, Send } from 'lucide-react';
import { submitJobResponse } from '@/lib/jobResponseSubmission';
import { useEnhancedI18n } from "@/i18n/enhanced";

interface JobResponseFormProps {
  jobId: string;
  jobTitle: string;
  budgetMinCents?: number;
  budgetMaxCents?: number;
  onApplicationSubmit?: () => void;
}

export const JobResponseForm = ({
  jobId,
  jobTitle,
  budgetMinCents,
  budgetMaxCents,
  onApplicationSubmit
}: JobResponseFormProps) => {
  const { t } = useEnhancedI18n();
  const [formData, setFormData] = useState({
    price: '',
    etaSlot: '',
    note: '',
    warrantyDays: '7'
  });
  const [loading, setLoading] = useState(false);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const budgetMin = budgetMinCents ? Math.round(budgetMinCents / 100) : null;
  const budgetMax = budgetMaxCents ? Math.round(budgetMaxCents / 100) : null;

  const getReadableErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message.trim() : String(error ?? '').trim();

    if (message.includes('Only professionals can apply to jobs')) {
      return {
        title: t("ui.neobhodima_rol_specialista"),
        description: t("ui.chtoby_otpravliat_predlozheniia_na")
      };
    }

    if (message.includes('You cannot send a proposal to your own job')) {
      return {
        title: t("ui.eto_vash_sobstvennyi_zakaz"),
        description: t("ui.nelzia_otklikatsia_na_sobstvennyi")
      };
    }

    if (message.includes('You need to configure your services first')) {
      return {
        title: t("ui.snachala_nastroite_uslugi"),
        description: t("ui.dobavte_v_profile_hotia")
      };
    }

    if (message.includes('You do not offer services in')) {
      return {
        title: t("ui.kategoriia_ne_podkliuchena"),
        description: t("ui.u_vas_ne_podkliuchena_2")
      };
    }

    if (message.includes('You have already applied to this job')) {
      return {
        title: t("ui.predlozhenie_uzhe_otpravleno"),
        description: t("ui.vy_uzhe_otpravili_predlozhenie")
      };
    }

    if (message.includes('Job not found or no longer available')) {
      return {
        title: t("ui.zakaz_uzhe_nedostupen"),
        description: t("ui.zakaz_byl_zakryt_udalen")
      };
    }

    return {
      title: t("notifications.error"),
      description: message || t("ui.ne_udalos_otpravit_predlozhenie")
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation with detailed logging
    console.log('JobResponseForm submission - formData:', formData);

    if (!formData.price) {
      console.error('Validation failed: empty price field');
      toast({
        title: t("notifications.error"),
        description: t("ui.vvedite_cenu"),
        variant: 'destructive'
      });
      return;
    }

    const priceNumber = Number(formData.price);
    console.log('Price validation:', {
      original: formData.price,
      converted: priceNumber,
      valid: !isNaN(priceNumber) && priceNumber > 0
    });

    if (isNaN(priceNumber) || priceNumber <= 0) {
      console.error('Validation failed: invalid price number', { price: formData.price, converted: priceNumber });
      toast({
        title: t("notifications.error"),
        description: t("ui.ukazhite_korrektnuiu_cenu"),
        variant: 'destructive'
      });
      return;
    }

    const priceCents = Math.round(priceNumber * 100);
    console.log('Final request data:', {
      jobId,
      priceCents,
      etaSlot: formData.etaSlot || undefined,
      note: formData.note || undefined,
      warrantyDays: Number(formData.warrantyDays) || 0
    });

    setLoading(true);
    try {
      const { error } = await submitJobResponse({
        jobId,
        priceCents,
        etaSlot: formData.etaSlot,
        note: formData.note,
        warrantyDays: Number(formData.warrantyDays) || 0,
      });

      if (error) throw error;

      toast({
        title: t("ui.predlozhenie_otpravleno"),
        description: t("ui.zakazchik_poluchit_vashe_predlozhenie")
      });

      // Reset form
      setFormData({
        price: '',
        etaSlot: '',
        note: '',
        warrantyDays: '7'
      });

      if (onApplicationSubmit) {
        onApplicationSubmit();
      }

    } catch (error: unknown) {
      console.error('Error submitting application:', error);
      const errorInfo = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

      // Enhanced error logging for better debugging
      const errorData = {
        timestamp: new Date().toISOString(),
        component: 'JobResponseForm',
        jobId: jobId,
        formData: {
          priceCents: Math.round(Number(formData.price) * 100),
          etaSlot: formData.etaSlot,
          warrantyDays: Number(formData.warrantyDays)
        },
        error: {
          message: errorInfo.message,
          name: errorInfo.name,
          stack: errorInfo.stack
        }
      };

      console.error('Detailed job application error:', errorData);

      const readableError = getReadableErrorMessage(error);
      const shouldOfferSettings =
        errorInfo.message.includes('You need to configure your services first') ||
        errorInfo.message.includes('You do not offer services in');

      toast({
        title: readableError.title,
        description: readableError.description,
        variant: 'destructive',
        action: shouldOfferSettings ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/profile/settings'}
          >
            Настройки
          </Button>
        ) : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="card-surface border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Send className="w-5 h-5 text-primary" />
          </div>
          Отправить предложение по заказу
        </CardTitle>
        <p className="text-muted-foreground">
          Укажите цену, срок и комментарий для заказа "{jobTitle}"
        </p>
        {(budgetMin || budgetMax) && (
          <div className="flex items-center gap-2 text-sm">
            <Euro className="w-4 h-4 text-success" />
            <span className="font-medium">
              Бюджет: {budgetMin && budgetMax
                ? `${formatPrice(budgetMin * 100)} - ${formatPrice(budgetMax * 100)}`
                : budgetMin
                ? `от ${formatPrice(budgetMin * 100)}`
                : budgetMax
                ? `до ${formatPrice(budgetMax * 100)}`
                : t("dash.client.budget_na")}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-green-500" />
              Ваша цена (₽) *
            </Label>
            {(budgetMin || budgetMax) && (
              <p className="text-xs text-muted-foreground">
                Бюджет заказа: {budgetMin ? `от ${budgetMin}₽` : ''} {budgetMax ? `до ${budgetMax}₽` : ''}
              </p>
            )}
            <Input
              id="price"
              type="number"
              min="1"
              step="1"
              placeholder={t("ui.vvedite_cenu")}
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              required
            />
          </div>

          {/* ETA Slot */}
          <div className="space-y-2">
            <Label htmlFor="etaSlot" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Когда можете выполнить
            </Label>
            <select
              id="etaSlot"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={formData.etaSlot}
              onChange={(e) => handleInputChange('etaSlot', e.target.value)}
            >
              <option value="">{t("ui.vyberite_vremia")}</option>
              <option value="today">{t("hero.mock.urgency")}</option>
              <option value="tomorrow">{t("ui.zavtra")}</option>
              <option value="2-3_days">{t("ui.cherez_2_3_dnia")}</option>
              <option value="next_week">{t("ui.na_sleduiuschei_nedele")}</option>
              <option value="flexible">{t("biz.jobs.by_agreement")}</option>
            </select>
          </div>

          {/* Warranty */}
          <div className="space-y-2">
            <Label htmlFor="warranty" className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              Гарантия (дней)
            </Label>
            <Input
              id="warranty"
              type="number"
              min="0"
              max="365"
              value={formData.warrantyDays}
              onChange={(e) => handleInputChange('warrantyDays', e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">{t("ui.kommentarii_k_otkliku")}</Label>
            <Textarea
              id="note"
              placeholder="Расскажите о своем опыте, подходе к решению задачи, используемых материалах..."
              rows={4}
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("ui.otpravliaiu") : t("dash.pro.send_offer")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};