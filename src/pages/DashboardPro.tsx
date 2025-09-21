import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { FloatingCard } from "@/components/ui/floating-card";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ProUpgradeStatusCard } from "@/components/ProUpgradeStatusCard";
import { 
  Wallet, Star, UserCog, Calendar, Image as ImageIcon, MessageSquare, 
  CreditCard, Briefcase, Clock, ShieldCheck, TrendingUp, Award,
  Settings, Bell, Zap, Video, MapPin, CheckCircle, AlertCircle, XCircle,
  BarChart3, DollarSign
} from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import dashboardPro from "@/assets/dashboard-pro.jpg";
import proWorkspace from "@/assets/pro-workspace.jpg";
import jobManagement from "@/assets/job-management.jpg";
import kycVerification from "@/assets/kyc-verification.jpg";

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
  const [hasPendingProRequest, setHasPendingProRequest] = useState<boolean>(false);

  useEffect(() => {
    initializeDashboard();
    
    // Настройка реального времени для отслеживания изменений KYC документов
    const kycChannel = supabase
      .channel('kyc_documents_pro_dashboard')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kyc_documents'
        },
        (payload) => {
          console.log('DashboardPro: KYC document updated:', payload);
          // Перезагружаем KYC статус при любом обновлении
          if (userId) {
            loadKycStatus(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kycChannel);
    };
  }, [userId]);

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
        loadTenders(uid),
        checkProUpgradeStatus(uid)
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
        .select('id, client_id, description, status, scheduled_at, budget_min_cents, budget_max_cents')
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
      console.log('DashboardPro: Loading KYC status for user:', uid);
      const { data: docs, error } = await supabase
        .from('kyc_documents')
        .select('status, doc_type, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('DashboardPro: Error loading KYC documents:', error);
        setKycStatus('pending');
        return;
      }
      
      console.log('DashboardPro: KYC documents found:', docs);
      
      if (!docs || docs.length === 0) {
        console.log('DashboardPro: No KYC documents found, setting status to pending');
        setKycStatus('pending');
        return;
      }
      
      // Проверяем, есть ли хотя бы один одобренный документ
      const hasApprovedDoc = docs.some(doc => doc.status === 'approved');
      const hasRejectedDoc = docs.some(doc => doc.status === 'rejected');
      const allPending = docs.every(doc => doc.status === 'pending');
      
      let finalStatus = 'pending';
      if (hasApprovedDoc) {
        finalStatus = 'approved';
      } else if (hasRejectedDoc && !allPending) {
        finalStatus = 'rejected';  
      }
      
      console.log('DashboardPro: Final KYC status:', finalStatus);
      setKycStatus(finalStatus);
    } catch (error) {
      console.error('DashboardPro: Error loading KYC status:', error);
      setKycStatus('pending');
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

  const checkProUpgradeStatus = async (uid: string) => {
    try {
      const { data: requests } = await supabase
        .from('pro_upgrade_requests')
        .select('status')
        .eq('user_id', uid)
        .eq('status', 'pending')
        .limit(1);
      
      setHasPendingProRequest(requests && requests.length > 0);
    } catch (error) {
      console.error('DashboardPro: Error checking pro upgrade status:', error);
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
    <RoleGuard requiredRole="pro">
      <main className="min-h-screen">
        <Seo title={`${t('app.name')} — Кабинет специалиста`} description="Pro dashboard" canonical="/pro/dashboard" />
      
      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Кабинет специалиста
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Управляйте заказами и развивайте бизнес
          </p>
          
          <div className="flex justify-center mt-8">
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Pro Upgrade Status - показываем только если есть pending заявка */}
          {userId && (
            <div className="mb-12">
              <ProUpgradeStatusCard userId={userId} />
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="card-surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Баланс</p>
                  <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
                </div>
                <NeumorphicIcon icon={Wallet} size={64} variant="behance" />
              </div>
            </div>
            
            <div className="card-surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Рейтинг</p>
                  <div className="flex items-center gap-2">
                    <StarRating 
                      rating={ratingAvg || 0} 
                      size="sm" 
                      showValue 
                      showCount={false}
                    />
                    <span className="text-sm text-muted-foreground">({ratingCount})</span>
                  </div>
                </div>
                <NeumorphicIcon icon={Star} size={64} variant="behance" />
              </div>
            </div>
            
            <div className="card-surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Выполнено</p>
                  <p className="text-2xl font-bold">{completedJobs}</p>
                </div>
                <NeumorphicIcon icon={Award} size={64} variant="behance" />
              </div>
            </div>
            
            <div className="card-surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Время ответа</p>
                  <p className="text-2xl font-bold text-foreground">{responseTime}</p>
                </div>
                <NeumorphicIcon icon={Clock} size={64} variant="behance" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12">
            <button className="p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl">
              <Link to="/profile/settings" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">Профиль</span>
              </Link>
            </button>
            
            <button className="p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl">
              <Link to="/pro/schedule" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">Расписание</span>
              </Link>
            </button>
            
            <button className="p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl">
              <Link to="/portfolio" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">Портфолио</span>
              </Link>
            </button>
            
            <button className="p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl">
              <Link to="/tenders" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">Тендеры</span>
              </Link>
            </button>
            
            <button className="p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl">
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">Выплата</span>
              </div>
            </button>
            
            <button className="p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl">
              <Link to="/kyc" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">KYC</span>
              </Link>
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Available Jobs */}
            <div className="lg:col-span-2 space-y-8">
              <div className="card-surface p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <NeumorphicIcon icon={Briefcase} size={48} variant="behance" />
                    <h2 className="text-2xl font-display font-bold">Доступные заказы</h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {nearbyJobs.length} заказов поблизости
                  </div>
                </div>

                <div className="space-y-4">
                  {nearbyJobs.length === 0 && (
                    <div className="text-center py-12">
                      <NeumorphicIcon icon={Briefcase} size={64} variant="behance" className="mb-4 mx-auto" />
                      <h3 className="text-lg font-semibold mb-2">Нет доступных заказов</h3>
                      <p className="text-muted-foreground mb-6">Проверьте позже или расширьте радиус поиска</p>
                      <Link to="/profile/settings" className="btn-hero px-8 py-4 rounded-xl font-semibold text-lg">
                        Настроить профиль
                      </Link>
                    </div>
                  )}

                  {nearbyJobs.slice(0, 5).map((job, index) => (
                    <div key={job.id} className="card-surface p-6">
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
                        <Link 
                          to={`/job/${job.id}`}
                          className="btn-ghost px-6 py-3 rounded-xl font-semibold"
                        >
                          Подробнее
                        </Link>
                        <button className="btn-hero px-6 py-3 rounded-xl font-semibold">
                          Принять заказ
                        </button>
                        <button className="btn-ghost px-3 py-3 rounded-xl">
                          <NeumorphicIcon icon={Video} size={20} variant="behance" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Active Jobs */}
              <div className="card-surface p-8">
                <div className="flex items-center gap-3 mb-6">
                  <NeumorphicIcon icon={Clock} size={48} variant="behance" />
                  <h2 className="text-2xl font-display font-bold">Мои активные заказы</h2>
                </div>

                <div className="space-y-4">
                  {myActiveJobs.length === 0 && (
                    <div className="text-center py-12">
                      <NeumorphicIcon icon={Clock} size={64} variant="behance" className="mb-4 mx-auto" />
                      <p className="text-muted-foreground">У вас нет активных заказов</p>
                    </div>
                  )}

                  {myActiveJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="card-surface p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{job.description || 'Заказ'}</h3>
                          <div className="text-sm text-muted-foreground mb-2">
                            Статус: {job.status === 'accepted' ? 'Принят' : job.status === 'in_progress' ? 'В работе' : 'Выполнен'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {job.budget_min_cents && job.budget_max_cents
                              ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                              : 'Договорная'
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link 
                          to={`/job/${job.id}`}
                          className="btn-hero px-6 py-3 rounded-xl font-semibold"
                        >
                          Управлять
                        </Link>
                        <Link 
                          to={`/messages?user=${job.client_id}&job=${job.id}`}
                          className="btn-ghost px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
                        >
                          <NeumorphicIcon icon={MessageSquare} size={20} variant="behance" />
                          Чат
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* KYC Status Section */}
              <div className="flex items-center gap-4 justify-center">
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] transition-all duration-300">
                  <div className="w-8 h-8 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                    {kycStatus === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : kycStatus === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Статус: {kycStatus === 'approved' ? 'Проверенный специалист' : 
                             kycStatus === 'rejected' ? 'Документы отклонены' : 
                             'Ожидает проверки'}
                  </span>
                </div>
                
                <button 
                  onClick={() => userId && loadKycStatus(userId)}
                  className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] hover:shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-primary"
                  title="Обновить статус KYC"
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
              </div>
              
              {/* Tenders */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <NeumorphicIcon icon={TrendingUp} size={48} variant="behance" />
                  <h3 className="font-bold">Открытые тендеры</h3>
                </div>
                
                {tenders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет открытых тендеров
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tenders.slice(0, 3).map((tender) => (
                      <div key={tender.id} className="card-surface p-4">
                        <h4 className="font-medium text-sm mb-1">{tender.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          До {new Date(tender.deadline).toLocaleDateString()}
                        </p>
                        <button className="btn-hero px-4 py-2 rounded-lg text-sm font-semibold w-full">
                          Подать заявку
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <NeumorphicIcon icon={BarChart3} size={48} variant="behance" />
                  <h3 className="font-bold">Активность</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Откликов сегодня</span>
                      <span className="font-semibold">0</span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Просмотров профиля</span>
                      <span className="font-semibold">12</span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Новых сообщений</span>
                      <span className="font-semibold">3</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <NeumorphicIcon icon={Zap} size={48} variant="behance" />
                  <h3 className="font-bold">Советы</h3>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="font-medium mb-1">Быстрые отклики</p>
                    <p className="text-muted-foreground">Отвечайте на заказы в течение 30 минут для повышения рейтинга</p>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="font-medium mb-1">Качественные фото</p>
                    <p className="text-muted-foreground">Добавьте фото работ в портфолио для привлечения клиентов</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    </RoleGuard>
  );
};

export default DashboardPro;