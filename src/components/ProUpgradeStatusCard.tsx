import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle, XCircle, RefreshCw, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedI18n } from "@/i18n/enhanced";

interface ProUpgradeStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

interface ProUpgradeStatusProps {
  userId: string;
}

export const ProUpgradeStatusCard = ({ userId }: ProUpgradeStatusProps) => {
  const { t } = useEnhancedI18n();
  const [request, setRequest] = useState<ProUpgradeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<{ approved: boolean; hasDocuments: boolean }>({ approved: false, hasDocuments: false });
  const [userHasProRole, setUserHasProRole] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUpgradeStatus();
    
    // Настройка реального времени для отслеживания изменений статуса заявки
    const requestsChannel = supabase
      .channel('pro_upgrade_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pro_upgrade_requests',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('ProUpgradeStatusCard: Request status updated:', payload);
          loadUpgradeStatus();
        }
      )
      .subscribe();

    // Настройка реального времени для отслеживания изменений ролей пользователя
    const rolesChannel = supabase
      .channel('user_roles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('ProUpgradeStatusCard: User roles updated:', payload);
          checkUserProRole();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, [userId]);

  const loadUpgradeStatus = async () => {
    try {
      setLoading(true);
      
      // Загружаем статус заявки
      const { data: requestData, error: requestError } = await supabase
        .from('pro_upgrade_requests')
        .select('id, status, submitted_at, reviewed_at, rejection_reason')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError) throw requestError;
      setRequest(requestData as ProUpgradeStatus | null);

      // Проверяем статус KYC документов
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_documents')
        .select('status')
        .eq('user_id', userId);

      if (kycError) throw kycError;

      const hasDocuments = kycData && kycData.length > 0;
      const allApproved = hasDocuments && kycData.every(doc => doc.status === 'approved');
      
      setKycStatus({
        approved: allApproved,
        hasDocuments
      });

      // Проверяем роль пользователя
      await checkUserProRole();

    } catch (error) {
      console.error('Error loading upgrade status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserProRole = async () => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'pro');
      
      setUserHasProRole(!!roles && roles.length > 0);
    } catch (error) {
      console.error('Error checking user pro role:', error);
    }
  };


  const submitNewRequest = async () => {
    try {
      setResubmitting(true);
      
      // Get current profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get current KYC documents
      const { data: kycDocs } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', userId);

      // Submit new upgrade request
      const { error } = await supabase
        .from('pro_upgrade_requests')
        .insert({
          user_id: userId,
          profile_data: profile,
          kyc_documents: kycDocs || []
        });

      if (error) throw error;

      toast({
        title: t("ui.zaiavka_podana"),
        description: t("ui.vasha_novaia_zaiavka_na")
      });

      // Refresh status
      await loadUpgradeStatus();
    } catch (error) {
      console.error('Error submitting new request:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_podat_zaiavku_2"),
        variant: "destructive"
      });
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-neo neo-8 rounded-2xl">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{t("ui.proveriaem_status_zaiavki")}</span>
        </div>
      </div>
    );
  }

  // Скрыть карточку если:
  // 1. Пользователь уже имеет роль 'pro' ИЛИ
  // 2. Заявки нет ИЛИ 
  // 3. Заявка одобрена И все KYC документы одобрены
  if (userHasProRole || !request || (request.status === 'approved' && kycStatus.approved)) {
    return null;
  }

  const getStatusConfig = () => {
    switch (request.status) {
      case 'pending':
        return {
          icon: Clock,
          title: t("ui.zaiavka_rassmatrivaetsia"),
          description: t("ui.vasha_zaiavka_na_status_2"),
          badge: <Badge variant="outline" className="text-yellow-600 bg-neo neo-4 border-yellow-300"><Clock className="w-3 h-3 mr-1" />{t("ui.ozhidaet")}</Badge>,
          color: "bg-neo neo-8"
        };
      case 'approved':
        return {
          icon: CheckCircle,
          title: t("ui.zaiavka_odobrena"),
          description: t("ui.pozdravliaem_vasha_zaiavka_odobrena_2"),
          badge: <Badge variant="default" className="text-green-600 bg-neo neo-4 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />{t("ui.odobreno")}</Badge>,
          color: "bg-neo neo-8"
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: t("ui.zaiavka_otklonena"),
          description: t("ui.k_sozhaleniiu_vasha_zaiavka"),
          badge: <Badge variant="destructive" className="bg-neo neo-4"><XCircle className="w-3 h-3 mr-1" />{t("ui.otkloneno")}</Badge>,
          color: "bg-neo neo-8"
        };
      default:
        return {
          icon: AlertCircle,
          title: t("ui.status_neizvesten"),
          description: t("ui.ne_udalos_opredelit_status"),
          badge: <Badge variant="outline" className="bg-neo neo-4">{t("common.unknown")}</Badge>,
          color: "bg-neo neo-8"
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className={`${config.color} rounded-2xl p-8`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-display font-bold">{config.title}</h3>
        </div>
        {config.badge}
      </div>

      <div className="space-y-6">
        <p className="text-muted-foreground">
          {config.description}
        </p>

        <div className="space-y-3 text-sm">
          <div className="p-4 bg-neo neo-inset-4 rounded-xl">
            <span className="text-muted-foreground">Подана: </span>
            <span className="font-medium">{formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true, locale: ru })}</span>
          </div>
          
          {request.reviewed_at && (
            <div className="p-4 bg-neo neo-inset-4 rounded-xl">
              <span className="text-muted-foreground">Рассмотрена: </span>
              <span className="font-medium">{formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true, locale: ru })}</span>
            </div>
          )}
        </div>

        {request.status === 'rejected' && request.rejection_reason && (
          <div className="p-4 bg-neo neo-inset-4 rounded-xl border-l-4 border-red-400">
            <p className="text-sm font-medium text-red-800 mb-2">{t("ui.prichina_otkloneniia")}</p>
            <p className="text-sm text-red-700">{request.rejection_reason}</p>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="p-4 bg-neo neo-inset-4 rounded-xl border-l-4 border-blue-400">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              📋 Среднее время рассмотрения: 24 часа
            </p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            {request.status === 'rejected' && (
              <button 
                onClick={submitNewRequest}
                disabled={resubmitting}
                className="px-6 py-3 bg-neo neo-8 hover:neo-4 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed mr-3"
              >
                <Send className="w-4 h-4" />
                {resubmitting ? t("ui.podacha_zaiavki") : t("ui.podat_novuiu_zaiavku")}
              </button>
            )}
          </div>
          
          <button 
            onClick={loadUpgradeStatus}
            className="px-6 py-3 bg-neo neo-8 hover:neo-4 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить статус
          </button>
        </div>
      </div>
    </div>
  );
};