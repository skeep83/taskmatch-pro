import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { MobileCard } from "@/mobile/components/ui/MobileCard";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, ArrowLeft } from "lucide-react";

const MobileJobNew = () => {
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

  const nextStep = () => {
    if (step < 2) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB] pb-safe">
      <Seo title={`${t('app.name')} — Создать заказ`} description="Создать заказ" canonical="/job/new" />
      
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-[#E5E7EB] px-4 py-3 border-b border-[#D1D5DB]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB]"
          >
            <ArrowLeft className="w-5 h-5 text-[#374151]" />
          </button>
          <h1 className="text-lg font-semibold text-[#374151]">Создать заказ</h1>
          <div className="w-9 h-9" /> {/* Spacer */}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-center space-x-2">
          {[1, 2].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] ${
                stepNum <= step ? 'bg-primary text-white' : 'bg-[#E5E7EB] text-[#6B7280]'
              }`}>
                {stepNum <= step ? <CheckCircle className="w-4 h-4" /> : stepNum}
              </div>
              {stepNum < 2 && <div className={`w-8 h-1 mx-1 rounded-full transition-all ${
                stepNum < step ? 'bg-primary' : 'bg-[#D1D5DB]'
              }`} />}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="px-4 space-y-6">
        {/* Step 1: Service Details */}
        {step === 1 && (
          <div className="space-y-4">
            <MobileCard>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#374151] flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Детали услуги
                </h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#374151]">Категория услуги</label>
                  <select 
                    name="category_id" 
                    defaultValue={presetCategory}
                    className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50" 
                    required
                  >
                    <option value="" disabled>Выберите категорию</option>
                    {categoryOptions}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#374151]">Приоритет</label>
                  <select name="urgency" className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50">
                    <option value="normal">Обычный</option>
                    <option value="urgent">Срочно (+30%)</option>
                    <option value="same_day">В тот же день (+50%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#374151]">Описание задачи</label>
                  <textarea 
                    name="description"
                    className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50 resize-none" 
                    rows={4}
                    placeholder="Детально опишите задачу..."
                    required
                  />
                  <p className="text-xs text-[#6B7280] mt-2">
                    Чем подробнее описание, тем точнее будут предложения
                  </p>
                </div>

                {/* Photo/Video Upload Section */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-[#374151]">Фото и видео задачи</label>
                  
                  {/* Quick Camera Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.capture = 'environment';
                        input.onchange = (e) => {
                          const files = Array.from((e.target as HTMLInputElement).files || []);
                          setUploadedFiles(prev => [...prev, ...files.slice(0, 8 - prev.length)]);
                        };
                        input.click();
                      }}
                      className="flex flex-col items-center justify-center p-2 bg-[#E5E7EB] rounded-lg shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] transition-all"
                    >
                      <Camera className="w-4 h-4 text-primary mb-1" />
                      <span className="text-xs text-[#374151] font-medium">Камера</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'video/*';
                        input.capture = 'environment';
                        input.onchange = (e) => {
                          const files = Array.from((e.target as HTMLInputElement).files || []);
                          setUploadedFiles(prev => [...prev, ...files.slice(0, 8 - prev.length)]);
                        };
                        input.click();
                      }}
                      className="flex flex-col items-center justify-center p-2 bg-[#E5E7EB] rounded-lg shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] transition-all"
                    >
                      <div className="w-4 h-4 text-primary mb-1 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                        </svg>
                      </div>
                      <span className="text-xs text-[#374151] font-medium">Видео</span>
                    </button>
                  </div>
                  
                  {/* File Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-all ${
                      dragActive ? 'border-primary bg-primary/5' : 'border-[#D1D5DB]'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xs text-[#6B7280] mb-2">
                      Или выберите файлы
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="mobile-photo-upload"
                      name="photos"
                    />
                    <label htmlFor="mobile-photo-upload" className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] inline-flex items-center gap-1 cursor-pointer active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                      <Upload className="w-3 h-3" />
                      Выбрать
                    </label>
                  </div>

                  {/* Uploaded Files Preview */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#6B7280]">Загружено: {uploadedFiles.length}/8</p>
                      <div className="grid grid-cols-4 gap-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="relative group bg-[#E5E7EB] rounded-lg p-1 shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB]">
                            {file.type.startsWith('video/') ? (
                              <div className="w-full h-12 bg-[#D1D5DB] rounded flex items-center justify-center relative">
                                <svg className="w-4 h-4 text-[#6B7280]" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                                </svg>
                                <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded">
                                  {(file.size / 1024 / 1024).toFixed(1)}MB
                                </span>
                              </div>
                            ) : (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-12 object-cover rounded"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-[1px_1px_2px_rgba(0,0,0,0.2)]"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Step 2: Budget & Schedule */}
        {step === 2 && (
          <div className="space-y-4">
            <MobileCard>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#374151] flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Бюджет и расписание
                </h2>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#374151] flex items-center gap-1">
                      <Euro className="w-3 h-3 text-green-500" />
                      От
                    </label>
                    <input 
                      name="budget_min" 
                      type="number" 
                      className="w-full bg-[#E5E7EB] border-none rounded-xl px-3 py-2 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#374151]">До</label>
                    <input 
                      name="budget_max" 
                      type="number" 
                      className="w-full bg-[#E5E7EB] border-none rounded-xl px-3 py-2 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50"
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#374151] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-500" />
                      Дата
                    </label>
                    <input 
                      name="date" 
                      type="date" 
                      className="w-full bg-[#E5E7EB] border-none rounded-xl px-3 py-2 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#374151]">Время</label>
                    <input 
                      name="time" 
                      type="time" 
                      className="w-full bg-[#E5E7EB] border-none rounded-xl px-3 py-2 text-[#374151] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 pb-24 safe-bottom">{/* добавил pb-24 и safe-bottom для отступа от нижней навигации */}
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-3 bg-[#E5E7EB] text-[#374151] rounded-xl font-semibold shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] active:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]"
            >
              Назад
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-[#E5E7EB] text-[#374151] rounded-xl font-semibold shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] active:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]"
            >
              Отмена
            </button>
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
            >
              Далее
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] disabled:opacity-50"
            >
              {loading ? 'Создаем...' : 'Создать'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MobileJobNew;