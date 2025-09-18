import { useState, useEffect } from "react";
import { Seo } from "@/components/Seo";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Activity, Search, FileText, Award, AlertCircle, Users, DollarSign, Clock, Eye, Edit } from "lucide-react";

interface Tender {
  id: string;
  title: string;
  client_name: string;
  status: string;
  bids_count: number;
  budget_max_cents: number;
  deadline: string;
  created_at: string;
  category: string;
  winner_id?: string;
  winner_name?: string;
}

interface Bid {
  id: string;
  pro_name: string;
  price_cents: number;
  warranty_days: number;
  note: string;
  eta_slot: string;
  is_final: boolean;
  created_at: string;
}

export default function AdminTenders() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      
      let query = supabase
        .from('tenders')
        .select(`
          id, title, client_id, status, budget_max_cents, 
          deadline, created_at, category_id,
          profiles!tenders_client_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }
      
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      const { data: tendersData, error } = await query;

      if (error) throw error;

      // Получаем количество заявок для каждого тендера
      const tendersWithBids = await Promise.all(
        (tendersData || []).map(async (tender) => {
          const { count } = await supabase
            .from('bids')
            .select('id', { count: 'exact' })
            .eq('tender_id', tender.id);

          return {
            ...tender,
            client_name: `${tender.profiles?.first_name || ''} ${tender.profiles?.last_name || ''}`.trim() || 'Неизвестный клиент',
            bids_count: count || 0,
            category: 'Услуги' // Можно улучшить, получив название категории
          };
        })
      );
      
      setTenders(tendersWithBids);
      setTotalPages(Math.ceil(tendersWithBids.length / 20));
    } catch (error) {
      console.error("Failed to fetch tenders:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тендеры",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTenderBids = async (tenderId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data: bidsData, error } = await supabase
        .from('bids')
        .select(`
          id, price_cents, warranty_days, note, eta_slot, 
          is_final, created_at, pro_id,
          profiles!bids_pro_id_fkey(first_name, last_name)
        `)
        .eq('tender_id', tenderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBids = (bidsData || []).map(bid => ({
        ...bid,
        pro_name: `${bid.profiles?.first_name || ''} ${bid.profiles?.last_name || ''}`.trim() || 'Неизвестный специалист'
      }));

      setBids(formattedBids);
    } catch (error) {
      console.error("Failed to fetch bids:", error);
      toast({
        title: "Ошибка", 
        description: "Не удалось загрузить заявки",
        variant: "destructive"
      });
    }
  };

  const selectWinner = async (tenderId: string, bidId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { error } = await supabase.functions.invoke('admin-jobs', {
        body: {
          action: 'select_tender_winner',
          tender_id: tenderId,
          bid_id: bidId
        }
      });

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: "Победитель тендера выбран"
      });
      fetchTenders();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выбрать победителя",
        variant: "destructive"
      });
    }
  };

  const cancelTender = async (tenderId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { error } = await supabase
        .from('tenders')
        .update({ status: 'cancelled' })
        .eq('id', tenderId);

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: "Тендер отменен"
      });
      fetchTenders();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отменить тендер",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchTenders();
  }, [currentPage, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "draft": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Активный";
      case "completed": return "Завершен";
      case "cancelled": return "Отменен";
      case "draft": return "Черновик";
      default: return status;
    }
  };

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto card-surface">
        <Seo title="ServiceHub — Admin Tenders" description="Управление тендерами" canonical="/admin/tenders" />
        <div className="flex items-center justify-center py-12">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <Seo title="ServiceHub — Admin Tenders" description="Управление тендерами" canonical="/admin/tenders" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Управление тендерами</h1>
          <p className="text-sm text-muted-foreground">Мониторинг и управление тендерными процедурами</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Всего тендеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">+12 за неделю</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Активные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Принимают заявки</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Ср. заявок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.3</div>
            <p className="text-xs text-muted-foreground">На тендер</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Ср. экономия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18%</div>
            <p className="text-xs text-muted-foreground">От макс. бюджета</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры и поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию или клиенту..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="completed">Завершенные</SelectItem>
                <SelectItem value="cancelled">Отмененные</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список тендеров</CardTitle>
          <CardDescription>
            Все тендерные процедуры в системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тендер</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Заявки</TableHead>
                <TableHead>Бюджет</TableHead>
                <TableHead>Дедлайн</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenders.map((tender) => (
                <TableRow key={tender.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tender.title}</div>
                      <div className="text-sm text-muted-foreground">{tender.category}</div>
                    </div>
                  </TableCell>
                  <TableCell>{tender.client_name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(tender.status)}>
                      {getStatusText(tender.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {tender.bids_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      до ${(tender.budget_max_cents / 100).toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {new Date(tender.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTender(tender);
                              fetchTenderBids(tender.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Тендер: {selectedTender?.title}</DialogTitle>
                            <DialogDescription>
                              Заявки участников тендера
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedTender && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Клиент:</strong> {selectedTender.client_name}
                                </div>
                                <div>
                                  <strong>Категория:</strong> {selectedTender.category}
                                </div>
                                <div>
                                  <strong>Бюджет:</strong> до ${(selectedTender.budget_max_cents / 100).toFixed(2)}
                                </div>
                                <div>
                                  <strong>Дедлайн:</strong> {new Date(selectedTender.deadline).toLocaleString()}
                                </div>
                              </div>

                              {selectedTender.winner_name && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-green-600" />
                                    <span className="font-medium text-green-800">
                                      Победитель: {selectedTender.winner_name}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div>
                                <h4 className="font-medium mb-3">Заявки участников</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Специалист</TableHead>
                                      <TableHead>Цена</TableHead>
                                      <TableHead>Гарантия</TableHead>
                                      <TableHead>Время</TableHead>
                                      <TableHead>Действия</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {bids.map((bid) => (
                                      <TableRow key={bid.id}>
                                        <TableCell>
                                          <div>
                                            <div className="font-medium">{bid.pro_name}</div>
                                            {bid.note && (
                                              <div className="text-sm text-muted-foreground mt-1">
                                                {bid.note}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            ${(bid.price_cents / 100).toFixed(2)}
                                            {bid.is_final && (
                                              <Badge variant="outline" className="text-xs">
                                                Финальная
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>{bid.warranty_days} дней</TableCell>
                                        <TableCell>{bid.eta_slot}</TableCell>
                                        <TableCell>
                                          {selectedTender?.status === "active" && !selectedTender.winner_id && (
                                            <Button
                                              size="sm"
                                              onClick={() => selectWinner(selectedTender.id, bid.id)}
                                            >
                                              <Award className="w-4 h-4 mr-1" />
                                              Выбрать
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {tender.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelTender(tender.id)}
                        >
                          <AlertCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}