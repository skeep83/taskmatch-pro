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
        title: 'Необходима роль специалиста',
        description: 'Чтобы отправлять предложения на заказы, вам нужно включить роль специалиста в профиле.'
      };
    }

    if (message.includes('You cannot send a proposal to your own job')) {
      return {
        title: 'Это ваш собственный заказ',
        description: 'Нельзя откликаться на собственный заказ от имени специалиста.'
      };
    }

    if (message.includes('You need to configure your services first')) {
      return {
        title: 'Сначала настройте услуги',
        description: 'Добавьте в профиле хотя бы одну услугу, чтобы откликаться на заказы.'
      };
    }

    if (message.includes('You do not offer services in')) {
      return {
        title: 'Категория не подключена',
        description: 'У вас не подключена эта категория услуг. Добавьте её в настройках профиля.'
      };
    }

    if (message.includes('You have already applied to this job')) {
      return {
        title: 'Предложение уже отправлено',
        description: 'Вы уже отправили предложение на этот заказ.'
      };
    }

    if (message.includes('Job not found or no longer available')) {
      return {
        title: 'Заказ уже недоступен',
        description: 'Заказ был закрыт, удалён или уже недоступен для новых откликов.'
      };
    }

    return {
      title: 'Ошибка',
      description: message || 'Не удалось отправить предложение'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation with detailed logging
    console.log('JobResponseForm submission - formData:', formData);

    if (!formData.price) {
      console.error('Validation failed: empty price field');
      toast({
        title: 'Ошибка',
        description: 'Введите цену',
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
        title: 'Ошибка',
        description: 'Укажите корректную цену',
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
        title: 'Предложение отправлено!',
        description: 'Заказчик получит ваше предложение и сможет выбрать исполнителя'
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
                : 'Не указан'}
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
              placeholder="Введите цену"
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
              <option value="">Выберите время</option>
              <option value="today">Сегодня</option>
              <option value="tomorrow">Завтра</option>
              <option value="2-3_days">Через 2-3 дня</option>
              <option value="next_week">На следующей неделе</option>
              <option value="flexible">По договоренности</option>
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
            <Label htmlFor="note">Комментарий к отклику</Label>
            <Textarea
              id="note"
              placeholder="Расскажите о своем опыте, подходе к решению задачи, используемых материалах..."
              rows={4}
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Отправляю...' : 'Отправить предложение'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};