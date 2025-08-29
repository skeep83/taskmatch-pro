import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
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
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, Calendar, Plus, X } from "lucide-react";

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
    <main className="min-h-screen bg-background">
      <Seo title="Создать заказ — ServiceHub" description="Создать заказ" canonical="/job/new" />
      
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Создать заказ
          </h1>
          <p className="text-xl text-muted-foreground">
            Найдите профессионального специалиста за несколько минут
          </p>
        </div>

        {/* Progress */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Шаг {step} из 3</span>
            <span className="text-sm text-muted-foreground">{Math.round(getStepProgress())}% завершено</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Main Form */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {step === 1 && (
                  <>
                    <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
                    Детали услуги
                  </>
                )}
                {step === 2 && (
                  <>
                    <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
                    Бюджет и время
                  </>
                )}
                {step === 3 && (
                  <>
                    <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
                    Фотографии (опционально)
                  </>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                {/* Step 1: Service Details */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="category_id">Категория услуги *</Label>
                      <Select 
                        value={formData.category_id || presetCategory} 
                        onValueChange={(value) => updateFormData('category_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="urgency">Приоритет</Label>
                      <Select value={formData.urgency} onValueChange={(value) => updateFormData('urgency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Обычный</SelectItem>
                          <SelectItem value="urgent">Срочно (+30%)</SelectItem>
                          <SelectItem value="same_day">В тот же день (+50%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Описание задачи *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        placeholder="Детально опишите задачу, чтобы специалисты могли дать точную оценку..."
                        rows={4}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Чем подробнее описание, тем точнее будут предложения специалистов
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Мгновенные отклики
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Защита эскроу
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Step 2: Budget & Schedule */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="budget_min" className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-green-500" />
                          Бюджет от ($)
                        </Label>
                        <Input
                          id="budget_min"
                          type="number"
                          value={formData.budget_min}
                          onChange={(e) => updateFormData('budget_min', e.target.value)}
                          placeholder="100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="budget_max">до ($)</Label>
                        <Input
                          id="budget_max"
                          type="number"
                          value={formData.budget_max}
                          onChange={(e) => updateFormData('budget_max', e.target.value)}
                          placeholder="500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          Дата
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => updateFormData('date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="time" className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Время
                        </Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => updateFormData('time', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        💡 <strong>Совет:</strong> Указание бюджета и времени поможет специалистам лучше подготовиться и дать более точную оценку.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Photos */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        dragActive ? 'border-primary bg-primary/5' : 'border-muted'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <AnimatedIcon icon={Camera} className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Добавьте фотографии</h3>
                      <p className="text-muted-foreground mb-4">
                        Перетащите фото сюда или выберите файлы (до 8 фото)
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Button type="button" variant="outline" asChild>
                        <label htmlFor="photo-upload" className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Выбрать файлы
                        </label>
                      </Button>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1}
                  >
                    Назад
                  </Button>

                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={step === 1 && (!formData.category_id || !formData.description)}
                    >
                      Далее
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading}>
                      {loading ? "Создание..." : "Создать заказ"}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default JobNew;