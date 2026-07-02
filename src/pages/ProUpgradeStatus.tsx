import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  RefreshCw,
  User,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Seo } from '@/components/Seo';
import { useEnhancedI18n } from "@/i18n/enhanced";

interface ProUpgradeRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  profile_data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    city?: string;
    bio?: string;
  };
  kyc_documents: Array<{
    id: string;
    doc_type: string;
    file_url: string;
    status: string;
    created_at: string;
  }>;
}

export default function ProUpgradeStatus() {
  const { t } = useEnhancedI18n();
  const [request, setRequest] = useState<ProUpgradeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUpgradeRequest();
  }, []);

  const loadUpgradeRequest = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pro_upgrade_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setRequest(data as unknown as ProUpgradeRequest | null);
    } catch (error: any) {
      console.error('Error loading upgrade request:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_zagruzit_informaciiu"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: t("ui.na_rassmotrenii"),
          color: 'bg-yellow-100 text-yellow-800',
          description: t("ui.vasha_zaiavka_nahoditsia_na")
        };
      case 'approved':
        return {
          icon: CheckCircle,
          label: t("ui.odobrena"),
          color: 'bg-green-100 text-green-800',
          description: t("ui.pozdravliaem_vasha_zaiavka_odobrena")
        };
      case 'rejected':
        return {
          icon: XCircle,
          label: t("ui.otklonena"),
          color: 'bg-red-100 text-red-800',
          description: t("ui.zaiavka_byla_otklonena_oznakomtes")
        };
      default:
        return {
          icon: Clock,
          label: t("common.unknown"),
          color: 'bg-gray-100 text-gray-800',
          description: ''
        };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Загрузка...
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Seo 
          title={t("ui.status_zaiavki_specialista")}
          description={t("ui.proverte_status_vashei_zaiavki")}
        />
        
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <User className="w-5 h-5" />
                Заявка на статус специалиста
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="py-8">
                <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("ui.zaiavka_ne_naidena")}</h3>
                <p className="text-muted-foreground mb-6">
                  У вас пока нет активной заявки на статус специалиста.
                </p>
                <Button onClick={() => window.location.href = '/role-upgrade'}>
                  Подать заявку
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(request.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container mx-auto px-4 py-8">
      <Seo 
        title={t("ui.status_zaiavki_specialista")}
        description={t("ui.proverte_status_vashei_zaiavki")}
      />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{t("ui.status_zaiavki_specialista")}</h1>
          <p className="text-muted-foreground">
            Отслеживайте прогресс рассмотрения вашей заявки
          </p>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              Статус заявки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <Badge className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {statusInfo.description}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Подана {formatDistanceToNow(new Date(request.submitted_at), {
                    addSuffix: true,
                    locale: ru
                  })}
                </div>
                {request.reviewed_at && (
                  <div className="mt-1">
                    Рассмотрена {formatDistanceToNow(new Date(request.reviewed_at), {
                      addSuffix: true,
                      locale: ru
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reason */}
            {request.status === 'rejected' && request.rejection_reason && (
              <Alert className="border-red-200 bg-red-50">
                <MessageCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{t("ui.prichina_otkloneniia")}</strong><br />
                  {request.rejection_reason}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {request.status === 'approved' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{t("ui.pozdravliaem")}</strong><br />
                  Ваша заявка одобрена. Теперь вы можете принимать заказы как специалист.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Profile Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("ui.dannye_profilia")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>{t("ui.imia_3")}</strong> {request.profile_data.first_name || t("common.not_specified")}
              </div>
              <div>
                <strong>{t("ui.familiia_3")}</strong> {request.profile_data.last_name || t("common.not_specified")}
              </div>
              <div>
                <strong>{t("ui.telefon")}</strong> {request.profile_data.phone || t("dash.client.budget_na")}
              </div>
              <div>
                <strong>{t("ui.gorod_2")}</strong> {request.profile_data.city || t("dash.client.budget_na")}
              </div>
            </div>
            
            {request.profile_data.bio && (
              <div className="mt-4 text-sm">
                <strong>{t("ui.opisanie_uslug_2")}</strong>
                <p className="mt-1 p-2 bg-gray-50 rounded">{request.profile_data.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              Загруженные документы ({request.kyc_documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {request.kyc_documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("ui.dokumenty_ne_zagruzheny")}</p>
            ) : (
              <div className="space-y-3">
                {request.kyc_documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <div>
                        <span className="text-sm font-medium">{doc.doc_type}</span>
                        <Badge variant="outline" className="ml-2">{doc.status}</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.created_at), {
                        addSuffix: true,
                        locale: ru
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {request.status === 'rejected' && (
          <div className="text-center">
            <Button 
              onClick={() => window.location.href = '/role-upgrade'}
              className="bg-primary hover:bg-primary/90"
            >
              Подать заявку повторно
            </Button>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="text-center">
            <Button 
              onClick={() => window.location.href = '/dashboard/pro'}
              className="bg-green-600 hover:bg-green-700"
            >
              Перейти в панель специалиста
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}