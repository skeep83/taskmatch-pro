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
    
    // Настройка реального времени для отслеживания изменений статуса
    const channel = supabase
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
          console.log('ProUpgradeStatusCard: Status updated:', payload);
          loadUpgradeStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Проверяем статус заявки...</span>
        </div>
      </div>
    );
  }

  // Скрыть карточку если заявка одобрена или если заявки нет
  if (!request || request.status === 'approved') {
    return null;
  }

  const getStatusConfig = () => {
    switch (request.status) {
      case 'pending':
        return {
          icon: Clock,
          title: "Заявка рассматривается",
          description: "Ваша заявка на статус специалиста находится на рассмотрении у администрации",
          badge: <Badge variant="outline" className="text-yellow-600 bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] border-yellow-300"><Clock className="w-3 h-3 mr-1" />Ожидает</Badge>,
          color: "bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
        };
      case 'approved':
        return {
          icon: CheckCircle,
          title: "Заявка одобрена!",
          description: "Поздравляем! Ваша заявка одобрена, и вы получили статус специалиста",
          badge: <Badge variant="default" className="text-green-600 bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Одобрено</Badge>,
          color: "bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: "Заявка отклонена",
          description: "К сожалению, ваша заявка была отклонена",
          badge: <Badge variant="destructive" className="bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"><XCircle className="w-3 h-3 mr-1" />Отклонено</Badge>,
          color: "bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
        };
      default:
        return {
          icon: AlertCircle,
          title: "Статус неизвестен",
          description: "Не удалось определить статус заявки",
          badge: <Badge variant="outline" className="bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]">Неизвестно</Badge>,
          color: "bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className={`${config.color} rounded-2xl p-8`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl">
            <span className="text-muted-foreground block mb-1">Подана:</span>
            <span className="font-medium">{formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true, locale: ru })}</span>
          </div>
          
          {request.reviewed_at && (
            <div className="p-4 bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl">
              <span className="text-muted-foreground block mb-1">Рассмотрена:</span>
              <span className="font-medium">{formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true, locale: ru })}</span>
            </div>
          )}
        </div>

        {request.status === 'rejected' && request.rejection_reason && (
          <div className="p-4 bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl border-l-4 border-red-400">
            <p className="text-sm font-medium text-red-800 mb-2">Причина отклонения:</p>
            <p className="text-sm text-red-700">{request.rejection_reason}</p>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="p-4 bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl border-l-4 border-blue-400">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              📋 Среднее время рассмотрения: 24 часа
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button 
            onClick={loadUpgradeStatus}
            className="px-6 py-3 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить статус
          </button>
        </div>
      </div>
    </div>
  );
};