import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  category_id: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  location_address?: string;
  scheduled_at?: string;
  urgency: string;
}

const JobEdit = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (jobId) {
      fetchJob();
      fetchCategories();
    }
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      // Check if job can be edited (no payment and is owner)
      const { data: escrow } = await supabase
        .from('escrows')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();

      if (escrow) {
        toast({
          title: 'Редактирование невозможно',
          description: 'Заказ нельзя редактировать после оплаты депозита',
          variant: 'destructive'
        });
        navigate(`/job/${jobId}`);
        return;
      }

      setJob(data);
    } catch (error: any) {
      console.error('Error fetching job:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заказ',
        variant: 'destructive'
      });
      navigate('/dashboard/client');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('label_ru');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const updateData: any = {
        title: formData.get('title'),
        description: formData.get('description'),
        category_id: formData.get('category_id'),
        location_address: formData.get('location_address'),
        urgency: formData.get('urgency'),
        updated_at: new Date().toISOString()
      };

      const budgetMin = formData.get('budget_min');
      const budgetMax = formData.get('budget_max');
      const date = formData.get('date');
      const time = formData.get('time');

      if (budgetMin) updateData.budget_min_cents = parseInt(budgetMin as string) * 100;
      if (budgetMax) updateData.budget_max_cents = parseInt(budgetMax as string) * 100;
      
      if (date && time) {
        updateData.scheduled_at = new Date(`${date}T${time}`).toISOString();
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Заказ обновлен',
        description: 'Изменения успешно сохранены'
      });
      navigate(`/job/${jobId}`);
    } catch (error: any) {
      console.error('Error updating job:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить заказ: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8">Загрузка...</div>;
  }

  if (!job) {
    return <div className="container mx-auto py-8">Заказ не найден</div>;
  }

  const scheduledDateTime = job.scheduled_at ? new Date(job.scheduled_at) : null;

  return (
    <main className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/job/${jobId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold">Редактировать заказ</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Детали заказа</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Заголовок</label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={job.title}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Например: Установить розетку"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Описание</label>
                  <textarea
                    name="description"
                    defaultValue={job.description}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Опишите детали работы..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Категория</label>
                  <select
                    name="category_id"
                    defaultValue={job.category_id}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label_ru}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Срочность</label>
                  <select
                    name="urgency"
                    defaultValue={job.urgency}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="normal">Обычная</option>
                    <option value="urgent">Срочная</option>
                    <option value="same_day">В тот же день</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Адрес</label>
                  <input
                    name="location_address"
                    type="text"
                    defaultValue={job.location_address || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Укажите адрес выполнения работ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Бюджет от (₽)</label>
                  <input
                    name="budget_min"
                    type="number"
                    defaultValue={job.budget_min_cents ? Math.round(job.budget_min_cents / 100) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Бюджет до (₽)</label>
                  <input
                    name="budget_max"
                    type="number"
                    defaultValue={job.budget_max_cents ? Math.round(job.budget_max_cents / 100) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Дата</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={scheduledDateTime ? scheduledDateTime.toISOString().split('T')[0] : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Время</label>
                  <input
                    name="time"
                    type="time"
                    defaultValue={scheduledDateTime ? scheduledDateTime.toTimeString().split(' ')[0].slice(0, 5) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="submit" disabled={saving} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/job/${jobId}`)}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default JobEdit;