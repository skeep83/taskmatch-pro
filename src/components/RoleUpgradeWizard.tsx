import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { upgradeUserRole, UserRole } from "@/lib/userRoles";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, 
  Building2, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  User,
  Phone,
  MapPin,
  Upload,
  ArrowRight,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RoleUpgradeWizardProps {
  userId: string;
  currentRole: UserRole;
  targetRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRole: UserRole) => void;
}

interface RequirementStatus {
  profile: boolean;
  kyc: boolean;
  documents: boolean;
}

interface ProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  bio?: string;
}

const roleConfig = {
  pro: {
    title: "Специалист",
    icon: Briefcase,
    requirements: [
      "Заполненный профиль (имя, телефон, город)",
      "Краткое био описание ваших услуг", 
      "Загрузка документа удостоверения личности"
    ]
  },
  business: {
    title: "Бизнес",
    icon: Building2,
    requirements: [
      "Заполненные данные компании",
      "Документы регистрации бизнеса",
      "Контактная информация и реквизиты"
    ]
  }
};

export const RoleUpgradeWizard = ({ 
  userId, 
  currentRole, 
  targetRole, 
  isOpen, 
  onClose, 
  onSuccess 
}: RoleUpgradeWizardProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState<RequirementStatus>({
    profile: false,
    kyc: false, 
    documents: false
  });
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const config = roleConfig[targetRole];
  const totalSteps = 3;

  useEffect(() => {
    if (isOpen) {
      checkRequirements();
      loadProfileData();
    }
  }, [isOpen, userId]);

  const checkRequirements = async () => {
    try {
      // Check profile completeness
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, city')
        .eq('id', userId)
        .single();

      const profileComplete = profile?.first_name && 
                            profile?.last_name && 
                            profile?.phone && 
                            profile?.city;

      // Check KYC documents
      const { data: kycDocs } = await supabase
        .from('kyc_documents')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'approved');

      const kycComplete = kycDocs && kycDocs.length > 0;

      setRequirements({
        profile: !!profileComplete,
        kyc: kycComplete,
        documents: kycComplete // For now, same as KYC
      });
    } catch (error) {
      console.error('Error checking requirements:', error);
    }
  };

  const loadProfileData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, city')
        .eq('id', userId)
        .single();

      if (profile) {
        setProfileData(profile);
      }

      // Load pro profile if upgrading to pro
      if (targetRole === 'pro') {
        const { data: proProfile } = await supabase
          .from('pro_profiles')
          .select('bio')
          .eq('user_id', userId)
          .single();
        
        if (proProfile) {
          setProfileData(prev => ({ ...prev, bio: proProfile.bio }));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfileData = async () => {
    try {
      setLoading(true);

      // Update main profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          city: profileData.city
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update/create pro profile if needed
      if (targetRole === 'pro' && profileData.bio) {
        const { error: proError } = await supabase
          .from('pro_profiles')
          .upsert({
            user_id: userId,
            bio: profileData.bio
          });
        
        if (proError) throw proError;
      }

      toast({
        title: "Профиль обновлен",
        description: "Данные профиля успешно сохранены"
      });

      setStep(2);
      await checkRequirements();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить профиль",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File) => {
    try {
      setUploadingDoc(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('kyc')
        .getPublicUrl(fileName);

      // Create KYC document record
      const { error: docError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: userId,
          doc_type: 'id_card',
          file_url: urlData.publicUrl
        });

      if (docError) throw docError;

      toast({
        title: "Документ загружен",
        description: "Документ отправлен на проверку"
      });

      await checkRequirements();
      setStep(3);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить документ",
        variant: "destructive"
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const completeUpgrade = async () => {
    try {
      setLoading(true);
      
      // For pro role, submit upgrade request instead of direct upgrade
      if (targetRole === 'pro') {
        // Gather KYC documents
        const { data: kycDocs } = await supabase
          .from('kyc_documents')
          .select('*')
          .eq('user_id', userId);

        // Submit upgrade request for admin review
        const { error } = await supabase
          .from('pro_upgrade_requests')
          .insert({
            user_id: userId,
            profile_data: profileData,
            kyc_documents: kycDocs || []
          });

        if (error) throw error;

        toast({
          title: "Заявка подана!",
          description: "Ваша заявка на статус специалиста отправлена на рассмотрение администрации. Мы свяжемся с вами в течение 24 часов."
        });
      } else {
        // For business role, use direct upgrade
        const result = await upgradeUserRole(userId, targetRole);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        toast({
          title: "Апгрейд завершен!",
          description: `Вы успешно стали ${config.title.toLowerCase()}ом`
        });
        onSuccess(targetRole);
      }
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось завершить операцию",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    return (step / totalSteps) * 100;
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return requirements.profile;
      case 2:
        return requirements.documents;
      case 3:
        return requirements.profile && requirements.documents;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon className="w-5 h-5" />
            Стать {config.title.toLowerCase()}ом
          </DialogTitle>
          <DialogDescription>
            Пройдите несколько шагов для активации новых возможностей
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Прогресс</span>
              <span>Шаг {step} из {totalSteps}</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Profile Information */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Информация профиля
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Имя</Label>
                        <Input
                          id="firstName"
                          value={profileData.first_name || ''}
                          onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="Ваше имя"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Фамилия</Label>
                        <Input
                          id="lastName"
                          value={profileData.last_name || ''}
                          onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Ваша фамилия"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Телефон</Label>
                        <Input
                          id="phone"
                          value={profileData.phone || ''}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+373 XX XXX XXX"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">Город</Label>
                        <Input
                          id="city"
                          value={profileData.city || ''}
                          onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Ваш город"
                        />
                      </div>
                    </div>

                    {targetRole === 'pro' && (
                      <div>
                        <Label htmlFor="bio">Описание услуг</Label>
                        <Textarea
                          id="bio"
                          value={profileData.bio || ''}
                          onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Расскажите о ваших услугах и опыте"
                          rows={3}
                        />
                      </div>
                    )}

                    <Button onClick={saveProfileData} disabled={loading} className="w-full">
                      {loading ? "Сохраняем..." : "Сохранить и продолжить"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Document Upload */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Загрузка документов
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-4">
                        Загрузите фото удостоверения личности или паспорта
                      </p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadDocument(file);
                        }}
                        className="hidden"
                        id="documentUpload"
                      />
                      <Button asChild variant="outline" disabled={uploadingDoc}>
                        <label htmlFor="documentUpload" className="cursor-pointer">
                          {uploadingDoc ? "Загружаем..." : "Выбрать файл"}
                        </label>
                      </Button>
                    </div>

                    {requirements.documents && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Документ загружен и отправлен на проверку
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Verification & Completion */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {targetRole === 'pro' ? 'Готово к отправке' : 'Готово к активации'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {config.requirements.map((req, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{req}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        {targetRole === 'pro' ? (
                          "Все требования выполнены! После отправки заявки администрация рассмотрит вашу кандидатуру в течение 24 часов."
                        ) : (
                          "Все требования выполнены! Теперь вы можете активировать аккаунт бизнеса."
                        )}
                      </p>
                    </div>

                    <Button onClick={completeUpgrade} disabled={loading} className="w-full" size="lg">
                      {loading ? "Обрабатываем..." : (
                        targetRole === 'pro' ? "Отправить заявку на рассмотрение" : `Стать ${config.title.toLowerCase()}ом`
                      )}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};