import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  FileText, 
  Camera, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  Eye,
  Trash2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
}

interface KycDocument {
  id: string;
  doc_type: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface KycWizardProps {
  userId: string;
  onComplete: () => void;
}

const steps = [
  { id: 'personal', title: 'Личные данные', icon: User },
  { id: 'documents', title: 'Документы', icon: FileText },
  { id: 'selfie', title: 'Селфи', icon: Camera },
  { id: 'review', title: 'Проверка', icon: CheckCircle }
];

export const KycWizard = ({ userId, onComplete }: KycWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    address: ''
  });
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Personal info
        return personalInfo.firstName && personalInfo.lastName && personalInfo.dateOfBirth;
      case 1: // Documents
        return documents.some(doc => doc.doc_type === 'id_card');
      case 2: // Selfie
        return documents.some(doc => doc.doc_type === 'selfie');
      default:
        return true;
    }
  };

  const savePersonalInfo = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: personalInfo.firstName,
          last_name: personalInfo.lastName,
          full_name: `${personalInfo.firstName} ${personalInfo.lastName}`
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast({
        title: "Данные сохранены",
        description: "Личная информация успешно обновлена"
      });
      nextStep();
    } catch (error) {
      console.error('Error saving personal info:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить личные данные",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, docType: string) => {
    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc')
        .getPublicUrl(fileName);

      const { data, error: insertError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: userId,
          doc_type: docType,
          file_url: publicUrl
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setDocuments(prev => [...prev, data]);
      toast({
        title: "Документ загружен",
        description: "Файл успешно загружен и отправлен на проверку"
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить документ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Ошибка камеры",
        description: "Не удалось получить доступ к камере",
        variant: "destructive"
      });
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      await uploadDocument(file, 'selfie');
      stopCamera();
    }, 'image/jpeg', 0.8);
  };

  const deleteDocument = async (docId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('kyc_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      toast({
        title: "Документ удален",
        description: "Документ успешно удален"
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить документ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const submitForReview = async () => {
    try {
      setLoading(true);
      
      // Create or update pro upgrade request
      const { error } = await supabase
        .from('pro_upgrade_requests')
        .upsert({
          user_id: userId,
          profile_data: JSON.parse(JSON.stringify(personalInfo)),
          kyc_documents: JSON.parse(JSON.stringify(documents)),
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Заявка подана!",
        description: "Ваши документы отправлены на проверку. Мы уведомим вас о результате в течение 24 часов."
      });
      
      onComplete();
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось подать заявку на проверку",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Personal Info
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Личная информация</h3>
              <p className="text-muted-foreground">Заполните ваши личные данные для верификации</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Имя *</Label>
                <Input
                  id="firstName"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Введите ваше имя"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Фамилия *</Label>
                <Input
                  id="lastName"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Введите вашу фамилию"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Дата рождения *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="nationality">Гражданство</Label>
                <Input
                  id="nationality"
                  value={personalInfo.nationality}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, nationality: e.target.value }))}
                  placeholder="Молдова"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Адрес проживания</Label>
                <Input
                  id="address"
                  value={personalInfo.address}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Введите ваш адрес"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={savePersonalInfo} disabled={!canProceedToNext() || loading}>
                {loading ? "Сохранение..." : "Продолжить"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 1: // Documents
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Документы удостоверения личности</h3>
              <p className="text-muted-foreground">Загрузите фото вашего паспорта или ID карты</p>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-6">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Загрузите четкое фото лицевой стороны документа
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDocument(file, 'id_card');
                  }}
                  className="hidden"
                  id="document-upload"
                />
                <label htmlFor="document-upload">
                  <Button variant="outline" disabled={loading} asChild>
                    <span>Выбрать файл</span>
                  </Button>
                </label>
              </div>
            </div>

            {documents.filter(doc => doc.doc_type === 'id_card').length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Загруженные документы:</h4>
                {documents.filter(doc => doc.doc_type === 'id_card').map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium">Документ удостоверения личности</p>
                        <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'}>
                          {doc.status === 'pending' ? 'На проверке' : 
                           doc.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteDocument(doc.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <Button onClick={nextStep} disabled={!canProceedToNext()}>
                Продолжить
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2: // Selfie
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Селфи для верификации</h3>
              <p className="text-muted-foreground">Сделайте четкое фото себя для подтверждения личности</p>
            </div>

            {!isCapturing ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                  <Camera className="w-16 h-16 text-muted-foreground" />
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-left">
                        <h4 className="font-medium text-blue-900 mb-1">Рекомендации для селфи:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Убедитесь, что ваше лицо хорошо освещено</li>
                          <li>• Смотрите прямо в камеру</li>
                          <li>• Снимите головные уборы и очки</li>
                          <li>• Убедитесь, что фон простой и не отвлекающий</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={startCamera} size="lg">
                    <Camera className="w-5 h-5 mr-2" />
                    Сделать селфи
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">или</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDocument(file, 'selfie');
                      }}
                      className="hidden"
                      id="selfie-upload"
                    />
                    <label htmlFor="selfie-upload">
                      <Button variant="outline" disabled={loading} asChild>
                        <span>Загрузить фото</span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-80 h-60 object-cover rounded-lg border"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="flex justify-center gap-3">
                  <Button onClick={capturePhoto} size="lg">
                    <Camera className="w-5 h-5 mr-2" />
                    Сделать фото
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Отмена
                  </Button>
                </div>
              </div>
            )}

            {documents.filter(doc => doc.doc_type === 'selfie').length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Селфи:</h4>
                {documents.filter(doc => doc.doc_type === 'selfie').map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Camera className="w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium">Селфи</p>
                        <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'}>
                          {doc.status === 'pending' ? 'На проверке' : 
                           doc.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteDocument(doc.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <Button onClick={nextStep} disabled={!canProceedToNext()}>
                Продолжить
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Проверка данных</h3>
              <p className="text-muted-foreground">Убедитесь, что все данные указаны корректно</p>
            </div>

            <div className="space-y-6">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Личная информация</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Имя:</span>
                    <p className="font-medium">{personalInfo.firstName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Фамилия:</span>
                    <p className="font-medium">{personalInfo.lastName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата рождения:</span>
                    <p className="font-medium">{personalInfo.dateOfBirth}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Гражданство:</span>
                    <p className="font-medium">{personalInfo.nationality || 'Не указано'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Загруженные документы</h4>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <span>
                        {doc.doc_type === 'id_card' ? 'Документ удостоверения личности' : 
                         doc.doc_type === 'selfie' ? 'Селфи' : doc.doc_type}
                      </span>
                      <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'}>
                        {doc.status === 'pending' ? 'На проверке' : 
                         doc.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">Готово к отправке</h4>
                    <p className="text-sm text-green-800">
                      Ваши данные будут отправлены на проверку. Обычно проверка занимает до 24 часов.
                      Вы получите уведомление о результате.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <Button onClick={submitForReview} disabled={loading} size="lg">
                {loading ? "Отправка..." : "Отправить на проверку"}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                  ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                  ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                  ${!isActive && !isCompleted ? 'border-muted-foreground bg-background' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-6 h-6" />
                  )}
                </div>
                <div className="ml-3 hidden md:block">
                  <p className={`text-sm font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 md:w-16 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};