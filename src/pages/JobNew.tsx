import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { FloatingCard } from "@/components/ui/floating-card";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, Calendar, Plus, X, Rocket } from "lucide-react";

const JobNew = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Array<{ id: string; name: string; name_ro?: string; icon?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    urgency: 'normal',
    budget_min: '',
    budget_max: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await (supabase as any)
          .from("categories")
          .select("id,key,label_ru,label_ro")
          .order("label_ru");
        if (error) throw error;
        setCategories(data?.map((cat: any) => ({
          id: cat.id,
          name: cat.label_ru || cat.key,
          name_ro: cat.label_ro,
          icon: "🔧"
        })) || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const presetCategory = params.get("category_id") || "";
  const presetProId = params.get("pro_id") || "";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_id || !formData.description) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
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

      const scheduled_at = formData.date && formData.time ? 
        new Date(`${formData.date}T${formData.time}:00Z`).toISOString() : null;
      
      const insertPayload: any = {
        client_id: userId,
        category_id: formData.category_id,
        title: formData.description.substring(0, 100),
        description: formData.description,
        budget_min_cents: formData.budget_min ? Math.round(parseFloat(formData.budget_min) * 100) : null,
        budget_max_cents: formData.budget_max ? Math.round(parseFloat(formData.budget_max) * 100) : null,
        scheduled_at,
        urgency: formData.urgency
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
        const bucket = supabase.storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `job/${created.id}/${Date.now()}-${i}.${ext}`;
            const { error: upErr } = await bucket.upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
            if (upErr) throw upErr;
            const { error: insErr } = await supabase
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
        await supabase.functions.invoke('job-smart-match', {
          body: { jobId: created.id }
        });
      } catch (matchError) {
        console.warn('Smart matching failed:', matchError);
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

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const getStepProgress = () => (step / 3) * 100;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <SignatureGradient />
      <Seo title="Создать заказ — ServiceHub" description="Создать заказ" canonical="/job/new" />
      
      <div className="container mx-auto py-16 px-6 relative z-10">
        {/* Hero Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Rocket size={20} className="text-primary" />
            <span className="text-sm font-medium text-primary">Быстрое создание заказа</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
            <span className="text-gradient animate-gradient-shift">Создать заказ</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Найдите профессионального специалиста за несколько минут
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <FloatingCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Шаг {step} из 3</span>
              <span className="text-sm text-muted-foreground">{Math.round(getStepProgress())}% завершено</span>
            </div>
            <Progress value={getStepProgress()} className="h-3" />
          </FloatingCard>
        </div>

        {/* Main Form Card */}
        <div className="max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
          <FloatingCard className="overflow-hidden">
            <CardHeader className="text-center pb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 opacity-50" />
              <div className="relative">
                <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-lg border border-white/20 flex items-center justify-center">
                  {step === 1 && <CheckCircle className="w-8 h-8 text-primary" />}
                  {step === 2 && <Clock className="w-8 h-8 text-primary" />}
                  {step === 3 && <Camera className="w-8 h-8 text-primary" />}
                </div>
                <CardTitle className="text-3xl font-display font-bold mb-3">
                  {step === 1 && "Детали услуги"}
                  {step === 2 && "Бюджет и время"}
                  {step === 3 && "Фотографии (опционально)"}
                </CardTitle>
                <p className="text-muted-foreground text-lg">
                  {step === 1 && "Опишите что нужно сделать"}
                  {step === 2 && "Укажите бюджет и удобное время"}
                  {step === 3 && "Добавьте фото для лучшего понимания задачи"}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              <form onSubmit={onSubmit} className="space-y-8">
                {/* Step 1: Service Details */}
                {step === 1 && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="space-y-4">
                      <Label htmlFor="category_id" className="text-lg font-semibold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Категория услуги *
                      </Label>
                      <Select 
                        value={formData.category_id || presetCategory} 
                        onValueChange={(value) => updateFormData('category_id', value)}
                      >
                        <SelectTrigger className="h-14 text-lg rounded-2xl border-2 border-primary/20 bg-white dark:bg-white/5 hover:border-primary/40 focus:border-primary transition-all">
                          <SelectValue placeholder="Выберите категорию услуги" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-2">
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl text-lg py-3">
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="urgency" className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent" />
                        Приоритет выполнения
                      </Label>
                      <Select value={formData.urgency} onValueChange={(value) => updateFormData('urgency', value)}>
                        <SelectTrigger className="h-14 text-lg rounded-2xl border-2 border-primary/20 bg-white dark:bg-white/5 hover:border-primary/40 focus:border-primary transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-2">
                          <SelectItem value="normal" className="rounded-xl text-lg py-3">🕒 Обычный приоритет</SelectItem>
                          <SelectItem value="urgent" className="rounded-xl text-lg py-3">⚡ Срочно (+30% к стоимости)</SelectItem>
                          <SelectItem value="same_day" className="rounded-xl text-lg py-3">🚀 В тот же день (+50% к стоимости)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="description" className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Подробное описание задачи *
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        placeholder="Детально опишите что нужно сделать: объем работ, материалы, особые требования, адрес выполнения..."
                        rows={5}
                        className="text-lg rounded-2xl border-2 border-primary/20 bg-white dark:bg-white/5 hover:border-primary/40 focus:border-primary transition-all resize-none"
                        required
                      />
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                        <p className="text-sm text-primary flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <strong>Совет:</strong> Чем подробнее описание, тем точнее будут предложения специалистов
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-white/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                        <Zap className="w-6 h-6 text-blue-500" />
                        <div>
                          <div className="font-semibold text-sm">Мгновенные отклики</div>
                          <div className="text-xs text-muted-foreground">Ответ в течение 5 минут</div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-white/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-green-500" />
                        <div>
                          <div className="font-semibold text-sm">Защита эскроу</div>
                          <div className="text-xs text-muted-foreground">100% гарантия безопасности</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Budget & Schedule */}
                {step === 2 && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Euro className="w-6 h-6 text-green-500" />
                        Планируемый бюджет
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="budget_min" className="text-lg font-medium">Бюджет от ($)</Label>
                          <Input
                            id="budget_min"
                            type="number"
                            value={formData.budget_min}
                            onChange={(e) => updateFormData('budget_min', e.target.value)}
                            placeholder="100"
                            className="h-14 text-lg rounded-2xl border-2 border-primary/20 bg-white dark:bg-white/5 hover:border-primary/40 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="budget_max" className="text-lg font-medium">до ($)</Label>
                          <Input
                            id="budget_max"
                            type="number"
                            value={formData.budget_max}
                            onChange={(e) => updateFormData('budget_max', e.target.value)}
                            placeholder="500"
                            className="h-14 text-lg rounded-2xl border-2 border-primary/20 bg-white dark:bg-white/5 hover:border-primary/40 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-blue-500" />
                        Желаемые дата и время
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="date" className="text-lg font-medium">Дата выполнения</Label>
                          <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => updateFormData('date', e.target.value)}
                            className="h-14 text-lg rounded-2xl border-2 border-primary/20 bg-white dark:bg-white/5 hover:border-primary/40 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="time" className="text-lg font-medium">Время начала</Label>
                          <Input
                            id="time"
                            type="time"
                            value={formData.time}
                            onChange={(e) => updateFormData('time', e.target.value)}
                            className="h-14 text-lg rounded-2xl border-2 border-primary/20 bg-white dark:bg-white/5 hover:border-primary/40 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-primary/20 rounded-2xl p-6">
                      <div className="flex items-start gap-3">
                        <Shield className="w-6 h-6 text-primary mt-1" />
                        <div>
                          <h4 className="font-semibold text-primary mb-2">Гибкое планирование</h4>
                          <p className="text-sm text-muted-foreground">
                            Указание бюджета и времени поможет специалистам лучше подготовиться и дать более точную оценку. 
                            Окончательные условия обсуждаются с выбранным исполнителем.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Photos */}
                {step === 3 && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-xl border border-white/20 flex items-center justify-center">
                        <Camera className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-2xl font-semibold">Добавьте фотографии</h3>
                      <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        Фотографии помогут специалистам лучше понять объем работ и дать точную оценку
                      </p>
                    </div>

                    <div
                      className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                        dragActive 
                          ? 'border-primary bg-primary/10 scale-105' 
                          : 'border-primary/30 bg-white dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <div className="space-y-6">
                        <AnimatedIcon icon={Camera} className="w-16 h-16 text-primary mx-auto" />
                        <div>
                          <h4 className="text-xl font-semibold mb-2">Перетащите изображения сюда</h4>
                          <p className="text-muted-foreground mb-6">
                            или нажмите кнопку для выбора файлов (до 8 фотографий)
                          </p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileInput}
                          className="hidden"
                          id="photo-upload"
                        />
                        <Button type="button" size="lg" className="rounded-2xl" asChild>
                          <label htmlFor="photo-upload" className="cursor-pointer">
                            <Upload className="w-5 h-5 mr-3" />
                            Выбрать фотографии
                          </label>
                        </Button>
                      </div>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold">Загруженные фотографии ({uploadedFiles.length}/8)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-32 object-cover rounded-2xl border-2 border-primary/20 shadow-lg transition-transform group-hover:scale-105"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="absolute -top-3 -right-3 w-8 h-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-primary/20 rounded-2xl p-6">
                      <div className="flex items-start gap-3">
                        <Camera className="w-6 h-6 text-amber-600 mt-1" />
                        <div>
                          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Рекомендации по фото</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Сфотографируйте проблемную область с разных ракурсов</li>
                            <li>• Покажите общий вид помещения или объекта</li>
                            <li>• Включите детали, которые могут повлиять на работу</li>
                            <li>• Избегайте размытых или темных снимков</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-10 mt-10 border-t-2 border-primary/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1}
                    size="lg"
                    className="rounded-2xl border-2 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Назад
                  </Button>

                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={step === 1 && (!formData.category_id || !formData.description)}
                      size="lg"
                      className="rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-primary to-accent"
                    >
                      Далее
                      <Rocket className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      size="lg"
                      className="rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-primary to-accent"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                          Создание заказа...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-3" />
                          Создать заказ
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </FloatingCard>
        </div>
      </div>
    </main>
  );
};

export default JobNew;