import { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { categoryLabel } from '@/lib/categoryLabel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { ArrowLeft, Save, Camera, Upload, Video, X } from 'lucide-react';
import { useEnhancedI18n } from "@/i18n/enhanced";
import {
  appendJobChangeRequest,
  buildMaterialUpdateEntry,
  canClientEditJob,
  getMaterialJobChanges,
  inferMediaKind,
  isVideoFile,
} from '@/utils/jobLifecycle';

interface Job {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category_id: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  location_address?: string;
  scheduled_at?: string;
  urgency: string;
  status: string;
  pro_id?: string | null;
  change_requests?: unknown;
}

interface JobPhoto {
  id: string;
  file_url: string;
  created_at: string;
}

const JobEdit = () => {
  const { t, language } = useEnhancedI18n();
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<JobPhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [hasPayment, setHasPayment] = useState(false);

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

      // Check if job can be edited under Variant C rules
      const { data: escrow } = await supabase
        .from('escrows')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();

      const hasEscrow = Boolean(escrow);
      setHasPayment(hasEscrow);

      const {
        count: applicationCount,
      } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId);

      const {
        count: proposalCount,
      } = await supabase
        .from('job_price_proposals')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId);

      setResponseCount((applicationCount || 0) + (proposalCount || 0));

      if (!canClientEditJob({ job: data, isOwner: true, hasPayment: hasEscrow })) {
        toast({
          title: t("ui.redaktirovanie_nevozmozhno"),
          description: t("ui.posle_vybora_ispolnitelia_ili"),
          variant: 'destructive'
        });
        navigate(`/job/${jobId}`);
        return;
      }

      setJob(data);
    } catch (error: any) {
      console.error('Error fetching job:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_zagruzit_zakaz"),
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

      if (!job) {
        throw new Error(t("ui.zakaz_ne_zagruzhen"));
      }

      const materialChanges = getMaterialJobChanges(job, updateData);
      const hasMaterialChanges = materialChanges.length > 0;

      if (responseCount > 0 && hasMaterialChanges) {
        updateData.change_requests = appendJobChangeRequest(
          job.change_requests,
          buildMaterialUpdateEntry({
            triggeredBy: job.client_id,
            responseCount,
            changes: materialChanges,
          }),
        );
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;

      // Delete removed photos from storage and database
      if (deletedPhotoIds.length > 0) {
        console.log('Deleting photos:', deletedPhotoIds);

        // First get the file paths of photos to delete
        const { data: photosToDelete } = await supabase
          .from('job_photos')
          .select('file_url')
          .in('id', deletedPhotoIds);

        // Delete from storage
        if (photosToDelete && photosToDelete.length > 0) {
          const bucket = supabase.storage.from('evidence');
          for (const photo of photosToDelete) {
            try {
              const { error: delErr } = await bucket.remove([photo.file_url]);
              if (delErr) {
                console.error('Storage delete error:', delErr);
              } else {
                console.log('Deleted from storage:', photo.file_url);
              }
            } catch (e) {
              console.error('Failed to delete from storage:', e);
            }
          }
        }

        // Delete from database
        const { error: dbDelErr } = await supabase
          .from('job_photos')
          .delete()
          .in('id', deletedPhotoIds);

        if (dbDelErr) {
          console.error('Database delete error:', dbDelErr);
        } else {
          console.log('Deleted from database, count:', deletedPhotoIds.length);
        }
      }

      // Upload new media
      if (uploadedFiles.length > 0) {
        console.log('Starting media upload, files count:', uploadedFiles.length);
        const bucket = supabase.storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            console.log('Uploading file:', file.name);
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `job/${jobId}/${Date.now()}-${i}.${ext}`;
            console.log('Upload path:', path);

            const { error: upErr, data: uploadData } = await bucket.upload(path, file, {
              upsert: true,
              contentType: file.type || 'image/jpeg'
            });
            if (upErr) {
              console.error('Upload error:', upErr);
              throw upErr;
            }
            console.log('Upload successful:', uploadData);

            const { error: insErr, data: insertData } = await supabase
              .from('job_photos')
              .insert({ job_id: jobId, file_url: path })
              .select();
            if (insErr) {
              console.error('Insert error:', insErr);
              throw insErr;
            }
            console.log('Insert successful:', insertData);
          } catch (e) {
            console.error('Media upload failed', e);
          }
        }
      }

      if (responseCount > 0 && hasMaterialChanges) {
        const [{ data: applications }, { data: proposals }] = await Promise.all([
          supabase.from('job_applications').select('pro_id').eq('job_id', jobId),
          supabase.from('job_price_proposals').select('pro_id').eq('job_id', jobId),
        ]);

        const proIds = [...new Set([...(applications || []), ...(proposals || [])].map((item) => item.pro_id).filter(Boolean))];

        for (const proId of proIds) {
          await supabase.functions.invoke('notifications-send', {
            body: {
              user_id: proId,
              type: 'job_materially_updated',
              title: t("ui.usloviia_zakaza_izmenilis"),
              title_ro: 'Condițiile comenzii s-au schimbat',
              message: `Клиент обновил важные детали заказа "${updateData.title || job.title}". Проверьте описание, бюджет, адрес и вложения.`,
              message_ro: `Clientul a actualizat detalii importante pentru comanda "${updateData.title || job.title}". Verificați descrierea, bugetul, adresa și fișierele.`,
              data: {
                job_id: jobId,
                changes: materialChanges.map((change) => change.field),
              },
              channels: ['push'],
            },
          });
        }
      }

      // Refresh photos after upload
      console.log('Refreshing photos after upload...');
      await fetchJobPhotos();
      console.log('Photos refreshed, current count:', existingPhotos.length);

      // Clear uploaded files from state
      setUploadedFiles([]);
      setDeletedPhotoIds([]);

      toast({
        title: t("ui.zakaz_obnovlen"),
        description: t("ui.izmeneniia_uspeshno_sohraneny")
      });
      navigate(`/job/${jobId}`);
    } catch (error: any) {
      console.error('Error updating job:', error);
      toast({
        title: t("notifications.error"),
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

  const appendFiles = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files.slice(0, Math.max(0, 8 - prev.length))]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    appendFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    appendFiles(files);
    e.target.value = '';
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
    return <div className="container mx-auto py-8">{t("common.loading")}</div>;
  }

  if (!job) {
    return <div className="container mx-auto py-8">{t("ui.zakaz_ne_naiden")}</div>;
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
        <h1 className="text-2xl font-bold">{t("ui.redaktirovat_zakaz")}</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t("job.new.service_details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {responseCount > 0 && (
                  <div className="md:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    По этому заказу уже есть отклики. Если вы измените важные условия, система сохранит это в истории и уведомит откликнувшихся исполнителей.
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">{t("ui.zagolovok")}</label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={job.title}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder={t("ui.naprimer_ustanovit_rozetku")}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">{t("ui.opisanie")}</label>
                  <textarea
                    name="description"
                    defaultValue={job.description}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder={t("ui.opishite_detali_raboty")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("job.new.category")}</label>
                  <select
                    name="category_id"
                    defaultValue={job.category_id}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">{t("job.new.select_category")}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryLabel(category, language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("ui.srochnost")}</label>
                  <select
                    name="urgency"
                    defaultValue={job.urgency}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="normal">{t("ui.obychnaia")}</option>
                    <option value="urgent">{t("ui.srochnaia")}</option>
                    <option value="same_day">{t("dash.client.urg_same_day")}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">{t("ui.adres")}</label>
                  <input
                    name="location_address"
                    type="text"
                    defaultValue={job.location_address || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder={t("ui.ukazhite_adres_vypolneniia_rabot")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("job.new.budget_from")}</label>
                  <input
                    name="budget_min"
                    type="number"
                    defaultValue={job.budget_min_cents ? Math.round(job.budget_min_cents / 100) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("ui.biudzhet_do")}</label>
                  <input
                    name="budget_max"
                    type="number"
                    defaultValue={job.budget_max_cents ? Math.round(job.budget_max_cents / 100) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("dash.client.col_date")}</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={scheduledDateTime ? scheduledDateTime.toISOString().split('T')[0] : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("job.new.time")}</label>
                  <input
                    name="time"
                    type="time"
                    defaultValue={scheduledDateTime ? scheduledDateTime.toTimeString().split(' ')[0].slice(0, 5) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              {/* Media Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-3">{t("job.new.photos")}</label>

                {/* Existing Media */}
                {existingPhotos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">{t("ui.tekuschie_vlozheniia")}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          {inferMediaKind(photo.file_url) === 'video' ? (
                            <video
                              src={getPhotoUrl(photo.file_url)}
                              className="w-full h-20 object-cover rounded-lg bg-black"
                              controls
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={getPhotoUrl(photo.file_url)}
                              alt="Job media"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
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

                {/* Upload New Media */}
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
                    Перетащите фото или видео сюда или выберите файлы
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileInput}
                      className="hidden"
                      id="photo-capture-edit"
                    />
                    <label
                      htmlFor="photo-capture-edit"
                      className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Сделать фото
                    </label>

                    <input
                      type="file"
                      accept="video/*"
                      capture="environment"
                      onChange={handleFileInput}
                      className="hidden"
                      id="video-capture-edit"
                    />
                    <label
                      htmlFor="video-capture-edit"
                      className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Снять видео
                    </label>
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileInput}
                    className="hidden"
                    id="photo-upload-edit"
                  />
                  <label
                    htmlFor="photo-upload-edit"
                    className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Выбрать файлы
                  </label>
                </div>

                {/* New Media Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">{t("ui.novye_vlozheniia")}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          {isVideoFile(file) ? (
                            <video
                              src={URL.createObjectURL(file)}
                              className="w-full h-20 object-cover rounded-lg bg-black"
                              controls
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
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
                  {saving ? t("common.saving") : t("dash.client.save_changes")}
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