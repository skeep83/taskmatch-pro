import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { 
  Briefcase, 
  User, 
  Calendar, 
  Settings, 
  Plus,
  Clock,
  CheckCircle,
  MessageSquare,
  Star,
  Heart,
  CreditCard,
  Shield,
  Gift,
  MapPin,
  Phone,
  Bell,
  Gavel,
  Crown,
  Video,
  DollarSign,
  Eye,
  AlertCircle,
  PlayCircle,
  XCircle,
  Zap
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'cancelled';
  budget_min_cents?: number;
  budget_max_cents?: number;
  created_at: string;
  scheduled_at?: string;
  urgency: string;
  pro_id?: string;
  categories?: {
    label_ru: string;
  };
}

interface Subscription {
  id: string;
  plan: 'basic' | 'plus' | 'max';
  status: 'active' | 'cancelled' | 'expired';
  expires_at: string;
  auto_renew: boolean;
}

export default function DashboardClient() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalSpent: 0,
    averageRating: 0,
    refferalCode: '',
    subscriptionStatus: 'none' as 'none' | 'basic' | 'plus' | 'max'
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.session.user);
      setLoading(false);
    } catch (error: any) {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Ошибка аутентификации", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      // Load user jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          status,
          budget_min_cents,
          budget_max_cents,
          created_at,
          scheduled_at,
          urgency,
          pro_id,
          categories:category_id (
            label_ru
          )
        `)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Calculate stats
      const totalJobs = jobsData?.length || 0;
      const activeJobs = jobsData?.filter(j => ['accepted', 'in_progress'].includes(j.status)).length || 0;
      const completedJobs = jobsData?.filter(j => j.status === 'done').length || 0;
      const totalSpent = jobsData?.reduce((sum, j) => {
        if (j.budget_min_cents && j.budget_max_cents) {
          return sum + (j.budget_min_cents + j.budget_max_cents) / 2;
        }
        return sum;
      }, 0) || 0;

      setStats(prev => ({
        ...prev,
        totalJobs,
        activeJobs,
        completedJobs,
        totalSpent,
        refferalCode: `REF${user.id.slice(-8).toUpperCase()}`
      }));

    } catch (error: any) {
      console.error('Failed to load user data:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <PlayCircle className="h-4 w-4" />;
      case 'done': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new': { label: 'Новый', variant: 'secondary' as const },
      'accepted': { label: 'Принят', variant: 'default' as const },
      'in_progress': { label: 'В работе', variant: 'default' as const },
      'done': { label: 'Выполнен', variant: 'default' as const },
      'cancelled': { label: 'Отменен', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const };
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {statusInfo.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      'normal': { label: 'Обычный', variant: 'outline' as const },
      'urgent': { label: 'Срочно', variant: 'secondary' as const },
      'same_day': { label: 'В тот же день', variant: 'destructive' as const }
    };
    
    const urgencyInfo = urgencyMap[urgency as keyof typeof urgencyMap] || { label: urgency, variant: 'outline' as const };
    return <Badge variant={urgencyInfo.variant}>{urgencyInfo.label}</Badge>;
  };

  const formatPrice = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return "Не указан";
    
    const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    
    if (minCents && maxCents) {
      return `${formatCents(minCents)} - ${formatCents(maxCents)}`;
    }
    
    return formatCents(minCents || maxCents || 0);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="card-surface p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Загружаем кабинет клиента...</h1>
          <div className="animate-spin">⏳</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Кабинет клиента
          </h1>
          <p className="text-xl text-muted-foreground">
            Добро пожаловать, {user?.email}
          </p>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Обзор</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Заказы</span>
            </TabsTrigger>
            <TabsTrigger value="tenders" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              <span className="hidden sm:inline">Тендеры</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Подписка</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Платежи</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Рефералы</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Всего заказов</p>
                      <p className="text-2xl font-bold">{stats.totalJobs}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Активных</p>
                      <p className="text-2xl font-bold">{stats.activeJobs}</p>
                    </div>
                    <Clock className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Завершено</p>
                      <p className="text-2xl font-bold">{stats.completedJobs}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Потрачено</p>
                      <p className="text-2xl font-bold">${(stats.totalSpent / 100).toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                onClick={() => navigate("/job/new")}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={Plus} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Создать заказ</h3>
                      <p className="text-sm text-muted-foreground">Инстант-бронирование</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                onClick={() => setActiveTab("tenders")}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={Gavel} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Создать тендер</h3>
                      <p className="text-sm text-muted-foreground">Получить предложения</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                onClick={() => setActiveTab("subscription")}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={Crown} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">HomeCare</h3>
                      <p className="text-sm text-muted-foreground">Подписка Premium</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                onClick={() => navigate("/messages")}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={MessageSquare} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Сообщения</h3>
                      <p className="text-sm text-muted-foreground">Чат со специалистами</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Последние заказы</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>У вас пока нет заказов</p>
                    <p className="text-sm mb-4">Создайте первый заказ для поиска специалистов</p>
                    <Button onClick={() => navigate("/job/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Создать заказ
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{job.title || "Без названия"}</h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {job.categories?.label_ru || "Другое"} • {formatPrice(job.budget_min_cents, job.budget_max_cents)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {job.pro_id && (
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Мои заказы</CardTitle>
                <Button onClick={() => navigate("/job/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать заказ
                </Button>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>У вас пока нет заказов</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Заказ</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Бюджет</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{job.title || "Без названия"}</div>
                              <div className="text-sm text-muted-foreground">
                                {job.categories?.label_ru || "Другое"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>{formatPrice(job.budget_min_cents, job.budget_max_cents)}</TableCell>
                          <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {job.pro_id && (
                                <>
                                  <Button variant="outline" size="sm">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Video className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenders Tab */}
          <TabsContent value="tenders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Тендеры
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Функция тендеров в разработке</p>
                  <p className="text-sm">Скоро вы сможете создавать тендеры и получать предложения от специалистов</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    HomeCare Подписка
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border rounded-lg p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">Basic</h3>
                        <div className="text-2xl font-bold mb-4">$9.99/мес</div>
                        <ul className="text-sm space-y-2 mb-6">
                          <li>✓ Приоритетная поддержка</li>
                          <li>✓ Скидка 5% на заказы</li>
                          <li>✓ SLA 24 часа</li>
                        </ul>
                        <Button variant="outline" className="w-full">Выбрать</Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-6 border-primary bg-primary/5">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">Plus</h3>
                        <div className="text-2xl font-bold mb-4">$19.99/мес</div>
                        <ul className="text-sm space-y-2 mb-6">
                          <li>✓ Все из Basic</li>
                          <li>✓ Скидка 10% на заказы</li>
                          <li>✓ SLA 12 часов</li>
                          <li>✓ Приоритетное размещение</li>
                        </ul>
                        <Button className="w-full">Выбрать</Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">Max</h3>
                        <div className="text-2xl font-bold mb-4">$39.99/мес</div>
                        <ul className="text-sm space-y-2 mb-6">
                          <li>✓ Все из Plus</li>
                          <li>✓ Скидка 15% на заказы</li>
                          <li>✓ SLA 6 часов</li>
                          <li>✓ Персональный менеджер</li>
                          <li>✓ Гарантия качества</li>
                        </ul>
                        <Button variant="outline" className="w-full">Выбрать</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  История платежей
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Платежей пока нет</p>
                  <p className="text-sm">Здесь будет история ваших платежей и эскроу</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Реферальная программа
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Ваш реферальный код</h3>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-3 py-2 rounded text-lg font-mono">
                      {stats.refferalCode}
                    </code>
                    <Button variant="outline" size="sm">Копировать</Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Поделитесь кодом с друзьями и получайте бонусы за каждого нового пользователя
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-6 border rounded-lg">
                    <div className="text-3xl font-bold text-primary mb-2">0</div>
                    <div className="text-sm text-muted-foreground">Приглашенных друзей</div>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <div className="text-3xl font-bold text-success mb-2">$0.00</div>
                    <div className="text-sm text-muted-foreground">Заработано бонусов</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Профиль
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <div className="text-sm text-muted-foreground">{user?.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Телефон</label>
                      <div className="text-sm text-muted-foreground">Не указан</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Адреса
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Адресов пока нет</p>
                    <p className="text-sm mb-4">Добавьте адреса для быстрого оформления заказов</p>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить адрес
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Уведомления
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Email уведомления</div>
                      <div className="text-sm text-muted-foreground">Получать уведомления на email</div>
                    </div>
                    <Button variant="outline" size="sm">Настроить</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">SMS уведомления</div>
                      <div className="text-sm text-muted-foreground">Получать SMS о статусе заказов</div>
                    </div>
                    <Button variant="outline" size="sm">Настроить</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}