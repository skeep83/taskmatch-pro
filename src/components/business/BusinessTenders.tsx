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
          budget_max_cents,
          deadline,
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
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка тендеров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Тендеры</h2>
          <p className="text-muted-foreground">Управление тендерами компании</p>
        </div>
        <Button onClick={() => navigate('/tenders/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Создать тендер
        </Button>
      </div>

      {tenders.length === 0 ? (
        <Card className="card-surface">
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Нет тендеров</h3>
                <p className="text-muted-foreground mb-6">
                  У вас пока нет созданных тендеров. Создайте первый тендер для получения предложений от специалистов.
                </p>
              </div>
              <Button onClick={() => navigate('/tenders/new')} className="gap-2">
                <Plus className="h-4 w-4" />
                Создать первый тендер
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-surface">
          <CardHeader>
            <CardTitle>Список тендеров</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Бюджет</TableHead>
                  <TableHead>Заявки</TableHead>
                  <TableHead>Срок подачи</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenders.map((tender) => (
                  <TableRow key={tender.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tender.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {tender.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(tender.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {formatPrice(tender.budget_max_cents)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {tender.bid_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(tender.deadline)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(tender.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/tenders/${tender.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};