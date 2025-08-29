import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clock, Euro, Shield, Send } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.price || Number(formData.price) <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Укажите корректную цену',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('job-application-create', {
        body: {
          jobId,
          priceCents: Math.round(Number(formData.price) * 100),
          etaSlot: formData.etaSlot || undefined,
          note: formData.note || undefined,
          warrantyDays: Number(formData.warrantyDays) || 0
        }
      });

      if (error) throw error;

      toast({
        title: 'Отклик отправлен!',
        description: 'Клиент получит уведомление о вашем предложении'
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

    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отправить отклик',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Откликнуться на заказ
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Предложите свою цену и условия для заказа "{jobTitle}"
        </p>
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
                Бюджет клиента: {budgetMin ? `от ${budgetMin}₽` : ''} {budgetMax ? `до ${budgetMax}₽` : ''}
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
            <Label htmlFor="note">Комментарий к предложению</Label>
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