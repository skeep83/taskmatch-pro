import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { FloatingCard } from "@/components/ui/floating-card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate, Link } from "react-router-dom";
import { 
  Wallet, Star, UserCog, Calendar, Image as ImageIcon, MessageSquare, 
  CreditCard, Briefcase, Clock, ShieldCheck, TrendingUp, Award,
  Settings, Bell, Zap, Video, MapPin, CheckCircle, AlertCircle,
  BarChart3, DollarSign
} from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import dashboardPro from "@/assets/dashboard-pro.jpg";

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
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) {
        toast({ title: "Требуется вход", description: "Пожалуйста, войдите" });
        navigate("/auth");
        return;
      }
      setUserId(uid);
      
      
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
        
      if (error) {
        console.error('Role check error:', error);
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
        navigate("/");
        return;
      }
      
      const hasPro = (roles || []).some((r: any) => r.role === "pro");
      if (!hasPro) {
        // Instead of redirecting, create the pro role automatically
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: uid, role: "pro" });
          
        if (insertError) {
          console.error('Insert role error:', insertError);
          toast({ 
            title: "Требуется активация", 
            description: "Активируйте роль специалиста в личном кабинете", 
            variant: "destructive" 
          });
          navigate("/");
          return;
        }
        
        toast({ 
          title: "Добро пожаловать!", 
          description: "Роль специалиста активирована" 
        });
      }

      // Load all necessary data
      await Promise.all([
        loadNearbyJobs(uid, supabase),
        loadActiveJobs(uid, supabase),
        loadWalletBalance(uid, supabase),
        loadRatings(uid, supabase),
        loadKycStatus(uid, supabase),
        loadTenders(uid, supabase)
      ]);

      setLoading(false);
    })();
  }, [navigate, toast]);

  const loadNearbyJobs = async (uid: string, supabase: any) => {
    const { data } = await supabase
      .from('jobs')
      .select('id, description, status, scheduled_at, budget_min_cents, budget_max_cents')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(20);
    setNearbyJobs(data || []);
  };

  const loadActiveJobs = async (uid: string, supabase: any) => {
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
  };

  const loadWalletBalance = async (uid: string, supabase: any) => {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_cents')
      .eq('pro_id', uid)
      .maybeSingle();
    setWalletBalance(wallet?.balance_cents || 0);
  };

  const loadRatings = async (uid: string, supabase: any) => {
    const { data: ratings } = await supabase
      .from('ratings')
      .select('score')
      .eq('to_user_id', uid)
      .limit(200);
    const scores = (ratings || []).map((r: any) => r.score as number);
    const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
    setRatingAvg(avg);
    setRatingCount(scores.length);
  };

  const loadKycStatus = async (uid: string, supabase: any) => {
    const { data: docs } = await supabase
      .from('kyc_documents')
      .select('status')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1);
    setKycStatus(docs?.[0]?.status || 'pending');
  };

  const loadTenders = async (uid: string, supabase: any) => {
    const { data } = await supabase
      .from('tenders')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);
    setTenders(data || []);
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!userId) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'accepted', 
          pro_id: userId 
        })
        .eq('id', jobId)
        .eq('status', 'new');

      if (error) throw error;

      toast({ 
        title: "Заказ принят", 
        description: "Заказ успешно принят в работу" 
      });

      // Refresh data
      const { supabase: refreshSupabase } = await import("@/integrations/supabase/client");
      await Promise.all([
        loadNearbyJobs(userId, refreshSupabase),
        loadActiveJobs(userId, refreshSupabase)
      ]);
    } catch (error: any) {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось принять заказ", 
        variant: "destructive" 
      });
    }
  };

  const handleOfferPrice = (jobId: string) => {
    navigate(`/job/${jobId}/application`);
  };

  const handleVideoEvaluation = (jobId: string) => {
    // Generate video room URL (in real app, this would be handled by backend)
    const roomId = `job-${jobId}-${Date.now()}`;
    const videoUrl = `https://meet.jit.si/${roomId}`;
    
    toast({ 
      title: "Видео-оценка", 
      description: "Открываем комнату для видео-оценки..." 
    });
    
    // Open video in new tab
    window.open(videoUrl, '_blank');
  };

  const handleStartWork = async (jobId: string) => {
    if (!userId) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'in_progress',
          start_confirmed: true
        })
        .eq('id', jobId)
        .eq('pro_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;

      toast({ 
        title: "Работа начата", 
        description: "Статус заказа изменен на 'В процессе'" 
      });

      // Refresh active jobs
      const { supabase: refreshSupabase } = await import("@/integrations/supabase/client");
      await loadActiveJobs(userId, refreshSupabase);
    } catch (error: any) {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось начать работу", 
        variant: "destructive" 
      });
    }
  };

  const handleFinishWork = async (jobId: string) => {
    if (!userId) return;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'done',
          end_confirmed: true
        })
        .eq('id', jobId)
        .eq('pro_id', userId)
        .eq('status', 'in_progress');

      if (error) throw error;

      toast({ 
        title: "Работа завершена", 
        description: "Заказ успешно завершен" 
      });

      // Refresh active jobs
      const { supabase: refreshSupabase } = await import("@/integrations/supabase/client");
      await loadActiveJobs(userId, refreshSupabase);
    } catch (error: any) {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось завершить работу", 
        variant: "destructive" 
      });
    }
  };

  const handleOpenChat = (jobId: string) => {
    navigate(`/messages?job=${jobId}`);
  };

  if (loading) return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${dashboardPro})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      <FloatingCard className="p-8 text-center animate-pulse-glow">
        <h1 className="text-2xl font-display font-bold text-gradient mb-4">Загружаем кабинет специалиста...</h1>
        <div className="flex items-center justify-center gap-2">
          <AnimatedIcon icon={Clock} className="animate-spin" />
        </div>
      </FloatingCard>
    </main>
  );

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${dashboardPro})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      
      <Seo title={`${t('app.name')} — Кабинет специалиста`} description="Pro dashboard" canonical="/pro/dashboard" />
      
      <div className="container mx-auto py-8 px-6 relative z-10">
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
              <AnimatedIcon icon={kycStatus === 'approved' ? CheckCircle : AlertCircle} 
                size={20} 
                className={kycStatus === 'approved' ? 'text-success' : 'text-amber-500'} 
              />
              <span className="text-sm font-medium">
                KYC: {kycStatus === 'approved' ? 'Верифицирован' : 'Требует проверки'}
              </span>
            </div>
            <button className="btn-ghost flex items-center gap-2">
              <AnimatedIcon icon={Bell} size={20} />
              Уведомления
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
          <FloatingCard className="p-6 text-center" delay={100} hover glow>
            <AnimatedIcon icon={Wallet} size={32} className="text-success mb-4" />
            <div className="text-2xl font-bold text-success mb-1">
              {formatPrice(walletBalance)}
            </div>
            <div className="text-sm text-muted-foreground">Баланс</div>
          </FloatingCard>
          
          <FloatingCard className="p-6 text-center" delay={200} hover glow>
            <AnimatedIcon icon={Star} size={32} className="text-amber-500 mb-4" />
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
          </FloatingCard>
          
          <FloatingCard className="p-6 text-center" delay={300} hover glow>
            <AnimatedIcon icon={DollarSign} size={32} className="text-primary mb-4" />
            <div className="text-2xl font-bold text-primary mb-1">
              {formatPrice(monthlyEarnings)}
            </div>
            <div className="text-sm text-muted-foreground">Этот месяц</div>
          </FloatingCard>
          
          <FloatingCard className="p-6 text-center" delay={400} hover glow>
            <AnimatedIcon icon={Award} size={32} className="text-accent mb-4" />
            <div className="text-2xl font-bold text-accent mb-1">{completedJobs}</div>
            <div className="text-sm text-muted-foreground">Выполнено</div>
          </FloatingCard>
          
          <FloatingCard className="p-6 text-center" delay={500} hover glow>
            <AnimatedIcon icon={Clock} size={32} className="text-purple-500 mb-4" />
            <div className="text-2xl font-bold text-purple-500 mb-1">{responseTime}</div>
            <div className="text-sm text-muted-foreground">Время ответа</div>
          </FloatingCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12">
          <FloatingCard className="p-4 text-center cursor-pointer hover:scale-105 transition-all" delay={100}>
            <Link to="/pro/profile" className="flex flex-col items-center gap-2">
              <AnimatedIcon icon={UserCog} size={24} className="text-primary" />
              <span className="text-sm font-medium">Профиль</span>
            </Link>
          </FloatingCard>
          
          <FloatingCard className="p-4 text-center cursor-pointer hover:scale-105 transition-all" delay={200}>
            <Link to="/pro/schedule" className="flex flex-col items-center gap-2">
              <AnimatedIcon icon={Calendar} size={24} className="text-primary" />
              <span className="text-sm font-medium">Расписание</span>
            </Link>
          </FloatingCard>
          
          <FloatingCard className="p-4 text-center cursor-pointer hover:scale-105 transition-all" delay={300}>
            <Link to="/portfolio" className="flex flex-col items-center gap-2">
              <AnimatedIcon icon={ImageIcon} size={24} className="text-primary" />
              <span className="text-sm font-medium">Портфолио</span>
            </Link>
          </FloatingCard>
          
          <FloatingCard className="p-4 text-center cursor-pointer hover:scale-105 transition-all" delay={400}>
            <Link to="/tenders" className="flex flex-col items-center gap-2">
              <AnimatedIcon icon={Briefcase} size={24} className="text-primary" />
              <span className="text-sm font-medium">Тендеры</span>
            </Link>
          </FloatingCard>
          
          <FloatingCard className="p-4 text-center cursor-pointer hover:scale-105 transition-all" delay={500}>
            <button className="flex flex-col items-center gap-2 w-full">
              <AnimatedIcon icon={CreditCard} size={24} className="text-primary" />
              <span className="text-sm font-medium">Выплата</span>
            </button>
          </FloatingCard>
          
          <FloatingCard className="p-4 text-center cursor-pointer hover:scale-105 transition-all" delay={600}>
            <Link to="/kyc" className="flex flex-col items-center gap-2">
              <AnimatedIcon icon={ShieldCheck} size={24} className="text-primary" />
              <span className="text-sm font-medium">KYC</span>
            </Link>
          </FloatingCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Available Jobs */}
            <FloatingCard className="p-8" delay={200} hover>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <AnimatedIcon icon={Briefcase} size={28} className="text-primary" />
                  <h2 className="text-2xl font-display font-bold">Доступные заказы</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  {nearbyJobs.length} заказов поблизости
                </div>
              </div>

              <div className="space-y-4">
                {nearbyJobs.length === 0 && (
                  <div className="text-center py-12">
                    <AnimatedIcon icon={Briefcase} size={48} className="text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет доступных заказов</h3>
                    <p className="text-muted-foreground mb-6">Проверьте позже или расширьте радиус поиска</p>
                    <Link to="/pro/profile" className="btn-hero">
                      Настроить профиль
                    </Link>
                  </div>
                )}

                {nearbyJobs.map((j, index) => (
                  <FloatingCard key={j.id} className="p-6" delay={index * 50} hover>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{j.description}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <AnimatedIcon icon={DollarSign} size={14} />
                            {j.budget_min_cents && j.budget_max_cents ? 
                              `${formatPrice(j.budget_min_cents)} - ${formatPrice(j.budget_max_cents)}` :
                              j.budget_min_cents ? `от ${formatPrice(j.budget_min_cents)}` :
                              j.budget_max_cents ? `до ${formatPrice(j.budget_max_cents)}` : 'Договорная'
                            }
                          </div>
                          <div className="flex items-center gap-1">
                            <AnimatedIcon icon={Calendar} size={14} />
                            {j.scheduled_at ? new Date(j.scheduled_at).toLocaleDateString() : 'Гибкий график'}
                          </div>
                          <div className="flex items-center gap-1">
                            <AnimatedIcon icon={MapPin} size={14} />
                            Рядом
                          </div>
                        </div>
                        
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Новый заказ
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleAcceptJob(j.id)}
                          className="btn-hero text-sm animate-pulse-glow"
                        >
                          Принять
                        </button>
                        <button 
                          onClick={() => handleOfferPrice(j.id)}
                          className="btn-ghost text-sm"
                        >
                          Предложить цену
                        </button>
                        <button 
                          onClick={() => handleVideoEvaluation(j.id)}
                          className="btn-ghost text-sm flex items-center gap-1"
                        >
                          <AnimatedIcon icon={Video} size={14} />
                          Видео-оценка
                        </button>
                      </div>
                    </div>
                  </FloatingCard>
                ))}
              </div>
            </FloatingCard>

            {/* Active Jobs */}
            <FloatingCard className="p-8" delay={300} hover>
              <div className="flex items-center gap-3 mb-6">
                <AnimatedIcon icon={Clock} size={28} className="text-primary" />
                <h2 className="text-2xl font-display font-bold">Мои активные заказы</h2>
              </div>

              <div className="space-y-4">
                {myActiveJobs.length === 0 && (
                  <div className="text-center py-8">
                    <AnimatedIcon icon={Clock} size={32} className="text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Пока нет активных заказов</p>
                  </div>
                )}

                {myActiveJobs.map((j, index) => (
                  <FloatingCard key={j.id} className="p-6" delay={index * 50} hover>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{j.description}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <AnimatedIcon icon={Clock} size={14} />
                            {j.status === 'accepted' ? 'Принят' : 
                             j.status === 'in_progress' ? 'В работе' : 
                             j.status === 'done' ? 'Завершен' : j.status}
                          </div>
                          <div className="flex items-center gap-1">
                            <AnimatedIcon icon={Calendar} size={14} />
                            {j.scheduled_at ? new Date(j.scheduled_at).toLocaleDateString() : 'Без срока'}
                          </div>
                        </div>
                        
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                          j.status === 'accepted' ? 'bg-amber-100 text-amber-800' :
                          j.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                          j.status === 'done' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            j.status === 'accepted' ? 'bg-amber-500' :
                            j.status === 'in_progress' ? 'bg-purple-500' :
                            j.status === 'done' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`} />
                          {j.status === 'accepted' ? 'Принят к работе' :
                           j.status === 'in_progress' ? 'В процессе' :
                           j.status === 'done' ? 'Завершен' : j.status}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          className="btn-ghost text-sm flex items-center gap-2"
                          onClick={() => handleOpenChat(j.id)}
                        >
                          <AnimatedIcon icon={MessageSquare} size={16} />
                          Чат
                        </button>
                        {j.status === 'accepted' && (
                          <button 
                            className="btn-hero text-sm"
                            onClick={() => handleStartWork(j.id)}
                          >
                            Начать работу
                          </button>
                        )}
                        {j.status === 'in_progress' && (
                          <button 
                            className="btn-hero text-sm"
                            onClick={() => handleFinishWork(j.id)}
                          >
                            Завершить
                          </button>
                        )}
                      </div>
                    </div>
                  </FloatingCard>
                ))}
              </div>
            </FloatingCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Earnings Analytics */}
            <FloatingCard className="p-6" delay={400} hover>
              <div className="flex items-center gap-3 mb-4">
                <AnimatedIcon icon={TrendingUp} size={24} className="text-primary" />
                <h3 className="font-semibold">Аналитика доходов</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Сегодня</span>
                  <span className="font-semibold">{formatPrice(12500)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Эта неделя</span>
                  <span className="font-semibold">{formatPrice(85000)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Этот месяц</span>
                  <span className="font-semibold text-primary">{formatPrice(234000)}</span>
                </div>
              </div>
              
              <button className="btn-ghost w-full text-sm mt-4 flex items-center justify-center gap-2">
                <AnimatedIcon icon={BarChart3} size={16} />
                Подробная аналитика
              </button>
            </FloatingCard>

            {/* Instant Payout */}
            <FloatingCard className="p-6" delay={500} hover>
              <div className="flex items-center gap-3 mb-4">
                <AnimatedIcon icon={Zap} size={24} className="text-accent" />
                <h3 className="font-semibold">Мгновенные выплаты</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Доступно для вывода: <span className="font-semibold text-success">{formatPrice(walletBalance)}</span>
              </p>
              
              <button className="btn-hero w-full text-sm animate-pulse-glow flex items-center justify-center gap-2">
                <AnimatedIcon icon={CreditCard} size={16} />
                Запросить выплату
              </button>
              
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Средства поступят в течение 15 минут
              </p>
            </FloatingCard>

            {/* Tenders */}
            <FloatingCard className="p-6" delay={600} hover>
              <div className="flex items-center gap-3 mb-4">
                <AnimatedIcon icon={Briefcase} size={24} className="text-primary" />
                <h3 className="font-semibold">Активные тендеры</h3>
              </div>
              
              <div className="space-y-3">
                {tenders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет активных тендеров</p>
                ) : (
                  tenders.map((t, index) => (
                    <div key={t.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <h5 className="font-medium text-sm mb-1">{t.title}</h5>
                      <p className="text-xs text-muted-foreground">
                        До {new Date(t.deadline_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              
              <Link to="/tenders" className="btn-ghost w-full text-sm mt-4">
                Посмотреть все тендеры
              </Link>
            </FloatingCard>

            {/* Performance Metrics */}
            <FloatingCard className="p-6" delay={700} hover>
              <h3 className="font-semibold mb-4">Показатели</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Время ответа</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Отлично</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Качество работ</span>
                  <div className="flex items-center gap-1">
                    <AnimatedIcon icon={Star} size={14} className="text-amber-500" />
                    <span className="text-sm font-medium">4.9</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Надежность</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">98%</span>
                  </div>
                </div>
              </div>
            </FloatingCard>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardPro;
