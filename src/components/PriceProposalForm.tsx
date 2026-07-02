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
    { value: 'same_day', label: 'Сегодня' },
    { value: 'next_day', label: 'Завтра' },
    { value: 'within_3_days', label: 'В течение 3 дней' },
    { value: 'within_week', label: 'В течение недели' },
    { value: 'within_2_weeks', label: 'В течение 2 недель' },
    { value: 'custom', label: 'Другое (укажите в примечании)' }
  ];

  const getReadableErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message.trim() : String(error ?? '').trim();

    if (message.includes('Pro role required')) {
      return {
        title: 'Необходима роль специалиста',
        description: 'Чтобы отправлять ценовые предложения, вам нужно включить роль специалиста в профиле.'
      };
    }

    if (message.includes('Unauthorized')) {
      return {
        title: 'Требуется вход',
        description: 'Сначала войдите в аккаунт, затем повторите отправку предложения.'
      };
    }

    if (message.includes('Job not found or not available')) {
      return {
        title: 'Заказ уже недоступен',
        description: 'Этот заказ больше не принимает предложения.'
      };
    }

    if (message.includes('Failed to create proposal') || message.includes('Failed to update proposal')) {
      return {
        title: 'Не удалось сохранить предложение',
        description: 'Предложение не было сохранено. Попробуйте ещё раз.'
      };
    }

    return {
      title: 'Ошибка',
      description: message || 'Не удалось отправить предложение'
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
          title: "Ошибка",
          description: "Укажите корректную цену",
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
        title: "Предложение отправлено",
        description: "Заказчик получит ваше предложение и сможет выбрать исполнителя"
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
                {clientRating.average >= 4.8 ? "Отличный" :
                 clientRating.average >= 4.0 ? "Хороший" : "Средний"} заказчик
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
                : 'Не указан'
              }
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="price">Ваша цена *</Label>
              <Input
                id="price"
                placeholder="Например: 1500"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Укажите итоговую стоимость работы
              </p>
            </div>

            <div>
              <Label htmlFor="eta">Срок выполнения *</Label>
              <Select value={formData.etaSlot} onValueChange={(value) => handleInputChange('etaSlot', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите срок" />
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
              <Label htmlFor="warranty">Гарантия (дней)</Label>
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
              <Label htmlFor="note">Комментарий к предложению</Label>
              <Textarea
                id="note"
                placeholder="Дополнительная информация о работе, материалах, особенностях..."
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
              {loading ? "Отправляем..." : "Отправить предложение"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};