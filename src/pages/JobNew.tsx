import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle } from "lucide-react";
import jobImage from "@/assets/services-hero.jpg";

const JobNew = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Array<{ id: string; name: string; name_ro?: string; icon?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await (supabase as any)
          .from("service_categories")
          .select("id,name,name_ro,icon")
          .eq('is_active', true)
          .order("name");
        if (error) throw error;
        setCategories(data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const presetCategory = params.get("category_id") || "";
  const presetProId = params.get("pro_id") || "";

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category_id = String(fd.get("category_id") || "");
    const description = String(fd.get("description") || "");
    const urgency = String(fd.get("urgency") || "normal");
    const budget_min = Number(fd.get("budget_min") || 0);
    const budget_max = Number(fd.get("budget_max") || 0);
    const date = String(fd.get("date") || "");
    const time = String(fd.get("time") || "");

    if (!category_id || !description) {
      toast({ title: t("auth.error.fields"), description: t("job.new.error.required"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const userId = s.session?.user?.id;
      if (!userId) {
        toast({ title: "Требуется вход", description: "Пожалуйста, войдите" , variant: "destructive"});
        navigate("/auth");
        return;
      }
      const scheduled_at = date && time ? new Date(`${date}T${time}:00Z`).toISOString() : null;
      const insertPayload: any = {
        client_id: userId,
        category_id,
        title: description.substring(0, 100), // Используем первую часть описания как заголовок
        description,
        urgency,
        budget_min_cents: isFinite(budget_min) ? Math.round(budget_min * 100) : null,
        budget_max_cents: isFinite(budget_max) ? Math.round(budget_max * 100) : null,
        scheduled_at,
      };
      if (presetProId) insertPayload.pro_id = presetProId;
      const { data: created, error } = await (supabase as any)
        .from("jobs")
        .insert(insertPayload)
        .select('id')
        .single();
      if (error) throw error;

      // Upload photos to private bucket and link to job
      if (created?.id && uploadedFiles.length) {
        const bucket = (supabase as any).storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `job/${created.id}/${Date.now()}-${i}.${ext}`;
            const { error: upErr } = await bucket.upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
            if (upErr) throw upErr;
            const { error: insErr } = await (supabase as any)
              .from('job_photos')
              .insert({ job_id: created.id, file_url: path });
            if (insErr) throw insErr;
          } catch (e) {
            console.warn('photo upload failed', e);
          }
        }
      }

      // Trigger smart matching to find nearby professionals
      try {
        await (supabase as any).functions.invoke('job-smart-match', {
          body: { jobId: created.id }
        });
      } catch (matchError) {
        console.warn('Smart matching failed:', matchError);
        // Continue even if matching fails
      }

      toast({ title: "Заказ создан", description: "Мы нашли специалистов в вашем районе и отправили им уведомления" });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Ошибка", description: err?.message || "Не удалось создать заказ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = useMemo(() => categories.map(c => (
    <option key={c.id} value={c.id}>
      {c.icon && `${c.icon} `}{c.name}
    </option>
  )), [categories]);

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

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen">
      <Seo title={`${t('app.name')} — Инстант‑бронирование`} description="Создать заказ" canonical="/job/new" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={jobImage} alt="Job Creation" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-orange-600/80" />
        </div>
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              {t("job.new.title")}
            </h1>
            <p className="text-xl text-white/90 mb-8">
              {t("job.new.subtitle")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <AnimatedIcon icon={Zap} className="text-yellow-300" />
                  <span>Мгновенные отклики</span>
                </div>
              </FloatingCard>
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <AnimatedIcon icon={Shield} className="text-green-300" />
                  <span>Защита эскроу</span>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    stepNum <= step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {stepNum <= step ? <CheckCircle className="w-5 h-5" /> : stepNum}
                  </div>
                  {stepNum < 3 && <div className={`w-16 h-1 mx-2 transition-all ${
                    stepNum < step ? 'bg-primary' : 'bg-muted'
                  }`} />}
                </div>
              ))}
            </div>
          </div>

          <GlassMorphism className="p-8">
            <form className="space-y-8" onSubmit={onSubmit}>
              
              {/* Step 1: Service Details */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">1</span>
                  Детали услуги
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <FloatingCard className="p-6">
                    <label className="block text-sm font-medium mb-3">Категория услуги</label>
                    <select 
                      name="category_id" 
                      defaultValue={presetCategory}
                      className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all" 
                      required
                    >
                      <option value="" disabled>Выберите категорию</option>
                      {categoryOptions}
                    </select>
                  </FloatingCard>

                  <FloatingCard className="p-6">
                    <label className="block text-sm font-medium mb-3">Приоритет</label>
                    <select name="urgency" className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all">
                      <option value="normal">Обычный</option>
                      <option value="urgent">Срочно (+30%)</option>
                      <option value="same_day">В тот же день (+50%)</option>
                    </select>
                  </FloatingCard>
                </div>

                <FloatingCard className="p-6">
                  <label className="block text-sm font-medium mb-3">Описание задачи</label>
                  <textarea 
                    name="description"
                    className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary/50 transition-all" 
                    rows={4}
                    placeholder="Детально опишите задачу, чтобы специалисты могли дать точную оценку..."
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Чем подробнее описание, тем точнее будут предложения специалистов
                  </p>
                </FloatingCard>
              </div>

              {/* Step 2: Budget & Schedule */}
              <div className="space-y-6 pt-8 border-t border-white/10">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">2</span>
                  Бюджет и расписание
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <FloatingCard className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                          <Euro className="w-4 h-4 text-green-500" />
                          Бюджет от (₽)
                        </label>
                        <input 
                          name="budget_min" 
                          type="number" 
                          className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all"
                          placeholder="1000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">до (₽)</label>
                        <input 
                          name="budget_max" 
                          type="number" 
                          className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all"
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  </FloatingCard>

                  <FloatingCard className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Дата
                        </label>
                        <input 
                          name="date" 
                          type="date" 
                          className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">Время</label>
                        <input 
                          name="time" 
                          type="time" 
                          className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                    </div>
                  </FloatingCard>
                </div>
              </div>

              {/* Step 3: Photos */}
              <div className="space-y-6 pt-8 border-t border-white/10">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">3</span>
                  Фотографии задачи
                </h2>
                
                <FloatingCard className="p-6">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      dragActive ? 'border-primary bg-primary/5' : 'border-white/20'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <AnimatedIcon icon={Camera} className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Добавьте фотографии</h3>
                    <p className="text-muted-foreground mb-4">
                      Перетащите фото сюда или выберите файлы
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="photo-upload"
                      name="photos"
                    />
                    <label htmlFor="photo-upload" className="btn-hero inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Выбрать файлы
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </FloatingCard>
              </div>

              {/* Submit */}
              <div className="flex justify-between items-center pt-8 border-t border-white/10">
                <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
                  Отмена
                </button>
                <button type="submit" className="btn-hero px-8" disabled={loading}>
                  {loading ? 'Создаем заказ...' : 'Создать заказ'}
                </button>
              </div>
            </form>
          </GlassMorphism>
        </div>
      </section>
    </main>
  );
};

export default JobNew;
