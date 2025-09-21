import React, { useState, useEffect } from 'react';
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
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { NeumorphicIcon } from '@/components/ui/neumorphic-icon';

export default function MobileDashboardPro() {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [proProfile, setProProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalJobs: 15,
    completedJobs: 12,
    activeJobs: 3,
    totalEarned: 45000,
    averageRating: 4.8,
    responseTime: '< 1 час'
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
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

        // Check pro upgrade status
        await checkProUpgradeStatus(user.id);

        // TODO: Load real stats and jobs data
        // For now using mock data
      } catch (error) {
        console.error('Error loading pro data:', error);
      }
    };

    loadProData();
  }, []);

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
      <Seo title={`${t('app.name')} — Кабинет специалиста`} description="Управляйте заказами и доходами" canonical="/dashboard/pro" />
      
      <div className="min-h-screen bg-[#E5E7EB]">
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
                  <p className="text-sm text-muted-foreground">Заработано</p>
                  <p className="text-lg font-bold">{formatPrice(stats.totalEarned)}</p>
                </div>
                <NeumorphicIcon icon={DollarSign} size={48} variant="behance" />
              </div>
            </MobileCard>
          </div>

          {/* Horizontal Tab Navigation */}
          <div className="overflow-x-auto">
            <div className="flex space-x-2 p-2 min-w-max">
              {tabItems.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-black'
                      : 'bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] text-gray-600'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
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
                  <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">График</h3>
                </MobileCard>

                <MobileCard 
                  pressable 
                  onPress={() => navigate("/portfolio")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center mb-2">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Портфолио</h3>
                </MobileCard>

                <MobileCard 
                  pressable 
                  onPress={() => navigate("/messages")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center mb-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Сообщения</h3>
                </MobileCard>

                <MobileCard 
                  pressable 
                  onPress={() => navigate("/mobile/profile-settings")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center mb-2">
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
                    <span>Заработано</span>
                    <span className="font-semibold">{formatPrice(stats.totalEarned)}</span>
                  </div>
                </div>
              </MobileCard>

              {/* Recent Jobs */}
              <MobileCard>
                <h2 className="text-xl font-semibold mb-4">Недавние заказы</h2>
                {recentJobs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">У вас пока нет заказов</p>
                    <Button 
                      onClick={() => navigate("/feed")}
                      className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] text-gray-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Найти заказы
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentJobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="p-3 border rounded-lg bg-white/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{job.title || "Без названия"}</h4>
                          <Badge variant="outline">{job.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {job.category} • {formatPrice(job.budget)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
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
            <MobileCard className="text-center py-8">
              <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Управление заказами</h3>
              <p className="text-muted-foreground">Здесь будут отображаться ваши заказы</p>
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
                    <span>Всего заработано:</span>
                    <span className="font-semibold">{formatPrice(stats.totalEarned)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>За этот месяц:</span>
                    <span className="font-semibold">12 500 ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Средний заказ:</span>
                    <span className="font-semibold">3 000 ₽</span>
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