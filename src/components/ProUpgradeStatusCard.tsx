import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

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
  const [request, setRequest] = useState<ProUpgradeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpgradeStatus();
  }, [userId]);

  const loadUpgradeStatus = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('pro_upgrade_requests')
        .select('id, status, submitted_at, reviewed_at, rejection_reason')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error('Error loading upgrade status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Проверяем статус заявки...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return null; // No request found
  }

  const getStatusConfig = () => {
    switch (request.status) {
      case 'pending':
        return {
          icon: Clock,
          title: "Заявка рассматривается",
          description: "Ваша заявка на статус специалиста находится на рассмотрении у администрации",
          badge: <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Ожидает</Badge>,
          color: "border-yellow-200 bg-yellow-50"
        };
      case 'approved':
        return {
          icon: CheckCircle,
          title: "Заявка одобрена!",
          description: "Поздравляем! Ваша заявка одобрена, и вы получили статус специалиста",
          badge: <Badge variant="default" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Одобрено</Badge>,
          color: "border-green-200 bg-green-50"
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: "Заявка отклонена",
          description: "К сожалению, ваша заявка была отклонена",
          badge: <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Отклонено</Badge>,
          color: "border-red-200 bg-red-50"
        };
      default:
        return {
          icon: AlertCircle,
          title: "Статус неизвестен",
          description: "Не удалось определить статус заявки",
          badge: <Badge variant="outline">Неизвестно</Badge>,
          color: "border-gray-200 bg-gray-50"
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <Card className={`${config.color} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconComponent className="w-5 h-5" />
            {config.title}
          </CardTitle>
          {config.badge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Подана:</span>
            <span>{formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true, locale: ru })}</span>
          </div>
          
          {request.reviewed_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Рассмотрена:</span>
              <span>{formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true, locale: ru })}</span>
            </div>
          )}
        </div>

        {request.status === 'rejected' && request.rejection_reason && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-1">Причина отклонения:</p>
            <p className="text-sm text-red-700">{request.rejection_reason}</p>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              📋 Среднее время рассмотрения: 24 часа
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadUpgradeStatus}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Обновить статус
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};