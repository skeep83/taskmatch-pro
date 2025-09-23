import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Shield, 
  DollarSign, 
  Calendar, 
  MessageCircle, 
  Send,
  Lightbulb
} from 'lucide-react';

interface QuickResponseFormProps {
  jobId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
  price_cents: number;
  warranty_days: number;
}

export const QuickResponseForm: React.FC<QuickResponseFormProps> = ({
  jobId,
  onSuccess,
  onCancel,
  className
}) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    price: '',
    estimatedHours: '',
    warrantyDays: '30',
    etaDate: '',
    comment: '',
    templateId: ''
  });
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const etaOptions = [
    { value: 'today', label: 'Сегодня' },
    { value: 'tomorrow', label: 'Завтра' },
    { value: '2-3-days', label: '2-3 дня' },
    { value: 'this-week', label: 'На этой неделе' },
    { value: 'next-week', label: 'На следующей неделе' },
    { value: 'custom', label: 'Выбрать дату' }
  ];

  const warrantyOptions = [
    { value: '0', label: 'Без гарантии' },
    { value: '7', label: '7 дней' },
    { value: '30', label: '30 дней' },
    { value: '90', label: '3 месяца' },
    { value: '180', label: '6 месяцев' },
    { value: '365', label: '1 год' }
  ];

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('response_templates')
        .select('*')
        .eq('provider_id', user.id)
        .order('is_default', { ascending: false });

      if (data) {
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        templateId,
        comment: template.content,
        price: (template.price_cents / 100).toString(),
        warrantyDays: template.warranty_days.toString()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.price || !formData.comment) {
      toast({
        title: 'Ошибка',
        description: 'Заполните цену и комментарий',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const priceInCents = Math.round(parseFloat(formData.price) * 100);

      const { error } = await supabase
        .from('job_responses')
        .insert({
          job_id: jobId,
          provider_id: user.id,
          price_cents: priceInCents,
          estimated_hours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
          warranty_days: parseInt(formData.warrantyDays),
          eta_date: formData.etaDate || null,
          comment: formData.comment,
          template_used: formData.templateId || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Отклик отправлен!',
        description: 'Ваш отклик успешно отправлен клиенту'
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить отклик',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Send size={20} className="text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Быстрый отклик</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Шаблоны */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Использовать шаблон
            </label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите шаблон ответа" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {template.price_cents / 100} MDL
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Основные поля */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <DollarSign size={16} className="inline mr-1" />
              Цена (MDL) *
            </label>
            <Input
              type="number"
              placeholder="500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              min="1"
              step="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Shield size={16} className="inline mr-1" />
              Гарантия
            </label>
            <Select 
              value={formData.warrantyDays} 
              onValueChange={(value) => setFormData({ ...formData, warrantyDays: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warrantyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Готовность к выезду */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Calendar size={16} className="inline mr-1" />
            Готов выехать
          </label>
          <Select 
            value={formData.etaDate} 
            onValueChange={(value) => setFormData({ ...formData, etaDate: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите время" />
            </SelectTrigger>
            <SelectContent>
              {etaOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Дополнительные поля */}
        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock size={16} className="inline mr-1" />
              Время работы (часов)
            </label>
            <Input
              type="number"
              placeholder="4"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              min="0.5"
              step="0.5"
            />
          </div>
        )}

        {/* Комментарий */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <MessageCircle size={16} className="inline mr-1" />
            Комментарий *
          </label>
          <Textarea
            placeholder="Опишите, как вы выполните эту работу, какие материалы потребуются, особенности..."
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            rows={4}
            required
          />
        </div>

        {/* Дополнительные опции */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
          >
            <Lightbulb size={16} />
            {showAdvanced ? 'Скрыть' : 'Дополнительно'}
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Готов выехать завтра</span>
          </div>
        </div>

        {/* Действия */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Отправка...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Отправить отклик
              </>
            )}
          </Button>
          
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          )}
        </div>

        {/* Подсказка */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Lightbulb size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Совет для успешного отклика:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                <li>Укажите реалистичную цену</li>
                <li>Детально опишите план работ</li>
                <li>Предложите гарантию на результат</li>
                <li>Будьте готовы к быстрому выезду</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
};