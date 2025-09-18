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
import { MobileContainer } from "@/components/mobile/MobileContainer";
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
          
        if (error) {
          console.error('Error creating pro role:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error ensuring pro role:', error);
      throw error;
    }
  };

  const loadNearbyJobs = async (uid: string) => {
    try {
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      console.log('DashboardPro: Loaded nearby jobs:', jobs?.length || 0);
      setNearbyJobs(jobs || []);
    } catch (error) {
      console.error('Error loading nearby jobs:', error);
      throw error;
    }
  };

  const loadActiveJobs = async (uid: string) => {
    try {
      const { data: jobs, error } = await supabase
        .from("job_applications")
        .select(`
          id,
          job_id,
          status,
          created_at,
          jobs!inner (
            id,
            description,
            budget_min_cents,
            budget_max_cents,
            scheduled_at,
            status
          )
        `)
        .eq("pro_id", uid)
        .in("status", ["accepted", "selected"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const jobsData = jobs?.map(app => ({
        id: app.jobs.id,
        description: app.jobs.description,
        budget_min_cents: app.jobs.budget_min_cents,
        budget_max_cents: app.jobs.budget_max_cents,
        scheduled_at: app.jobs.scheduled_at,
        status: app.jobs.status
      })) || [];
      
      console.log('DashboardPro: Loaded active jobs:', jobsData.length);
      setMyActiveJobs(jobsData);
    } catch (error) {
      console.error('Error loading active jobs:', error);
      throw error;
    }
  };

  const loadWalletBalance = async (uid: string) => {
    try {
      const { data: wallet, error } = await supabase
        .from("user_wallets")
        .select("balance_cents")
        .eq("user_id", uid)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      console.log('DashboardPro: Loaded wallet balance:', wallet?.balance_cents || 0);
      setWalletBalance(wallet?.balance_cents || 0);
    } catch (error) {
      console.error('Error loading wallet balance:', error);
      throw error;
    }
  };

  const loadRatings = async (uid: string) => {
    try {
      const { data: ratings, error } = await supabase
        .from("job_ratings")
        .select("rating")
        .eq("pro_id", uid);

      if (error) throw error;
      
      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        setRatingAvg(avg);
        setRatingCount(ratings.length);
        console.log('DashboardPro: Loaded ratings:', avg, ratings.length);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      throw error;
    }
  };

  const loadKycStatus = async (uid: string) => {
    try {
      const { data: kyc, error } = await supabase
        .from("pro_kyc_documents")
        .select("status")
        .eq("user_id", uid)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      console.log('DashboardPro: Loaded KYC status:', kyc?.status || 'pending');
      setKycStatus(kyc?.status || 'pending');
    } catch (error) {
      console.error('Error loading KYC status:', error);
      throw error;
    }
  };

  const loadTenders = async (uid: string) => {
    try {
      const { data: tenders, error } = await supabase
        .from("tenders")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      console.log('DashboardPro: Loaded tenders:', tenders?.length || 0);
      setTenders(tenders || []);
    } catch (error) {
      console.error('Error loading tenders:', error);
      throw error;
    }
  };

  // Loading State
  if (loading || currencyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          className="text-center"
          animate={{ 
            opacity: [0.5, 1, 0.5],
            scale: [0.95, 1.05, 0.95]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            <UserCog className="h-8 w-8 text-white" />
          </div>
          <p className="text-lg font-medium text-foreground">Загрузка кабинета...</p>
          <p className="text-sm text-muted-foreground mt-2">Подготавливаем ваши данные</p>
        </motion.div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRole="pro">
      <MobileContainer withBottomNav={true} className="bg-background">
        <motion.div 
          className="min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Seo 
            title="Кабинет специалиста" 
            description="Управляйте заказами, портфолио и доходами в профессиональном кабинете ServiceHub"
          />

          {/* Mobile Header */}
          <div className="md:hidden bg-white border-b sticky top-0 z-50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Кабинет специалиста</h1>
                  <p className="text-sm text-muted-foreground">Управление заказами</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link 
                  to="/messages" 
                  className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center"
                >
                  <MessageSquare className="h-5 w-5 text-foreground" />
                </Link>
                <Link 
                  to="/profile/settings" 
                  className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center"
                >
                  <Settings className="h-5 w-5 text-foreground" />
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Stats Cards - Compact Version */}
          <div className="md:hidden p-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center">
                    <Wallet className="h-3 w-3 text-green-600" />
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatPrice(walletBalance)}</div>
                <div className="text-xs text-muted-foreground">Баланс</div>
              </div>

              <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Star className="h-3 w-3 text-yellow-600" />
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {ratingAvg ? ratingAvg.toFixed(1) : '--'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ratingCount} отзывов
                </div>
              </div>

              <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                </div>
                <div className="text-sm font-semibold">{responseTime}</div>
                <div className="text-xs text-muted-foreground">Отклик</div>
              </div>

              <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-1 mb-1">
                  {kycStatus === 'approved' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  KYC: {kycStatus === 'approved' ? 'Верифицирован' : 'Требует проверки'}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <section className="hidden md:block container mx-auto py-8 sm:py-16 px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-16">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 sm:mb-6 text-gradient">
                Кабинет специалиста
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Управляйте заказами, развивайте портфолио и отслеживайте доходы в едином центре
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 mt-8 sm:mt-12 max-w-4xl mx-auto">
                <button className="p-3 sm:p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl touch-manipulation">
                  <Link to="/profile/settings" className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <UserCog className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Профиль</span>
                  </Link>
                </button>
                
                <button className="p-3 sm:p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl touch-manipulation">
                  <Link to="/pro/schedule" className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Расписание</span>
                  </Link>
                </button>
                
                <button className="p-3 sm:p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl touch-manipulation">
                  <Link to="/portfolio" className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Портфолио</span>
                  </Link>
                </button>
                
                <button className="p-3 sm:p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl touch-manipulation">
                  <Link to="/tenders" className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Тендеры</span>
                  </Link>
                </button>
                
                <button className="p-3 sm:p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl touch-manipulation">
                  <div className="flex flex-col items-center gap-1 sm:gap-2 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Выплата</span>
                  </div>
                </button>
                
                <button className="p-3 sm:p-4 text-center transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl touch-manipulation">
                  <Link to="/kyc" className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">KYC</span>
                  </Link>
                </button>
              </div>
            </div>
          </section>

          {/* Mobile Content - Streamlined */}
          <div className="md:hidden space-y-4 p-4">
            {/* Available Jobs */}
            <div className="bg-card rounded-xl shadow-sm border min-h-[120px]">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Briefcase className="h-3 w-3 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold">Доступные заказы</h2>
                </div>
                <span className="text-xs text-muted-foreground">{nearbyJobs.length}</span>
              </div>
              <div className="p-2 min-h-[72px] flex flex-col justify-center">
                {nearbyJobs.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">Нет новых заказов</p>
                    <Link to="/feed" className="text-xs text-primary font-medium mt-1 inline-block">
                      Посмотреть все
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {nearbyJobs.slice(0, 2).map((job) => (
                      <motion.div 
                        key={job.id} 
                        className="p-2 rounded-lg hover:bg-secondary/30 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium line-clamp-1">{job.description}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-green-600 font-medium">
                                {formatPrice(job.budget_min_cents)}-{formatPrice(job.budget_max_cents)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString() : 'Сегодня'}
                              </span>
                            </div>
                          </div>
                          <button className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0">
                            Взять
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {nearbyJobs.length > 2 && (
                      <div className="pt-2 text-center border-t">
                        <Link to="/feed" className="text-xs text-primary font-medium">
                          Еще {nearbyJobs.length - 2} заказов
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* My Active Jobs */}
            <div className="bg-card rounded-xl shadow-sm border min-h-[120px]">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-green-600" />
                  </div>
                  <h2 className="text-sm font-semibold">В работе</h2>
                </div>
                <span className="text-xs text-muted-foreground">{myActiveJobs.length}</span>
              </div>
              <div className="p-2 min-h-[72px] flex flex-col justify-center">
                {myActiveJobs.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">Нет активных заказов</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {myActiveJobs.slice(0, 2).map((job) => (
                      <motion.div 
                        key={job.id} 
                        className="p-2 rounded-lg hover:bg-secondary/30 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium line-clamp-1">{job.description}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                job.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {job.status === 'accepted' ? 'Принят' :
                                 job.status === 'in_progress' ? 'В работе' : 'Выполнен'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString() : 'Сегодня'}
                              </span>
                            </div>
                          </div>
                          <Link 
                            to={`/job/${job.id}`}
                            className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0"
                          >
                            Открыть
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                    {myActiveJobs.length > 2 && (
                      <div className="pt-2 text-center border-t">
                        <span className="text-xs text-primary font-medium">
                          Еще {myActiveJobs.length - 2} заказов
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BarChart3 className="h-3 w-3 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold">Статистика</h3>
                </div>
                <div className="text-xs text-muted-foreground">
                  Заработок: <span className="font-medium text-foreground">{formatPrice(monthlyEarnings)}</span>
                </div>
              </div>

              <div className="bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold">Тендеры</h3>
                </div>
                <div className="text-xs text-muted-foreground">
                  Активных: <span className="font-medium text-foreground">{tenders.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Content */}
          <main className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 pb-16">
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-8">
                <FloatingCard className="p-4 sm:p-8">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <NeumorphicIcon icon={Briefcase} size={48} />
                      <h2 className="text-lg sm:text-2xl font-display font-bold">Доступные заказы</h2>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {nearbyJobs.length} заказов
                    </div>
                  </div>

                  <div className="space-y-4">
                    {nearbyJobs.length === 0 && (
                      <div className="text-center py-8 sm:py-12">
                        <Briefcase className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Новых заказов пока нет</p>
                        <Link to="/feed" className="text-primary hover:underline text-sm">
                          Посмотреть все заказы
                        </Link>
                      </div>
                    )}
                    {nearbyJobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="p-4 sm:p-6 bg-white/80 rounded-lg border hover:shadow-lg transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 mr-4">
                            <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-2">{job.description}</h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {formatPrice(job.budget_min_cents)}-{formatPrice(job.budget_max_cents)}
                              </span>
                              {job.scheduled_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(job.scheduled_at).toLocaleDateString()}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                Поблизости
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => navigate(`/job/${job.id}`)}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                              Откликнуться
                            </button>
                            <Link 
                              to={`/job/${job.id}`}
                              className="text-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                            >
                              Подробнее
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                    {nearbyJobs.length > 3 && (
                      <div className="text-center pt-4">
                        <Link 
                          to="/feed" 
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                          Показать все {nearbyJobs.length} заказов
                        </Link>
                      </div>
                    )}
                  </div>
                </FloatingCard>

                {/* My Active Jobs */}
                <FloatingCard className="p-4 sm:p-8">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <NeumorphicIcon icon={Clock} size={48} />
                      <h2 className="text-lg sm:text-2xl font-display font-bold">Мои заказы</h2>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {myActiveJobs.length} активных
                    </div>
                  </div>

                  <div className="space-y-4">
                    {myActiveJobs.length === 0 && (
                      <div className="text-center py-8 sm:py-12">
                        <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">У вас нет активных заказов</p>
                      </div>
                    )}
                    {myActiveJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="p-4 sm:p-6 bg-white/60 rounded-lg border">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 mr-4">
                            <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-2">{job.description}</h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                job.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {job.status === 'accepted' ? 'Принят' :
                                 job.status === 'in_progress' ? 'В работе' : 'Выполнен'}
                              </span>
                              {job.scheduled_at && (
                                <span>{new Date(job.scheduled_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <Link 
                            to={`/job/${job.id}`}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                          >
                            Открыть
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </FloatingCard>
              </div>

              {/* Sidebar */}
              <div className="space-y-4 sm:space-y-8">
                {/* Stats Cards */}
                <div className="space-y-4">
                  <FloatingCard className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <NeumorphicIcon icon={Wallet} size={32} />
                        <h3 className="text-lg font-semibold">Баланс</h3>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                      {formatPrice(walletBalance)}
                    </div>
                    <p className="text-sm text-muted-foreground">Доступно для вывода</p>
                  </FloatingCard>

                  <FloatingCard className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <NeumorphicIcon icon={Star} size={32} />
                        <h3 className="text-lg font-semibold">Рейтинг</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl sm:text-3xl font-bold text-primary">
                        {ratingAvg ? ratingAvg.toFixed(1) : '--'}
                      </div>
                      {ratingAvg && <StarRating rating={ratingAvg} readonly size="sm" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      На основе {ratingCount} отзывов
                    </p>
                  </FloatingCard>

                  <FloatingCard className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <NeumorphicIcon icon={TrendingUp} size={32} variant="behance" />
                        <h3 className="text-lg font-semibold">Статистика</h3>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Заработок за месяц:</span>
                        <span className="font-medium">{formatPrice(monthlyEarnings)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Выполнено заказов:</span>
                        <span className="font-medium">{completedJobs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Время отклика:</span>
                        <span className="font-medium">{responseTime}</span>
                      </div>
                    </div>
                  </FloatingCard>
                </div>

                {/* Open Tenders */}
                <FloatingCard className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <NeumorphicIcon icon={Zap} size={32} />
                      <h3 className="text-lg font-semibold">Открытые тендеры</h3>
                    </div>
                    <span className="text-sm text-muted-foreground">{tenders.length}</span>
                  </div>
                  
                  {tenders.length === 0 ? (
                    <div className="text-center py-6">
                      <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Нет открытых тендеров</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tenders.slice(0, 3).map((tender) => (
                        <div key={tender.id} className="p-3 bg-white/60 rounded-lg">
                          <h4 className="font-medium text-sm mb-1 line-clamp-2">{tender.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            До {new Date(tender.deadline_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                      <Link 
                        to="/tenders" 
                        className="block text-center text-sm text-primary font-medium hover:underline"
                      >
                        Смотреть все тендеры
                      </Link>
                    </div>
                  )}
                </FloatingCard>

                {/* Tips Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold mb-4">Советы и рекомендации</h3>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="font-medium mb-1">Быстрый отклик</p>
                    <p className="text-muted-foreground">Отвечайте на заказы в течение 15 минут для повышения рейтинга</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="font-medium mb-1">Качественные фото</p>
                    <p className="text-muted-foreground">Добавьте фото работ в портфолио для привлечения клиентов</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </motion.div>
      </MobileContainer>
    </RoleGuard>
  );
};

export default DashboardPro;