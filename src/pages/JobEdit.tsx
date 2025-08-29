import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { ArrowLeft, Save, Camera, Upload, X } from 'lucide-react';

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

interface JobPhoto {
  id: string;
  file_url: string;
  created_at: string;
}

const JobEdit = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<JobPhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);

  useEffect(() => {
    if (jobId) {
      fetchJob();
      fetchCategories();
      fetchJobPhotos();
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

  const fetchJobPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('job_photos')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at');

      if (error) throw error;
      setExistingPhotos(data || []);
    } catch (error) {
      console.error('Error fetching job photos:', error);
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

      // Delete removed photos
      if (deletedPhotoIds.length > 0) {
        await supabase
          .from('job_photos')
          .delete()
          .in('id', deletedPhotoIds);
      }

      // Upload new photos
      if (uploadedFiles.length > 0) {
        const bucket = supabase.storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `job/${jobId}/${Date.now()}-${i}.${ext}`;
            const { error: upErr } = await bucket.upload(path, file, { 
              upsert: true, 
              contentType: file.type || 'image/jpeg' 
            });
            if (upErr) throw upErr;
            
            const { error: insErr } = await supabase
              .from('job_photos')
              .insert({ job_id: jobId, file_url: path });
            if (insErr) throw insErr;
          } catch (e) {
            console.warn('Photo upload failed', e);
          }
        }
      }

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files.slice(0, 8 - prev.length)]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files.slice(0, 8 - prev.length)]);
  };

  const removeNewFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (photoId: string) => {
    setDeletedPhotoIds(prev => [...prev, photoId]);
    setExistingPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('evidence').getPublicUrl(path);
    return data.publicUrl;
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

              {/* Photos Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-3">Фотографии</label>
                
                {/* Existing Photos */}
                {existingPhotos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Текущие фотографии:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={getPhotoUrl(photo.file_url)}
                            alt="Job photo"
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(photo.id)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Photos */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <AnimatedIcon icon={Camera} className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Перетащите фото сюда или выберите файлы
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                    id="photo-upload-edit"
                  />
                  <label 
                    htmlFor="photo-upload-edit" 
                    className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Добавить фото
                  </label>
                </div>

                {/* New Photos Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Новые фотографии:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewFile(index)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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