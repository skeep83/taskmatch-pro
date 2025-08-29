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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';

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
  const { formatPrice, parsePriceInput } = useCurrency();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const priceCents = parsePriceInput(formData.price);
      
      if (!priceCents || priceCents <= 0) {
        toast({
          title: "Ошибка",
          description: "Укажите корректную цену",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.functions.invoke('job-price-proposal-create', {
        body: {
          jobId,
          priceCents,
          etaSlot: formData.etaSlot,
          note: formData.note,
          warrantyDays: formData.warrantyDays
        }
      });

      if (error) throw error;

      toast({
        title: "Предложение отправлено",
        description: "Заказчик получит уведомление о вашем предложении"
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
    } catch (error: any) {
      console.error('Error submitting price proposal:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить предложение",
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
            Предложить свою цену
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Заказ: {jobTitle}
          </p>
          {(budgetMinCents || budgetMaxCents) && (
            <div className="text-sm text-muted-foreground">
              Бюджет заказчика: {' '}
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
              <Label htmlFor="note">Примечание</Label>
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