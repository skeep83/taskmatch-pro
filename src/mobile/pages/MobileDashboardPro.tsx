import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User, Briefcase, Calendar, Settings, Clock, DollarSign,
  Star, MapPin, Plus, ChevronRight, Eye, Zap, MessageCircle,
  Building2, CheckCircle, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { useMobile } from '../providers/MobileProvider';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { RoleGuard } from '@/components/RoleGuard';
import { ProUpgradeStatusCard } from '@/components/ProUpgradeStatusCard';
import { Seo } from '@/components/Seo';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { loadProNearbyJobs, type ProNearbyJob } from '@/utils/proNearbyJobs';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { NeumorphicIcon } from '@/components/ui/neumorphic-icon';

export default function MobileDashboardPro() {
  type AuthUser = { id: string; email?: string | null };
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [proProfile, setProProfile] = useState<Database['public']['Tables']['pro_profiles']['Row'] | null>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    activeJobs: 0,
    walletBalance: 0,
    averageRating: 0,
    responseTime: '—'
  });
  const [nearbyJobs, setNearbyJobs] = useState<ProNearbyJob[]>([]);
  const [hasProLocation, setHasProLocation] = useState(false);
  const [hasPendingProRequest, setHasPendingProRequest] = useState<boolean>(false);

  // Load user data and stats
  useEffect(() => {
    const loadProData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUser(user);

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }

        // Get pro profile
        const { data: proData } = await supabase
          .from('pro_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (proData) {
          setProProfile(proData);
        }

        await refreshMobileProData(user.id);
      } catch (error) {
        console.error('Error loading pro data:', error);
      }
    };

    loadProData();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => {
      void refreshMobileProData(user.id);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const jobsChannel = supabase
      .channel(`mobile-pro-jobs-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
      }, (payload) => {
        const oldJob = payload.old as { pro_id?: string | null } | null;
        const newJob = payload.new as { pro_id?: string | null } | null;
        if (oldJob?.pro_id === user.id || newJob?.pro_id === user.id) {
          refresh();
        }
      })
      .subscribe();

    const nearbyJobsChannel = supabase
      .channel(`mobile-pro-nearby-jobs-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
      }, refresh)
      .subscribe();

    const ratingsChannel = supabase
      .channel(`mobile-pro-ratings-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ratings',
        filter: `to_user_id=eq.${user.id}`,
      }, refresh)
      .subscribe();

    const walletsChannel = supabase
      .channel(`mobile-pro-wallets-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `pro_id=eq.${user.id}`,
      }, refresh)
      .subscribe();

    const requestsChannel = supabase
      .channel(`mobile-pro-upgrade-requests-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pro_upgrade_requests',
        filter: `user_id=eq.${user.id}`,
      }, refresh)
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabase.removeChannel(jobsChannel);
      void supabase.removeChannel(nearbyJobsChannel);
      void supabase.removeChannel(ratingsChannel);
      void supabase.removeChannel(walletsChannel);
      void supabase.removeChannel(requestsChannel);
    };
  }, [user?.id]);

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
      console.error('Error checking pro upgrade status:', error);
    }
  };

  const refreshMobileProData = async (uid: string) => {
    try {
      const [nearbyResult] = await Promise.all([
        loadProNearbyJobs(uid),
        loadDashboardStats(uid),
        checkProUpgradeStatus(uid),
      ]);

      setNearbyJobs(nearbyResult.jobs);
      setHasProLocation(nearbyResult.hasProLocation);
    } catch (error) {
      console.error('Error refreshing mobile pro data:', error);
    }
  };

  const loadDashboardStats = async (uid: string) => {
    try {
      const [{ data: jobs }, { data: ratings }, { data: wallet }] = await Promise.all([
        supabase
          .from('jobs')
          .select('status')
          .eq('pro_id', uid)
          .in('status', ['accepted', 'in_progress', 'done']),
        supabase
          .from('ratings')
          .select('score')
          .eq('to_user_id', uid)
          .limit(200),
        supabase
          .from('wallets')
          .select('balance_cents')
          .eq('pro_id', uid)
          .maybeSingle(),
      ]);

      const proJobs = jobs || [];
      const completedJobs = proJobs.filter((job) => job.status === 'done').length;
      const activeJobs = proJobs.filter((job) => job.status === 'accepted' || job.status === 'in_progress').length;
      const scores = (ratings || []).map((rating) => rating.score);
      const averageRating = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

      setStats({
        totalJobs: proJobs.length,
        completedJobs,
        activeJobs,
        walletBalance: wallet?.balance_cents || 0,
        averageRating,
        responseTime: '—'
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const getDashboardOptions = () => {
    return [
      {
        value: 'client',
        label: 'Клиент',
        icon: User,
        description: 'Заказы и услуги',
        available: true
      },
      {
        value: 'pro',
        label: 'Специалист',
        icon: Briefcase,
        description: 'Мои услуги и заказы',
        available: true
      },
      {
        value: 'business',
        label: 'Бизнес',
        icon: Building2,
        description: 'Компания и тендеры',
        available: true
      }
    ];
  };

  const handleDashboardSwitch = (dashboardType: string) => {
    if (dashboardType !== 'pro') {
      navigate(`/dashboard/${dashboardType}`);
    }
  };

  const tabItems = [
    { id: "overview", label: "Обзор", icon: User },
    { id: "jobs", label: "Заказы", icon: Briefcase },
    { id: "portfolio", label: "Портфолио", icon: Star },
    { id: "schedule", label: "График", icon: Calendar },
    { id: "earnings", label: "Доходы", icon: DollarSign }
  ];

  return (
    <RoleGuard requiredRole="pro">
      <Seo title={`${t('app.name')} — Кабинет специалиста`} description="Управляйте откликами, заказами и доходами" canonical="/dashboard/pro" />

      <div className="min-h-screen bg-neo">
        <MobileHeader
          title="Кабинет специалиста"
          showBack={false}
          showLogout={true}
          showNotifications={true}
          showDashboardSelector={true}
          dashboardOptions={getDashboardOptions()}
          currentDashboard="pro"
          onDashboardChange={handleDashboardSwitch}
        />

        <div
          className="pt-20 pb-24 px-4 space-y-6"
          style={{ paddingTop: `${80 + safeAreaInsets.top}px` }}
        >
          {/* Welcome Section */}
          <MobileCard className="text-center">
            <h1 className="text-2xl font-bold mb-2">
              Добро пожаловать!
            </h1>
            <p className="text-muted-foreground">
              {userProfile?.full_name ||
               (userProfile?.first_name && userProfile?.last_name
                 ? `${userProfile.first_name} ${userProfile.last_name}`
                 : user?.email)}
            </p>
          </MobileCard>

          {/* Pro Upgrade Status - показываем только если есть pending заявка */}
          {hasPendingProRequest && (
            <ProUpgradeStatusCard userId={user?.id || ''} />
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Всего заказов</p>
                  <p className="text-2xl font-bold">{stats.totalJobs}</p>
                </div>
                <NeumorphicIcon icon={Briefcase} size={48} variant="behance" />
              </div>
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Активных</p>
                  <p className="text-2xl font-bold">{stats.activeJobs}</p>
                </div>
                <NeumorphicIcon icon={Clock} size={48} variant="behance" />
              </div>
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Выполнено</p>
                  <p className="text-2xl font-bold">{stats.completedJobs}</p>
                </div>
                <NeumorphicIcon icon={CheckCircle} size={48} variant="behance" />
              </div>
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">На балансе</p>
                  <p className="text-lg font-bold">{formatPrice(stats.walletBalance)}</p>
                </div>
                <NeumorphicIcon icon={DollarSign} size={48} variant="behance" />
              </div>
            </MobileCard>
          </div>

          {/* Horizontal Tab Navigation */}
          <div className="overflow-x-auto mb-6">
            <div className="flex space-x-2 p-3 bg-neo neo-inset-8 rounded-2xl min-w-max">
              {tabItems.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-300 font-medium ${
                    activeTab === tab.id
                      ? 'bg-neo neo-inset-4 text-primary'
                      : 'bg-neo neo-8 text-gray-600 hover:neo-4'
                  }`}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <MobileCard
                  pressable
                  onPress={() => navigate("/pro/schedule")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">График</h3>
                </MobileCard>

                <MobileCard
                  pressable
                  onPress={() => navigate("/portfolio")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Портфолио</h3>
                </MobileCard>

                <MobileCard
                  pressable
                  onPress={() => navigate("/messages")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Сообщения</h3>
                </MobileCard>

                <MobileCard
                  pressable
                  onPress={() => navigate("/mobile/profile-settings")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Настройки</h3>
                </MobileCard>
              </div>

              {/* Performance Stats */}
              <MobileCard>
                <h2 className="text-xl font-semibold mb-4">Производительность</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Рейтинг</span>
                    <div className="flex items-center gap-2">
                      <StarRating rating={stats.averageRating} readonly size="sm" />
                      <span className="font-semibold">{stats.averageRating}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Время ответа</span>
                    <span className="font-semibold">{stats.responseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>На балансе</span>
                    <span className="font-semibold">{formatPrice(stats.walletBalance)}</span>
                  </div>
                </div>
              </MobileCard>

              {/* Nearby Jobs */}
              <MobileCard>
                <h2 className="text-xl font-semibold mb-4">Заказы рядом</h2>
                {nearbyJobs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">
                      {hasProLocation
                        ? 'Пока нет подходящих заказов рядом'
                        : 'Добавьте свою точку в профиле, чтобы видеть расстояние до заказов'}
                    </p>
                    <Button
                      onClick={() => navigate("/mobile/profile-settings")}
                      className="bg-neo neo-8 hover:neo-4 text-gray-700"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Настроить точку
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nearbyJobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="p-3 border rounded-lg bg-white/50">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <h4 className="font-medium text-sm">{job.title || job.description || "Новый заказ"}</h4>
                          <Badge variant={job.withinCoverage ? 'default' : 'outline'} className={job.withinCoverage ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                            {job.distanceKm !== null ? `${job.distanceKm.toFixed(1)} км` : 'без дистанции'}
                          </Badge>
                        </div>
                        {job.location_address && (
                          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{job.location_address}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mb-2">
                          {job.budget_min_cents && job.budget_max_cents
                            ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                            : job.budget_min_cents
                            ? `от ${formatPrice(job.budget_min_cents)}`
                            : job.budget_max_cents
                            ? `до ${formatPrice(job.budget_max_cents)}`
                            : 'Договорная'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/job/${job.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Просмотр
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </MobileCard>
            </div>
          )}

          {activeTab === "jobs" && (
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4">Заказы для отклика</h3>
              {nearbyJobs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{hasProLocation ? 'Пока нет подходящих заказов рядом' : 'Настройте точку специалиста в профиле'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nearbyJobs.map((job) => (
                    <div key={job.id} className="p-3 border rounded-lg bg-white/50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{job.title || job.description || 'Новый заказ'}</h4>
                          {job.location_address && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{job.location_address}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant={job.withinCoverage ? 'default' : 'outline'} className={job.withinCoverage ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                          {job.distanceKm !== null ? `${job.distanceKm.toFixed(1)} км` : 'без дистанции'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {job.budget_min_cents && job.budget_max_cents
                          ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                          : job.budget_min_cents
                          ? `от ${formatPrice(job.budget_min_cents)}`
                          : job.budget_max_cents
                          ? `до ${formatPrice(job.budget_max_cents)}`
                          : 'Договорная'}
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/job/${job.id}`)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Открыть заказ
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </MobileCard>
          )}

          {activeTab === "portfolio" && (
            <MobileCard className="text-center py-8">
              <Star className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Портфолио</h3>
              <p className="text-muted-foreground">Здесь будут ваши работы и отзывы</p>
            </MobileCard>
          )}

          {activeTab === "schedule" && (
            <MobileCard className="text-center py-8">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">График работы</h3>
              <p className="text-muted-foreground">Настройте свой график работы</p>
            </MobileCard>
          )}

          {activeTab === "earnings" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Доходы</h2>

              <MobileCard>
                <h4 className="font-semibold mb-3">Статистика доходов</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Доступно к выводу:</span>
                    <span className="font-semibold">{formatPrice(stats.walletBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Живой monthly breakdown:</span>
                    <span className="font-semibold text-muted-foreground">ещё не подключён</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Средний заказ:</span>
                    <span className="font-semibold text-muted-foreground">ещё не подключён</span>
                  </div>
                </div>
              </MobileCard>
            </div>
          )}

        </div>
      </div>
    </RoleGuard>
  );
}