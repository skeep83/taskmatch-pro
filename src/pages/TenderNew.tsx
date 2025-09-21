import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, Gavel, AlertTriangle, ArrowLeft, DollarSign, Calendar } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { RoleGuard } from "@/components/RoleGuard";
import tenderImage from "@/assets/tenders-auction.jpg";

const TenderNew = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const [categories, setCategories] = useState<Array<{ id: string; name: string; name_ro?: string; icon?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [businessAccount, setBusinessAccount] = useState<any>(null);
  const [businessAccountLoading, setBusinessAccountLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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

  // Load business account on component mount
  useEffect(() => {
    const loadBusinessAccount = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session?.user) {
          navigate('/auth');
          return;
        }

        // Check if user has business account
        const { data: businessData, error } = await supabase
          .from('business_accounts')
          .select('*')
          .eq('owner_id', session.session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking business account:', error);
          toast({ 
            title: 'Ошибка', 
            description: 'Не удалось проверить бизнес-аккаунт', 
            variant: 'destructive' 
          });
          return;
        }

        setBusinessAccount(businessData);
      } catch (error: any) {
        console.error('Error loading business account:', error);
        toast({ 
          title: 'Ошибка', 
          description: 'Не удалось загрузить бизнес-аккаунт', 
          variant: 'destructive' 
        });
      } finally {
        setBusinessAccountLoading(false);
      }
    };

    loadBusinessAccount();
  }, [navigate, toast]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category_id = String(fd.get("category_id") || "");
    const title = String(fd.get("title") || "");
    const description = String(fd.get("description") || "");
    const budget_max = Number(fd.get("budget_max") || 0);
    const date = String(fd.get("date") || "");
    const time = String(fd.get("time") || "");

    if (!title.trim()) {
      toast({ title: 'Ошибка', description: 'Введите название тендера', variant: 'destructive' });
      return;
    }
    
    if (!description.trim()) {
      toast({ title: 'Ошибка', description: 'Введите описание тендера', variant: 'destructive' });
      return;
    }
    
    if (!budget_max) {
      toast({ title: 'Ошибка', description: 'Укажите максимальный бюджет', variant: 'destructive' });
      return;
    }
    
    if (!date || !time) {
      toast({ title: 'Ошибка', description: 'Укажите срок подачи заявок', variant: 'destructive' });
      return;
    }

    if (!businessAccount) {
      toast({ 
        title: 'Ошибка', 
        description: 'У вас нет бизнес-аккаунта. Только бизнес-аккаунты могут создавать тендеры.', 
        variant: 'destructive' 
      });
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

      const deadline = new Date(`${date}T${time}:00Z`).toISOString();
      
      const { data: created, error } = await supabase
        .from('tenders')
        .insert({
          client_id: userId,
          business_id: businessAccount.id,
          title: title,
          description: description,
          budget_max_cents: Math.round(budget_max * 100), // Convert to cents
          deadline: deadline,
          category_id: category_id || null,
          status: 'open'
        })
        .select('id')
        .single();

      if (error) throw error;

      // Upload photos to private bucket and link to tender (similar to jobs)
      if (created?.id && uploadedFiles.length) {
        const bucket = (supabase as any).storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `tender/${created.id}/${Date.now()}-${i}.${ext}`;
            const { error: upErr } = await bucket.upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
            if (upErr) throw upErr;
            // You may want to create a tender_photos table similar to job_photos
          } catch (e) {
            console.warn('photo upload failed', e);
          }
        }
      }

      toast({ title: 'Успех', description: 'Тендер создан успешно. Специалисты смогут подавать заявки до указанного срока.' });
      navigate(`/tenders/${created.id}`, { replace: true });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Ошибка", description: err?.message || "Не удалось создать тендер", variant: "destructive" });
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

  if (businessAccountLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#E5E7EB]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Загрузка...</h2>
          <p className="text-muted-foreground">Проверяем ваш бизнес-аккаунт</p>
        </div>
      </main>
    );
  }

  return (
    <RoleGuard requiredRole="business">
      <main className="min-h-screen bg-[#E5E7EB]">
        <Seo title={`${t('app.name')} — Создать тендер`} description="Создайте тендер для получения предложений от специалистов" canonical="/tenders/new" />
        
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={tenderImage} alt="Tender Creation" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 to-orange-600/80" />
          </div>
          <div className="relative container mx-auto px-4 py-24">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
                Создать тендер
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Получите предложения от лучших специалистов
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-white">
                    <AnimatedIcon icon={Gavel} className="text-purple-300" />
                    <span>Прозрачный аукцион</span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 text-white">
                    <AnimatedIcon icon={Shield} className="text-green-300" />
                    <span>Гарантия качества</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!businessAccount && (
          <section className="container mx-auto px-6 pt-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 p-6 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">Требуется бизнес-аккаунт</h3>
                    <p className="text-muted-foreground mb-4">
                      Для создания тендеров необходим бизнес-аккаунт. Тендеры доступны только для корпоративных клиентов.
                    </p>
                    <button 
                      onClick={() => navigate('/dashboard/business')}
                      className="bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] hover:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] border-0 px-6 py-3 rounded-xl font-semibold transition-all"
                    >
                      Создать бизнес-аккаунт
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Form Section */}
        <section className="container mx-auto py-16 px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-[#4B5563]">
              Детали тендера
            </h2>
            <p className="text-xl text-[#6B7280] max-w-2xl mx-auto">
              Опишите проект подробно для получения качественных предложений
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Navigation */}
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => navigate('/dashboard/business?tab=tenders')}
                className="gap-2 bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] hover:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] border-0 px-6 py-3 rounded-xl font-semibold transition-all flex items-center"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад к тендерам
              </button>
            </div>

            <div className="bg-[#E5E7EB] rounded-3xl p-8 shadow-[12px_12px_24px_#D1D5DB,-12px_-12px_24px_#F9FAFB]">
              <form className="space-y-8" onSubmit={onSubmit}>
                
                {businessAccount && (
                  <div className="p-4 rounded-xl bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]">
                    <p className="text-sm text-muted-foreground">
                      <strong>Бизнес-аккаунт:</strong> {businessAccount.company_name}
                    </p>
                  </div>
                )}

                {/* Tender Details */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                    <span className="w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center text-primary font-bold shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]">1</span>
                    Информация о тендере
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-[#E5E7EB] rounded-2xl p-6 shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
                      <label className="block text-sm font-medium mb-3 text-[#374151]">Категория услуги</label>
                      <select 
                        name="category_id" 
                        className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-[#374151]" 
                      >
                        <option value="">Выберите категорию</option>
                        {categoryOptions}
                      </select>
                    </div>

                    <div className="bg-[#E5E7EB] rounded-2xl p-6 shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
                      <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-[#374151]">
                        <Euro className="w-4 h-4 text-green-500" />
                        Максимальный бюджет *
                      </label>
                      <input 
                        name="budget_max" 
                        type="number" 
                        min="1"
                        className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-[#374151]"
                        placeholder="5000"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-[#E5E7EB] rounded-2xl p-6 shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
                    <label className="block text-sm font-medium mb-3 text-[#374151]">Название тендера *</label>
                    <input 
                      name="title"
                      className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-[#374151]" 
                      placeholder="Например: Ремонт офисного помещения"
                      maxLength={200}
                      required
                    />
                  </div>

                  <div className="bg-[#E5E7EB] rounded-2xl p-6 shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
                    <label className="block text-sm font-medium mb-3 text-[#374151]">Описание проекта *</label>
                    <textarea 
                      name="description"
                      className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary/50 transition-all shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-[#374151]" 
                      rows={4}
                      placeholder="Подробно опишите проект, требования к материалам, сроки выполнения, критерии оценки..."
                      maxLength={1000}
                      required
                    />
                    <p className="text-xs text-[#6B7280] mt-2">
                      Подробное описание поможет специалистам подготовить точные предложения
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="space-y-6 pt-8 border-t border-[#D1D5DB]">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                    <span className="w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center text-primary font-bold shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]">2</span>
                    Срок подачи заявок
                  </h2>
                  
                  <div className="bg-[#E5E7EB] rounded-2xl p-6 shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-[#374151]">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Дата окончания *
                        </label>
                        <input 
                          name="date" 
                          type="date" 
                          className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-[#374151]"
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3 text-[#374151]">Время *</label>
                        <input 
                          name="time" 
                          type="time" 
                          className="w-full bg-[#E5E7EB] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-[#374151]"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2">
                      После этого времени подача заявок будет закрыта
                    </p>
                  </div>
                </div>

                {/* Photos */}
                <div className="space-y-6 pt-8 border-t border-[#D1D5DB]">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                    <span className="w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center text-primary font-bold shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]">3</span>
                    Дополнительные материалы
                  </h2>
                  
                  <div className="bg-[#E5E7EB] rounded-2xl p-6 shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive ? 'border-primary bg-primary/5' : 'border-[#D1D5DB]'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <AnimatedIcon icon={Camera} className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2 text-[#374151]">Добавьте фотографии или документы</h3>
                      <p className="text-[#6B7280] mb-4">
                        Перетащите файлы сюда или выберите их
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                        name="files"
                      />
                      <label htmlFor="file-upload" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] inline-flex items-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Выбрать файлы
                      </label>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="relative group bg-[#E5E7EB] rounded-xl p-2 shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]">
                            {file.type.startsWith('image/') ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center bg-gray-100 rounded-lg">
                                <span className="text-xs text-gray-600">{file.name}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-[2px_2px_4px_#D1D5DB]"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-between items-center pt-8 border-t border-[#D1D5DB]">
                  <button type="button" className="bg-[#E5E7EB] text-[#374151] hover:bg-[#D1D5DB] px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]" onClick={() => navigate('/dashboard/business?tab=tenders')}>
                    Отмена
                  </button>
                  <button type="submit" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]" disabled={loading || !businessAccount}>
                    {loading ? 'Создаем тендер...' : 'Создать тендер'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </RoleGuard>
  );
};

export default TenderNew;