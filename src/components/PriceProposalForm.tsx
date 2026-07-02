import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { User, DollarSign, Clock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { submitJobResponse } from '@/lib/jobResponseSubmission';
import { useEnhancedI18n } from "@/i18n/enhanced";

interface PriceProposalFormProps {
  jobId: string;
  jobTitle: string;
  budgetMinCents?: number;
  budgetMaxCents?: number;
  clientRating?: {
    average: number;
    count: number;
  };
  onProposalSubmit?: () => void;
}

export const PriceProposalForm = ({
  jobId,
  jobTitle,
  budgetMinCents,
  budgetMaxCents,
  clientRating,
  onProposalSubmit
}: PriceProposalFormProps) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    etaSlot: '',
    note: '',
    warrantyDays: 30
  });

  const etaOptions = [
    { value: 'same_day', label: t("hero.mock.urgency") },
    { value: 'next_day', label: t("ui.zavtra") },
    { value: 'within_3_days', label: t("ui.v_techenie_3_dnei") },
    { value: 'within_week', label: t("ui.v_techenie_nedeli") },
    { value: 'within_2_weeks', label: t("ui.v_techenie_2_nedel") },
    { value: 'custom', label: t("ui.drugoe_ukazhite_v_primechanii") }
  ];

  const getReadableErrorMessage = (error: unknown) => {
    const raw = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
    const message = raw.trim();

    if (message.includes('Pro role required')) {
      return {
        title: t("ui.neobhodima_rol_specialista"),
        description: t("ui.chtoby_otpravliat_cenovye_predlozheniia")
      };
    }

    if (message.includes('Unauthorized')) {
      return {
        title: t("messages.login_required"),
        description: t("ui.snachala_voidite_v_akkaunt")
      };
    }

    if (message.includes('Job not found or not available')) {
      return {
        title: t("ui.zakaz_uzhe_nedostupen"),
        description: t("ui.etot_zakaz_bolshe_ne")
      };
    }

    if (message.includes('Failed to create proposal') || message.includes('Failed to update proposal')) {
      return {
        title: t("ui.ne_udalos_sohranit_predlozhenie"),
        description: t("ui.predlozhenie_ne_bylo_sohraneno")
      };
    }

    return {
      title: t("notifications.error"),
      description: message || t("ui.ne_udalos_otpravit_predlozhenie")
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert price to cents (assuming input is in main currency unit)
      const priceCents = Math.round(parseFloat(formData.price) * 100);

      if (!priceCents || priceCents <= 0) {
        toast({
          title: t("notifications.error"),
          description: t("ui.ukazhite_korrektnuiu_cenu"),
          variant: "destructive"
        });
        return;
      }

      const { error } = await submitJobResponse({
        jobId,
        priceCents,
        etaSlot: formData.etaSlot,
        note: formData.note,
        warrantyDays: formData.warrantyDays,
      });

      if (error) throw error;

      toast({
        title: t("ui.predlozhenie_otpravleno_2"),
        description: t("ui.zakazchik_poluchit_vashe_predlozhenie")
      });

      // Reset form
      setFormData({
        price: '',
        etaSlot: '',
        note: '',
        warrantyDays: 30
      });

      if (onProposalSubmit) {
        onProposalSubmit();
      }
    } catch (error: unknown) {
      console.error('Error submitting price proposal:', error);
      const errorInfo = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

      // Enhanced error logging for better debugging
      const errorData = {
        timestamp: new Date().toISOString(),
        component: 'PriceProposalForm',
        jobId: jobId,
        formData: {
          priceCents: Math.round(parseFloat(formData.price) * 100),
          etaSlot: formData.etaSlot,
          warrantyDays: formData.warrantyDays
        },
        error: {
          message: errorInfo.message,
          name: errorInfo.name,
          stack: errorInfo.stack
        }
      };

      console.error('Detailed price proposal error:', errorData);

      const readableError = getReadableErrorMessage(error);
      toast({
        title: readableError.title,
        description: readableError.description,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Client Rating */}
      {clientRating && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Рейтинг заказчика
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StarRating
                  rating={clientRating.average}
                  size="lg"
                  showValue
                  showCount
                  count={clientRating.count}
                />
              </div>
              <Badge variant={clientRating.average >= 4.5 ? "default" : "secondary"}>
                {clientRating.average >= 4.8 ? t("ui.otlichnyi") :
                 clientRating.average >= 4.0 ? t("ui.horoshii") : t("ui.srednii")} заказчик
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Proposal Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Отправить предложение с ценой
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Заказ: {jobTitle}
          </p>
          {(budgetMinCents || budgetMaxCents) && (
            <div className="text-sm text-muted-foreground">
              Бюджет заказа: {' '}
              {budgetMinCents && budgetMaxCents
                ? `${formatPrice(budgetMinCents)} - ${formatPrice(budgetMaxCents)}`
                : budgetMinCents
                ? `от ${formatPrice(budgetMinCents)}`
                : budgetMaxCents
                ? `до ${formatPrice(budgetMaxCents)}`
                : t("dash.client.budget_na")
              }
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="price">{t("ui.vasha_cena")}</Label>
              <Input
                id="price"
                placeholder={t("ui.naprimer_1500")}
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Укажите итоговую стоимость работы
              </p>
            </div>

            <div>
              <Label htmlFor="eta">{t("ui.srok_vypolneniia")}</Label>
              <Select value={formData.etaSlot} onValueChange={(value) => handleInputChange('etaSlot', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("ui.vyberite_srok")} />
                </SelectTrigger>
                <SelectContent>
                  {etaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="warranty">{t("ui.garantiia_dnei")}</Label>
              <Input
                id="warranty"
                type="number"
                min="0"
                max="365"
                value={formData.warrantyDays}
                onChange={(e) => handleInputChange('warrantyDays', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Гарантийный срок на выполненную работу
              </p>
            </div>

            <div>
              <Label htmlFor="note">{t("ui.kommentarii_k_predlozheniiu")}</Label>
              <Textarea
                id="note"
                placeholder={t("ui.dopolnitelnaia_informaciia_o_rabote")}
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t("ui.otpravliaem") : t("dash.pro.send_offer")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};