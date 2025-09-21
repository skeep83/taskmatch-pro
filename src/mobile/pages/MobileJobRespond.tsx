import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Euro, Clock, FileText, Shield } from 'lucide-react';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function MobileJobRespond() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [formData, setFormData] = useState({
    price: '',
    eta: '',
    warranty: '30',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchJobTitle(id);
    }
  }, [id]);

  const fetchJobTitle = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJobTitle(data.title);
    } catch (error) {
      console.error('Error fetching job title:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.price) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, укажите цену",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Ошибка", 
        description: "Пожалуйста, укажите корректную цену",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('job-application-create', {
        body: {
          jobId: id,
          price: Math.round(price * 100), // Convert to cents
          eta: formData.eta,
          warranty: parseInt(formData.warranty),
          notes: formData.notes
        }
      });

      if (error) throw error;

      toast({
        title: "Отклик отправлен!",
        description: "Ваш отклик успешно отправлен заказчику"
      });

      navigate(`/job/${id}`);
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить отклик",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#E5E7EB] px-4 py-3 border-b border-[#D1D5DB]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB]"
          >
            <ArrowLeft className="w-5 h-5 text-[#374151]" />
          </button>
          <h1 className="text-lg font-semibold text-[#374151]">Отклик на заказ</h1>
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
                className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50"
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
              <SelectTrigger className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]">
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
                className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50"
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
              className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </MobileCard>

        {/* Submit Button */}
        <div className="pt-4 pb-20">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] disabled:opacity-50"
          >
            {loading ? 'Отправка...' : 'Отправить отклик'}
          </Button>
        </div>
      </form>
    </div>
  );
}