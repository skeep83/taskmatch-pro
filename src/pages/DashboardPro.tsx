import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { FloatingCard } from "@/components/ui/floating-card";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wallet, Star, UserCog, Calendar, Image as ImageIcon, MessageSquare, 
  CreditCard, Briefcase, Clock, ShieldCheck, TrendingUp, Award,
  Settings, Bell, Zap, Video, MapPin, CheckCircle, AlertCircle,
  BarChart3, DollarSign
} from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import dashboardPro from "@/assets/dashboard-pro.jpg";
import proWorkspace from "@/assets/pro-workspace.jpg";
import jobManagement from "@/assets/job-management.jpg";

const DashboardPro = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { formatPrice, loading: currencyLoading } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nearbyJobs, setNearbyJobs] = useState<any[]>([]);
  const [myActiveJobs, setMyActiveJobs] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [kycStatus, setKycStatus] = useState<string>('pending');
  const [monthlyEarnings, setMonthlyEarnings] = useState<number>(0);
  const [completedJobs, setCompletedJobs] = useState<number>(0);
  const [responseTime, setResponseTime] = useState<string>('< 1 час');
  const [tenders, setTenders] = useState<any[]>([]);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      console.log('DashboardPro: Starting initialization...');
      
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      
      if (!uid) {
        console.log('DashboardPro: No user session, redirecting to auth');
        toast({ title: "Требуется вход", description: "Пожалуйста, войдите" });
        navigate("/auth");
        return;
      }
      
      console.log('DashboardPro: User authenticated, setting userId');
      setUserId(uid);
      
      // Ensure user has pro role
      await ensureProRole(uid);
      
      // Load dashboard data
      console.log('DashboardPro: Loading dashboard data...');
      await Promise.all([
        loadNearbyJobs(uid),
        loadActiveJobs(uid),
        loadWalletBalance(uid),
        loadRatings(uid),
        loadKycStatus(uid),
        loadTenders(uid)
      ]);

      console.log('DashboardPro: Dashboard loaded successfully');
      setLoading(false);
    } catch (error: any) {
      console.error('DashboardPro: Error during initialization:', error);
      toast({ 
        title: "Ошибка загрузки", 
        description: error.message || "Не удалось загрузить данные", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  const ensureProRole = async (uid: string) => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "pro");
        
      if (!roles || roles.length === 0) {
        console.log('DashboardPro: Creating pro role for user');
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: uid, role: "pro" });
          
        if (error && !error.message.includes('duplicate')) {
          throw error;
        }
        
        toast({ 
          title: "Добро пожаловать!", 
          description: "Роль специалиста активирована" 
        });
      }
    } catch (error: any) {
      console.error('DashboardPro: Error ensuring pro role:', error);
      // Don't throw - just log and continue
    }
  };

  const loadNearbyJobs = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('jobs')
        .select('id, description, status, scheduled_at, budget_min_cents, budget_max_cents')
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(20);
      setNearbyJobs(data || []);
    } catch (error) {
      console.error('DashboardPro: Error loading nearby jobs:', error);
    }
  };

  const loadActiveJobs = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('jobs')
        .select('id, description, status, scheduled_at, budget_min_cents, budget_max_cents')
        .eq('pro_id', uid)
        .in('status', ['accepted', 'in_progress', 'done'])
        .order('created_at', { ascending: false })
        .limit(20);
      
      const jobs = data || [];
      setMyActiveJobs(jobs);
      
      // Calculate completed jobs count
      const completed = jobs.filter(job => job.status === 'done').length;
      setCompletedJobs(completed);
    } catch (error) {
      console.error('DashboardPro: Error loading active jobs:', error);
    }
  };

  const loadWalletBalance = async (uid: string) => {
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance_cents')
        .eq('pro_id', uid)
        .maybeSingle();
      setWalletBalance(wallet?.balance_cents || 0);
    } catch (error) {
      console.error('DashboardPro: Error loading wallet balance:', error);
    }
  };

  const loadRatings = async (uid: string) => {
    try {
      const { data: ratings } = await supabase
        .from('ratings')
        .select('score')
        .eq('to_user_id', uid)
        .limit(200);
      const scores = (ratings || []).map((r: any) => r.score as number);
      const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
      setRatingAvg(avg);
      setRatingCount(scores.length);
    } catch (error) {
      console.error('DashboardPro: Error loading ratings:', error);
    }
  };

  const loadKycStatus = async (uid: string) => {
    try {
      const { data: docs } = await supabase
        .from('kyc_documents')
        .select('status')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1);
      setKycStatus(docs?.[0]?.status || 'pending');
    } catch (error) {
      console.error('DashboardPro: Error loading KYC status:', error);
    }
  };

  const loadTenders = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('tenders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);
      setTenders(data || []);
    } catch (error) {
      console.error('DashboardPro: Error loading tenders:', error);
    }
  };

  if (loading) return (
    <main className="relative min-h-screen flex items-center justify-center">
      <div className="card-surface p-8 text-center animate-pulse-glow">
        <h1 className="text-2xl font-display font-bold text-gradient mb-4">Загружаем кабинет специалиста...</h1>
        <div className="flex items-center justify-center gap-2">
          <NeumorphicIcon icon={Clock} size={32} variant="square" className="animate-spin" />
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen">
      <Seo title={`${t('app.name')} — Кабинет специалиста`} description="Pro dashboard" canonical="/pro/dashboard" />
      
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-12">
          <div className="animate-fade-in">
            <h1 className="text-4xl lg:text-5xl font-display font-bold text-gradient mb-2">
              Кабинет специалиста
            </h1>
            <p className="text-xl text-muted-foreground">
              Управляйте заказами и развивайте бизнес
            </p>
          </div>
          
          <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <NeumorphicIcon icon={kycStatus === 'approved' ? CheckCircle : AlertCircle} 
                size={32} 
                variant="square"
                className={kycStatus === 'approved' ? 'text-success' : 'text-amber-500'} 
              />
              <span className="text-sm font-medium">
                KYC: {kycStatus === 'approved' ? 'Верифицирован' : 'Требует проверки'}
              </span>
            </div>
            <button className="btn-ghost flex items-center gap-2">
              <NeumorphicIcon icon={Bell} size={32} variant="square" />
              Уведомления
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
          <div className="p-6 text-center rounded-xl bg-white shadow-lg border border-gray-100">
            <Wallet className="h-12 w-12 text-slate-500 mb-4 mx-auto" />
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatPrice(walletBalance)}
            </div>
            <div className="text-sm text-muted-foreground">Баланс</div>
          </div>
          
          <div className="p-6 text-center rounded-xl bg-white shadow-lg border border-gray-100">
            <Star className="h-12 w-12 text-slate-500 mb-4 mx-auto" />
            <div className="flex flex-col items-center">
              <StarRating 
                rating={ratingAvg || 0} 
                size="md" 
                showValue 
                showCount 
                count={ratingCount}
                className="mb-1"
              />
            </div>
          </div>
          
          <div className="p-6 text-center rounded-xl bg-white shadow-lg border border-gray-100">
            <DollarSign className="h-12 w-12 text-slate-500 mb-4 mx-auto" />
            <div className="text-2xl font-bold text-primary mb-1">
              {formatPrice(monthlyEarnings)}
            </div>
            <div className="text-sm text-muted-foreground">Этот месяц</div>
          </div>
          
          <div className="p-6 text-center rounded-xl bg-white shadow-lg border border-gray-100">
            <Award className="h-12 w-12 text-slate-500 mb-4 mx-auto" />
            <div className="text-2xl font-bold text-accent mb-1">{completedJobs}</div>
            <div className="text-sm text-muted-foreground">Выполнено</div>
          </div>
          
          <div className="p-6 text-center rounded-xl bg-white shadow-lg border border-gray-100">
            <Clock className="h-12 w-12 text-slate-500 mb-4 mx-auto" />
            <div className="text-2xl font-bold text-purple-500 mb-1">{responseTime}</div>
            <div className="text-sm text-muted-foreground">Время ответа</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12">
          <div className="p-4 text-center cursor-pointer rounded-xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <Link to="/pro/profile" className="flex flex-col items-center gap-2">
              <UserCog className="h-10 w-10 text-slate-500" />
              <span className="text-sm font-medium">Профиль</span>
            </Link>
          </div>
          
          <div className="p-4 text-center cursor-pointer rounded-xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <Link to="/pro/schedule" className="flex flex-col items-center gap-2">
              <Calendar className="h-10 w-10 text-slate-500" />
              <span className="text-sm font-medium">Расписание</span>
            </Link>
          </div>
          
          <div className="p-4 text-center cursor-pointer rounded-xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <Link to="/portfolio" className="flex flex-col items-center gap-2">
              <ImageIcon className="h-10 w-10 text-slate-500" />
              <span className="text-sm font-medium">Портфолио</span>
            </Link>
          </div>
          
          <div className="p-4 text-center cursor-pointer rounded-xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <Link to="/tenders" className="flex flex-col items-center gap-2">
              <Briefcase className="h-10 w-10 text-slate-500" />
              <span className="text-sm font-medium">Тендеры</span>
            </Link>
          </div>
          
          <div className="p-4 text-center cursor-pointer rounded-xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <button className="flex flex-col items-center gap-2 w-full">
              <CreditCard className="h-10 w-10 text-slate-500" />
              <span className="text-sm font-medium">Выплата</span>
            </button>
          </div>
          
          <div className="p-4 text-center cursor-pointer rounded-xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <Link to="/kyc" className="flex flex-col items-center gap-2">
              <ShieldCheck className="h-10 w-10 text-slate-500" />
              <span className="text-sm font-medium">KYC</span>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Available Jobs */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-xl bg-white shadow-lg border border-gray-100 p-8 relative overflow-hidden">
              <div 
                className="absolute inset-0 opacity-10 bg-cover bg-center"
                style={{ backgroundImage: `url(${proWorkspace})` }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-10 w-10 text-slate-500" />
                  <h2 className="text-2xl font-display font-bold">Доступные заказы</h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {nearbyJobs.length} заказов поблизости
                  </div>
                </div>

                <div className="space-y-4">
                  {nearbyJobs.length === 0 && (
                    <div className="text-center py-12">
                      <Briefcase className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
                      <h3 className="text-lg font-semibold mb-2">Нет доступных заказов</h3>
                      <p className="text-muted-foreground mb-6">Проверьте позже или расширьте радиус поиска</p>
                      <Link to="/pro/profile" className="btn-hero">
                        Настроить профиль
                      </Link>
                    </div>
                  )}

                  {nearbyJobs.slice(0, 5).map((job, index) => (
                    <div key={job.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{job.description || 'Новый заказ'}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-5 w-5" />
                              <span>{job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString() : 'Не указано'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-5 w-5" />
                              <span>
                                {job.budget_min_cents && job.budget_max_cents
                                  ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                                  : job.budget_min_cents
                                  ? `от ${formatPrice(job.budget_min_cents)}`
                                  : job.budget_max_cents
                                  ? `до ${formatPrice(job.budget_max_cents)}`
                                  : 'Договорная'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="btn-hero text-sm px-4 py-2">
                          Принять заказ
                        </button>
                        <button className="btn-ghost text-sm px-4 py-2">
                          Предложить цену
                        </button>
                        <button className="btn-ghost text-sm px-4 py-2 flex items-center gap-1">
                          <Video className="h-5 w-5" />
                          Видео-оценка
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Jobs */}
            <div className="rounded-xl bg-white shadow-lg border border-gray-100 p-8 relative overflow-hidden">
              <div 
                className="absolute inset-0 opacity-10 bg-cover bg-center"
                style={{ backgroundImage: `url(${jobManagement})` }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-10 w-10 text-slate-500" />
                  <h2 className="text-2xl font-display font-bold">Мои заказы</h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {myActiveJobs.length} активных заказов
                  </div>
                </div>

                <div className="space-y-4">
                  {myActiveJobs.length === 0 && (
                    <div className="text-center py-12">
                      <Clock className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
                      <h3 className="text-lg font-semibold mb-2">Нет активных заказов</h3>
                      <p className="text-muted-foreground">Найдите новые заказы выше</p>
                    </div>
                  )}

                  {myActiveJobs.map((job, index) => (
                    <div key={job.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{job.description || 'Заказ'}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              job.status === 'accepted' ? 'bg-amber-100 text-amber-800' :
                              job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'done' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status === 'accepted' ? 'Принят' :
                               job.status === 'in_progress' ? 'В работе' :
                               job.status === 'done' ? 'Завершен' :
                               job.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {job.status === 'accepted' && (
                          <button className="btn-hero text-sm px-4 py-2">
                            Начать работу
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button className="btn-hero text-sm px-4 py-2">
                            Завершить работу
                          </button>
                        )}
                        <button className="btn-ghost text-sm px-4 py-2 flex items-center gap-1">
                          <MessageSquare className="h-5 w-5" />
                          Чат
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Overview */}
            <div className="rounded-xl bg-white shadow-lg border border-gray-100 p-6">
              <h3 className="font-semibold mb-4">Обзор аккаунта</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Статус верификации</span>
                  <div className="flex items-center gap-1">
                    {kycStatus === 'approved' ? (
                      <CheckCircle className="h-6 w-6 text-slate-500" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-slate-500" />
                    )}
                    <span className="text-sm font-medium">
                      {kycStatus === 'approved' ? 'Верифицирован' : 'Проверка'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Время ответа</span>
                  <span className="text-sm font-medium">{responseTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Всего заказов</span>
                  <span className="text-sm font-medium">{completedJobs}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Актуальные тендеры</h3>
                <Link to="/tenders" className="text-sm text-primary hover:underline">Все тендеры</Link>
              </div>
              
              <div className="space-y-3">
                {tenders.length === 0 && (
                  <div className="text-center py-4">
                    <Briefcase className="h-12 w-12 text-slate-500 mb-2 mx-auto" />
                    <p className="text-sm text-muted-foreground">Нет активных тендеров</p>
                  </div>
                )}

                {tenders.slice(0, 3).map((tender, index) => (
                  <div key={tender.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="font-medium text-sm mb-1">{tender.title || 'Тендер'}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Заявок: {tender.bids_count || 0}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-success font-medium">
                        {tender.budget_cents ? formatPrice(tender.budget_cents) : 'Договорная'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'Без срока'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardPro;