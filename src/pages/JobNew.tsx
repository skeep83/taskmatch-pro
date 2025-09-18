import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, ArrowLeft, X } from "lucide-react";
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
        const { data, error } = await supabase
          .from("categories")
          .select("id,key,label_ru,label_ro")
          .order("label_ru");
        if (error) throw error;
        const mappedData = data?.map(cat => ({
          id: cat.id,
          name: cat.label_ru || cat.key,
          name_ro: cat.label_ro,
          icon: cat.key
        })) || [];
        setCategories(mappedData);
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

      // Check if this is for a business account
      const { data: businessData } = await supabase
        .from("business_accounts")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      const scheduled_at = date && time ? new Date(`${date}T${time}:00Z`).toISOString() : null;
      const insertPayload: any = {
        client_id: userId,
        category_id,
        title: description.substring(0, 100),
        description,
        budget_min_cents: isFinite(budget_min) ? Math.round(budget_min * 100) : null,
        budget_max_cents: isFinite(budget_max) ? Math.round(budget_max * 100) : null,
        scheduled_at,
        urgency
      };
      
      if (presetProId) insertPayload.pro_id = presetProId;
      
      const { data: created, error } = await supabase
        .from("jobs")
        .insert(insertPayload)
        .select('id')
        .single();
      if (error) throw error;

      // Link to business if this is a business user
      if (businessData?.id && created?.id) {
        await supabase
          .from("business_jobs")
          .insert({
            business_id: businessData.id,
            job_id: created.id
          });
      }

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
      navigate("/dashboard/client", { replace: true });
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
    <main className="min-h-screen mobile-container">
      <Seo title={`${t('app.name')} — Инстант‑бронирование`} description="Создать заказ" canonical="/job/new" />
      
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary/70 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Создать заказ</h1>
                <p className="text-xs text-muted-foreground">Шаг {step} из 3</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Hero Section */}
      <section className="relative overflow-hidden hidden md:block">
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
      <section className="container mx-auto py-6 md:py-24 px-4 md:px-6">
        {/* Desktop Header */}
        <div className="text-center mb-8 md:mb-16 hidden md:block">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("job.new.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("job.new.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Steps - Mobile compact version */}
          <div className="flex items-center justify-center mb-6 md:mb-8">
            <div className="flex items-center space-x-2 md:space-x-4">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition-all ${
                    stepNum <= step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {stepNum <= step ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5" /> : stepNum}
                  </div>
                  {stepNum < 3 && <div className={`w-8 md:w-16 h-1 mx-1 md:mx-2 transition-all ${
                    stepNum < step ? 'bg-primary' : 'bg-muted'
                  }`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-4 md:p-8">
            <form className="space-y-6 md:space-y-8" onSubmit={onSubmit}>
              
              {/* Step 1: Service Details */}
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm md:text-base">1</span>
                  Детали услуги
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="bg-secondary/20 rounded-lg md:rounded-xl p-4 md:p-6 border">
                    <label className="block text-sm font-medium mb-3">Категория услуги</label>
                    <select 
                      name="category_id" 
                      defaultValue={presetCategory}
                      className="w-full bg-background border rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base" 
                      required
                    >
                      <option value="" disabled>Выберите категорию</option>
                      {categoryOptions}
                    </select>
                  </div>

                  <div className="bg-secondary/20 rounded-lg md:rounded-xl p-4 md:p-6 border">
                    <label className="block text-sm font-medium mb-3">Приоритет</label>
                    <select name="urgency" className="w-full bg-background border rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base">
                      <option value="normal">Обычный</option>
                      <option value="urgent">Срочно (+30%)</option>
                      <option value="same_day">В тот же день (+50%)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-secondary/20 rounded-lg md:rounded-xl p-4 md:p-6 border">
                  <label className="block text-sm font-medium mb-3">Описание задачи</label>
                  <textarea 
                    name="description"
                    className="w-full bg-background border rounded-lg md:rounded-xl px-3 md:px-4 py-3 md:py-4 focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base" 
                    rows={3}
                    placeholder="Детально опишите задачу, чтобы специалисты могли дать точную оценку..."
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Чем подробнее описание, тем точнее будут предложения специалистов
                  </p>
                </div>
              </div>

              {/* Step 2: Budget & Schedule */}
              <div className="space-y-4 md:space-y-6 pt-6 md:pt-8 border-t border-border">
                <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm md:text-base">2</span>
                  Бюджет и расписание
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="bg-secondary/20 rounded-lg md:rounded-xl p-4 md:p-6 border">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                          <Euro className="w-4 h-4 text-green-500" />
                          От
                        </label>
                        <input 
                          name="budget_min" 
                          type="number" 
                          className="w-full bg-background border rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base"
                          placeholder="1000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">До</label>
                        <input 
                          name="budget_max" 
                          type="number" 
                          className="w-full bg-background border rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base"
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary/20 rounded-lg md:rounded-xl p-4 md:p-6 border">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Дата
                        </label>
                        <input 
                          name="date" 
                          type="date" 
                          className="w-full bg-background border rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">Время</label>
                        <input 
                          name="time" 
                          type="time" 
                          className="w-full bg-background border rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Photos */}
              <div className="space-y-4 md:space-y-6 pt-6 md:pt-8 border-t border-border">
                <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm md:text-base">3</span>
                  Фотографии задачи
                </h2>
                
                <div className="bg-secondary/20 rounded-lg md:rounded-xl p-4 md:p-6 border">
                  <div
                    className={`border-2 border-dashed rounded-lg md:rounded-xl p-6 md:p-8 text-center transition-all ${
                      dragActive ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <AnimatedIcon icon={Camera} className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3 md:mb-4" />
                    <h3 className="text-base md:text-lg font-medium mb-2">Добавьте фотографии</h3>
                    <p className="text-sm text-muted-foreground mb-4">
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
                    <label htmlFor="photo-upload" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 md:px-8 py-2 md:py-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-lg transition-colors shadow-lg inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Выбрать файлы
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 md:mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-16 md:h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 md:pt-8 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full md:w-auto px-6 py-3 border border-border rounded-lg md:rounded-xl font-medium hover:bg-secondary/50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 md:w-5 h-4 md:h-5" />
                      Создать заказ
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

export default JobNew;
