import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, DollarSign, Users, Eye } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface BusinessTender {
  id: string;
  title: string;
  description: string;
  budget_max_cents: number;
  deadline: string;
  status: string;
  created_at: string;
  bid_count: number;
  category_id: string | null;
}

export const BusinessTenders = () => {
  const [tenders, setTenders] = useState<BusinessTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const loadBusinessTenders = async () => {
    try {
      setLoading(true);

      // Get current user session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        toast({ title: 'Ошибка', description: 'Необходимо войти в систему' });
        return;
      }

      // Get business account ID
      const { data: businessAccount } = await supabase
        .from('business_accounts')
        .select('id')
        .eq('owner_id', session.session.user.id)
        .single();

      if (!businessAccount) {
        toast({ title: 'Ошибка', description: 'Бизнес аккаунт не найден' });
        return;
      }

      setBusinessId(businessAccount.id);

      // Load tenders for this business
      const { data: tendersData, error } = await supabase
        .from('tenders')
        .select(`
          id,
          title,
          description,
          budget_max_cents:budget_hint_cents,
          deadline:window_to,
          status,
          created_at,
          category_id
        `)
        .eq('business_id', businessAccount.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get bid counts for each tender
      const tendersWithBids = await Promise.all(
        (tendersData || []).map(async (tender) => {
          const { count } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('tender_id', tender.id);

          return {
            ...tender,
            bid_count: count || 0
          };
        })
      );

      setTenders(tendersWithBids);
    } catch (error: any) {
      console.error('Error loading tenders:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить тендеры',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessTenders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default">Открыт</Badge>;
      case 'closed':
        return <Badge variant="secondary">Закрыт</Badge>;
      case 'completed':
        return <Badge variant="outline">Завершен</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"></div>
          <span className="ml-3 text-black">Загрузка тендеров...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Тендеры</h2>
            <p className="text-gray-600">Управление тендерами компании</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/tenders/new')}
          className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl px-6 py-3 transition-all duration-300 flex items-center gap-2 text-black font-semibold"
        >
          <Plus className="h-4 w-4" />
          Создать тендер
        </button>
      </div>

      {tenders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-black mb-2">Нет тендеров</h3>
          <p className="text-gray-600 mb-6">
            У вас пока нет созданных тендеров. Создайте первый тендер для получения откликов исполнителей.
          </p>
          <button
            onClick={() => navigate('/tenders/new')}
            className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl px-8 py-4 transition-all duration-300 flex items-center gap-2 text-black font-semibold"
          >
            <Plus className="h-4 w-4" />
            Создать первый тендер
          </button>
        </div>
      ) : (
        <div className="bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-black mb-6">Список тендеров</h3>
          <div className="space-y-4">
            {tenders.map((tender) => (
              <div key={tender.id} className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-xl p-6 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-black text-lg mb-2">{tender.title}</h4>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{tender.description}</p>

                    <div className="flex items-center gap-4 mb-3">
                      {getStatusBadge(tender.status)}
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        {tender.bid_count} откликов
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Срок подачи: {formatDate(tender.deadline)}</span>
                      <span>Создан: {formatDate(tender.created_at)}</span>
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <div className="flex items-center gap-1 text-black font-semibold mb-3">
                      <DollarSign className="h-4 w-4" />
                      {formatPrice(tender.budget_max_cents)}
                    </div>
                    <button
                      onClick={() => navigate(`/tenders/${tender.id}`)}
                      className="bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] hover:shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] rounded-lg p-2 transition-all duration-300"
                    >
                      <Eye className="h-4 w-4 text-primary" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};