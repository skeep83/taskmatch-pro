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
  const isPreviewOnly = true;

  const showPreviewOnlyToast = (actionLabel: string) => {
    toast({
      title: "Режим предпросмотра",
      description: `${actionLabel} временно недоступно: раздел тендеров пока работает на mock-данных и не подключён к боевому backend.`,
      variant: "destructive"
    });
  };

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      // Note: This would be a real API call in production
      // const data = await adminApi.getTenders(params);

      // Mock data for now
      const mockTenders: Tender[] = [
        {
          id: "1",
          title: "Ремонт сантехники в офисе",
          client_name: "ООО Техник",
          status: "active",
          bids_count: 5,
          budget_max_cents: 50000,
          deadline: "2024-01-15T10:00:00Z",
          created_at: "2024-01-01T10:00:00Z",
          category: "Сантехника"
        },
        {
          id: "2",
          title: "Электромонтажные работы",
          client_name: "Стройком ЛТД",
          status: "completed",
          bids_count: 8,
          budget_max_cents: 120000,
          deadline: "2024-01-10T15:00:00Z",
          created_at: "2023-12-28T09:00:00Z",
          category: "Электрика",
          winner_id: "pro1",
          winner_name: "Иванов И.И."
        }
      ];

      setTenders(mockTenders);
      setTotalPages(1);
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
      // Mock bids data
      const mockBids: Bid[] = [
        {
          id: "1",
          pro_name: "Иванов И.И.",
          price_cents: 45000,
          warranty_days: 365,
          note: "Качественная работа, 10 лет опыта",
          eta_slot: "завтра 9:00-12:00",
          is_final: true,
          created_at: "2024-01-02T10:00:00Z"
        },
        {
          id: "2",
          pro_name: "Петров П.П.",
          price_cents: 48000,
          warranty_days: 180,
          note: "Быстрое выполнение",
          eta_slot: "сегодня 14:00-17:00",
          is_final: false,
          created_at: "2024-01-02T11:30:00Z"
        }
      ];
      setBids(mockBids);
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
    if (isPreviewOnly) {
      showPreviewOnlyToast("Выбор победителя тендера");
      return;
    }

    try {
      // await adminApi.selectTenderWinner(tenderId, bidId);
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
    if (isPreviewOnly) {
      showPreviewOnlyToast("Отмена тендера");
      return;
    }

    try {
      // await adminApi.cancelTender(tenderId);
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
        <Seo title="ServiceHub — Тендеры" description="Управление тендерами" canonical="/admin/tenders" />
        <div className="flex items-center justify-center py-12">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <Seo title="ServiceHub — Тендеры" description="Управление тендерами" canonical="/admin/tenders" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Управление тендерами</h1>
          <p className="text-sm text-muted-foreground">Мониторинг и управление тендерными процедурами</p>
        </div>
      </div>

      {isPreviewOnly && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-amber-900">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Preview-only раздел</p>
                <p className="text-sm">
                  Тендеры в этой админ-странице сейчас показываются из mock-данных. Просмотр структуры доступен,
                  но выбор победителя и отмена тендера намеренно отключены до подключения боевого backend.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
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
          <div className="overflow-x-auto">
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
                                <div className="overflow-x-auto">
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
                                              disabled={isPreviewOnly}
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
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {tender.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPreviewOnly}
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
          </div>
        </CardContent>
      </Card>
    </section>
  );
}