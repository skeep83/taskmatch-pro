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
  Zap,
  Edit,
  Trash2
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
  const [userProfile, setUserProfile] = useState<any>(null);
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
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      
      setUserProfile(profileData);

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
          categories!inner (
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

  const canEditJob = (job: Job) => {
    return job.status === 'new' && !job.urgency; // Simple check - можно расширить логикой проверки эскроу
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Заказ удален',
        description: 'Заказ был успешно удален'
      });
      
      // Обновляем список заказов
      loadUserData();
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить заказ: ${error.message}`,
        variant: 'destructive'
      });
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
      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Кабинет клиента
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Добро пожаловать, {
              userProfile?.full_name || 
              (userProfile?.first_name && userProfile?.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}` 
                : user?.email)
            }
          </p>
        </div>

        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="card-surface p-2 rounded-2xl">
              <TabsList className="grid w-full grid-cols-7 bg-transparent">
                <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Обзор</span>
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Заказы</span>
                </TabsTrigger>
                <TabsTrigger value="tenders" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Gavel className="h-4 w-4" />
                  <span className="hidden sm:inline">Тендеры</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Crown className="h-4 w-4" />
                  <span className="hidden sm:inline">Подписка</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Платежи</span>
                </TabsTrigger>
                <TabsTrigger value="referrals" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Gift className="h-4 w-4" />
                  <span className="hidden sm:inline">Рефералы</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Настройки</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Всего заказов</p>
                      <p className="text-2xl font-bold">{stats.totalJobs}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Активных</p>
                      <p className="text-2xl font-bold">{stats.activeJobs}</p>
                    </div>
                    <Clock className="h-8 w-8 text-accent" />
                  </div>
                </div>

                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Завершено</p>
                      <p className="text-2xl font-bold">{stats.completedJobs}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                </div>

                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Потрачено</p>
                      <p className="text-2xl font-bold">${(stats.totalSpent / 100).toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => navigate("/job/new")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={Plus} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Создать заказ</h3>
                      <p className="text-sm text-muted-foreground">Инстант-бронирование</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => setActiveTab("tenders")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={Gavel} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Создать тендер</h3>
                      <p className="text-sm text-muted-foreground">Получить предложения</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => setActiveTab("subscription")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={Crown} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">HomeCare</h3>
                      <p className="text-sm text-muted-foreground">Подписка Premium</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => navigate("/messages")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={MessageSquare} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Сообщения</h3>
                      <p className="text-sm text-muted-foreground">Чат со специалистами</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Jobs */}
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6">Последние заказы</h2>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/job/${job.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEditJob(job) && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/job/${job.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {job.pro_id && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate("/messages")}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs">
              <div className="card-surface p-8">
                <div className="flex flex-row items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Мои заказы</h2>
                  <Button onClick={() => navigate("/job/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать заказ
                  </Button>
                </div>
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
                              <div className="font-medium">{job.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {job.categories?.label_ru || "Другое"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(job.status)}
                              {job.urgency !== 'normal' && getUrgencyBadge(job.urgency)}
                            </div>
                          </TableCell>
                          <TableCell>{formatPrice(job.budget_min_cents, job.budget_max_cents)}</TableCell>
                          <TableCell>
                            {new Date(job.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/job/${job.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEditJob(job) && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/job/${job.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeleteJob(job.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {job.pro_id && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate("/messages")}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Tenders Tab */}
            <TabsContent value="tenders">
              <div className="card-surface p-8">
                <div className="flex flex-row items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">Мои тендеры</h2>
                  <Button onClick={() => navigate("/tenders/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать тендер
                  </Button>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>У вас пока нет тендеров</p>
                  <p className="text-sm">Создайте тендер для получения предложений от специалистов</p>
                </div>
              </div>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="card-surface p-8">
                  <h2 className="text-2xl font-semibold mb-6">Подписка HomeCare</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold">Basic</h3>
                      </div>
                      <div className="text-2xl font-bold mb-2">99 <span className="text-sm font-normal">/мес</span></div>
                      <ul className="space-y-2 text-sm">
                        <li>• Приоритетная поддержка</li>
                        <li>• Скидка 5% на заказы</li>
                        <li>• Расширенная гарантия</li>
                      </ul>
                    </div>
                    
                    <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
                      <div className="flex items-center gap-2 mb-4">
                        <Crown className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold">Plus</h3>
                        <Badge>Популярный</Badge>
                      </div>
                      <div className="text-2xl font-bold mb-2">199 <span className="text-sm font-normal">/мес</span></div>
                      <ul className="space-y-2 text-sm mb-4">
                        <li>• Все из Basic</li>
                        <li>• Скидка 10% на заказы</li>
                        <li>• Бесплатная диагностика</li>
                        <li>• Мгновенные выплаты</li>
                      </ul>
                      <Button className="w-full">Выбрать план</Button>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold">Max</h3>
                      </div>
                      <div className="text-2xl font-bold mb-2">399 <span className="text-sm font-normal">/мес</span></div>
                      <ul className="space-y-2 text-sm">
                        <li>• Все из Plus</li>
                        <li>• Скидка 15% на заказы</li>
                        <li>• Персональный менеджер</li>
                        <li>• VIP поддержка 24/7</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6">История платежей</h2>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>История платежей пуста</p>
                </div>
              </div>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals">
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6">Реферальная программа</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-4">Ваш реферальный код</h3>
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <code className="font-mono text-lg">{stats.refferalCode}</code>
                      <Button variant="outline" size="sm">Копировать</Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Поделитесь этим кодом с друзьями и получайте бонусы за каждого нового пользователя
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Статистика</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Приглашено:</span>
                        <span className="font-semibold">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Заработано:</span>
                        <span className="font-semibold">0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="card-surface p-8">
                  <h2 className="text-2xl font-semibold mb-6">Профиль</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input 
                        type="email" 
                        value={user?.email || ''} 
                        disabled 
                        className="w-full p-3 border rounded-lg bg-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Телефон</label>
                      <input 
                        type="tel" 
                        placeholder="+373 XX XXX XXX"
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="card-surface p-8">
                  <h2 className="text-2xl font-semibold mb-6">Уведомления</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Email уведомления</h4>
                        <p className="text-sm text-muted-foreground">Получать уведомления на email</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">SMS уведомления</h4>
                        <p className="text-sm text-muted-foreground">Получать SMS о важных событиях</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}