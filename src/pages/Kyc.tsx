import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useNavigate } from "react-router-dom";
import { KycWizard } from "@/components/kyc/KycWizard";
import { supabase } from "@/integrations/supabase/client";

const Kyc = () => {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id || null;
      
      if (!uid) {
        navigate('/auth');
        return;
      }
      
      setUserId(uid);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleKycComplete = () => {
    navigate('/dashboard/pro');
  };

  if (loading) {
    return (
      <main className="container mx-auto py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <main className="container mx-auto py-12 px-4">
      <Seo 
        title={`${t('app.name')} — Верификация KYC`} 
        description="Пошаговая верификация личности для получения статуса специалиста" 
        canonical="/kyc" 
      />
      
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">{t("kyc.title")}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Пройдите простую процедуру верификации, чтобы получить статус специалиста 
          и начать принимать заказы на платформе
        </p>
      </div>

      <KycWizard userId={userId} onComplete={handleKycComplete} />
    </main>
  );
};

export default Kyc;
