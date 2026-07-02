import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Euro, Clock, FileText, Shield } from 'lucide-react';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { submitJobResponse } from '@/lib/jobResponseSubmission';

export default function MobileJobRespond() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobClientId, setJobClientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    price: '',
    eta: '',
    warranty: '30',
    notes: ''
  });

  const fetchJobTitle = useCallback(async (jobId: string) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('jobs')
        .select('title, client_id')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      if (authData.user && data.client_id === authData.user.id) {
        toast({
          title: "Недоступно",
          description: "Нельзя откликаться на собственный заказ",
          variant: "destructive"
        });
        navigate(`/job/${jobId}`);
        return;
      }

      setJobTitle(data.title);
      setJobClientId(data.client_id);
    } catch (error) {
      console.error('Error fetching job title:', error);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (id) {
      void fetchJobTitle(id);
    }
  }, [fetchJobTitle, id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation with detailed logging
    console.log('MobileJobRespond submission - formData:', formData);

    if (!formData.price) {
      console.error('Validation failed: empty price field');
      toast({
        title: "Ошибка",
        description: "Пожалуйста, укажите цену",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.price);
    console.log('Price validation:', {
      original: formData.price,
      converted: price,
      valid: !isNaN(price) && price > 0
    });

    if (isNaN(price) || price <= 0) {
      console.error('Validation failed: invalid price number', { price: formData.price, converted: price });
      toast({
        title: "Ошибка",
        description: "Пожалуйста, укажите корректную цену",
        variant: "destructive"
      });
      return;
    }

    const priceCents = Math.round(price * 100);
    console.log('Final request data:', {
      jobId: id,
      priceCents,
      etaSlot: formData.eta,
      warrantyDays: parseInt(formData.warranty),
      note: formData.notes
    });

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user && jobClientId && authData.user.id === jobClientId) {
        throw new Error('You cannot send a proposal to your own job');
      }

      const { error } = await submitJobResponse({
        jobId: id!,
        priceCents,
        etaSlot: formData.eta,
        warrantyDays: parseInt(formData.warranty, 10),
        note: formData.notes,
      });

      if (error) throw error;

      toast({
        title: "Предложение отправлено!",
        description: "Ваше предложение успешно отправлено заказчику"
      });

      navigate(`/job/${id}`);
    } catch (error: unknown) {
      console.error('Error submitting response:', error);
      const errorInfo = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

      // Enhanced error logging for better debugging
      const errorData = {
        timestamp: new Date().toISOString(),
        component: 'MobileJobRespond',
        jobId: id,
        formData: {
          price: Math.round(parseFloat(formData.price) * 100),
          eta: formData.eta,
          warranty: parseInt(formData.warranty)
        },
        error: {
          message: errorInfo.message,
          name: errorInfo.name,
          stack: errorInfo.stack
        }
      };

      console.error('Detailed mobile job response error:', errorData);

      // Special handling for role-related errors
      if (errorInfo.message.includes('Only professionals can apply to jobs')) {
        toast({
          title: "Необходима роль специалиста",
          description: "Чтобы отправлять предложения на заказы, вам нужно включить роль специалиста в профиле.",
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You cannot send a proposal to your own job')) {
        toast({
          title: "Это ваш собственный заказ",
          description: "Нельзя откликаться на собственный заказ от имени специалиста.",
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You need to configure your services first')) {
        toast({
          title: "Сначала настройте услуги",
          description: "Добавьте в профиле хотя бы одну услугу, чтобы откликаться на заказы.",
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You do not offer services in')) {
        toast({
          title: "Категория не подключена",
          description: "У вас не подключена эта категория услуг. Добавьте её в профиле специалиста.",
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You have already applied to this job')) {
        toast({
          title: "Предложение уже отправлено",
          description: "Вы уже отправили предложение на этот заказ.",
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('Job not found or no longer available')) {
        toast({
          title: "Заказ уже недоступен",
          description: "Заказ был закрыт, удалён или уже недоступен для новых откликов.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Ошибка",
          description: errorInfo.message || "Не удалось отправить предложение",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-neo px-4 py-3 border-b border-[#D1D5DB]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-neo neo-4 active:neo-inset-2"
          >
            <ArrowLeft className="w-5 h-5 text-[#374151]" />
          </button>
          <h1 className="text-lg font-semibold text-[#374151]">Отправить предложение</h1>
          <div className="w-9 h-9" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        {/* Job Info */}
        {jobTitle && (
          <MobileCard>
            <div className="space-y-2">
              <h3 className="font-semibold text-[#374151]">Заказ</h3>
              <p className="text-[#6B7280]">{jobTitle}</p>
            </div>
          </MobileCard>
        )}

        {/* Price */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <Euro className="w-5 h-5 mr-2 text-green-500" />
              Ваша цена
            </h3>
            <div>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="Введите цену в MDL"
                className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                required
              />
              <p className="text-xs text-[#6B7280] mt-2">
                Укажите справедливую цену за выполнение работы
              </p>
            </div>
          </div>
        </MobileCard>

        {/* ETA */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              Время выполнения
            </h3>
            <Select value={formData.eta} onValueChange={(value) => handleInputChange('eta', value)}>
              <SelectTrigger className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4">
                <SelectValue placeholder="Выберите время выполнения" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_hour">1 час</SelectItem>
                <SelectItem value="2_hours">2 часа</SelectItem>
                <SelectItem value="3_hours">3 часа</SelectItem>
                <SelectItem value="same_day">В тот же день</SelectItem>
                <SelectItem value="next_day">На следующий день</SelectItem>
                <SelectItem value="2_days">2 дня</SelectItem>
                <SelectItem value="3_days">3 дня</SelectItem>
                <SelectItem value="1_week">1 неделя</SelectItem>
                <SelectItem value="2_weeks">2 недели</SelectItem>
                <SelectItem value="1_month">1 месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </MobileCard>

        {/* Warranty */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <Shield className="w-5 h-5 mr-2 text-purple-500" />
              Гарантия
            </h3>
            <div>
              <Input
                type="number"
                value={formData.warranty}
                onChange={(e) => handleInputChange('warranty', e.target.value)}
                placeholder="Количество дней"
                className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-[#6B7280] mt-2">
                Количество дней гарантии на выполненную работу
              </p>
            </div>
          </div>
        </MobileCard>

        {/* Notes */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <FileText className="w-5 h-5 mr-2 text-orange-500" />
              Дополнительная информация
            </h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Опишите, как вы будете выполнять работу, какие материалы понадобятся..."
              rows={4}
              className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </MobileCard>

        {/* Submit Button */}
        <div className="pt-4 pb-20">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold neo-8 disabled:opacity-50"
          >
            {loading ? 'Отправка...' : 'Отправить предложение'}
          </Button>
        </div>
      </form>
    </div>
  );
}