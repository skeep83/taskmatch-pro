import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Briefcase, Calendar, Settings, Clock, DollarSign, 
  Star, MapPin, Plus, ChevronRight, Badge, Eye, Zap 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { useMobile } from '../providers/MobileProvider';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { RoleGuard } from '@/components/RoleGuard';
import { Seo } from '@/components/Seo';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

export default function MobileDashboardPro() {
  const { t } = useEnhancedI18n();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [proProfile, setProProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    activeJobs: 0,
    totalEarned: 0,
    averageRating: 0,
    responseTime: '< 1 час'
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  // Load user data and stats - same logic as desktop
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
        
        setUserProfile(profile);

        // Get pro profile
        const { data: proData } = await supabase
          .from('pro_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setProProfile(proData);

        // Get jobs stats for pro
        const { data: jobs } = await supabase
          .from('jobs')
          .select('status, price_cents, created_at')
          .or(`assigned_pro_id.eq.${user.id},job_applications.pro_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (jobs) {
          const stats = {
            totalJobs: jobs.length,
            completedJobs: jobs.filter(j => j.status === 'completed').length,
            activeJobs: jobs.filter(j => ['pending', 'in_progress'].includes(j.status)).length,
            totalEarned: jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (j.price_cents || 0), 0),
            averageRating: 4.8, // TODO: Calculate from reviews
            responseTime: '< 1 час'
          };
          setStats(stats);
        }

        // Get recent jobs
        const { data: recentJobsData } = await supabase
          .from('jobs')
          .select(`
            *,
            categories(name_ru),
            profiles!jobs_client_id_fkey(first_name, last_name)
          `)
          .or(`assigned_pro_id.eq.${user.id},job_applications.pro_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentJobs(recentJobsData || []);
      } catch (error) {
        console.error('Error loading pro data:', error);
      }
    };

    loadProData();
  }, []);

  return (
    <RoleGuard requiredRole="pro">
      <Seo title={`${t('app.name')} — Кабинет специалиста`} description="Управляйте заказами и доходами" canonical="/dashboard/pro" />
      
      <div className="min-h-screen bg-[#E5E7EB]">
        <MobileHeader 
          title="Кабинет специалиста"
          showBack={false}
          showNotifications={true}
          showDashboardSelector={true}
          dashboardOptions={[
            { value: 'client', label: 'Клиент', icon: User, description: 'Заказы и услуги', available: true },
            { value: 'pro', label: 'Специалист', icon: Briefcase, description: 'Мои услуги и заказы', available: true },
            { value: 'business', label: 'Бизнес', icon: User, description: 'Компания и тендеры', available: true }
          ]}
          currentDashboard="pro"
          onDashboardChange={(dashboard) => {
            if (dashboard === 'client') window.location.href = '/dashboard/client';
            if (dashboard === 'business') window.location.href = '/dashboard/business';
          }}
        />

        <div 
          className="px-4 pt-4"
          style={{ 
            paddingTop: 80 + safeAreaInsets.top + 16,
            paddingBottom: bottomNavHeight + safeAreaInsets.bottom + 16 
          }}
        >
          {/* Mobile Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Horizontal scrollable tabs */}
            <div className="overflow-x-auto">
              <TabsList className="flex w-max space-x-2 bg-transparent p-1">
                <TabsTrigger 
                  value="overview" 
                  className="flex items-center gap-2 rounded-xl bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 whitespace-nowrap"
                >
                  <User size={16} />
                  <span className="text-sm">Обзор</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="jobs" 
                  className="flex items-center gap-2 rounded-xl bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 whitespace-nowrap"
                >
                  <Briefcase size={16} />
                  <span className="text-sm">Заказы</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="earnings" 
                  className="flex items-center gap-2 rounded-xl bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 whitespace-nowrap"
                >
                  <DollarSign size={16} />
                  <span className="text-sm">Доходы</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="profile" 
                  className="flex items-center gap-2 rounded-xl bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 whitespace-nowrap"
                >
                  <Settings size={16} />
                  <span className="text-sm">Профиль</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Pro Stats - Mobile Grid (2x3) */}
              <div className="grid grid-cols-2 gap-4">
                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Briefcase size={20} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Всего заказов</p>
                      <p className="text-xl font-bold">{stats.totalJobs}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Badge size={20} className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Завершено</p>
                      <p className="text-xl font-bold">{stats.completedJobs}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Clock size={20} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Активных</p>
                      <p className="text-xl font-bold">{stats.activeJobs}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <DollarSign size={20} className="text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Заработано</p>
                      <p className="text-lg font-bold">{formatPrice(stats.totalEarned)}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Star size={20} className="text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Рейтинг</p>
                      <p className="text-xl font-bold">{stats.averageRating}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <Zap size={20} className="text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ответ</p>
                      <p className="text-sm font-bold">{stats.responseTime}</p>
                    </div>
                  </div>
                </MobileCard>
              </div>

              {/* Quick Actions */}
              <MobileCard className="p-4">
                <h3 className="font-semibold mb-4">Быстрые действия</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <Eye size={20} />
                    <span className="text-xs">Поиск заказов</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <Calendar size={20} />
                    <span className="text-xs">Мой график</span>
                  </Button>
                </div>
              </MobileCard>

              {/* Recent Jobs */}
              <MobileCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Недавние заказы</h3>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  {recentJobs.slice(0, 3).map((job) => (
                    <motion.div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.categories?.name_ru}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <BadgeComponent variant={
                            job.status === 'completed' ? 'default' : 
                            job.status === 'in_progress' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {job.status}
                          </BadgeComponent>
                          {job.price_cents && (
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(job.price_cents)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              </MobileCard>
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs" className="space-y-6">
              <MobileCard className="p-4">
                <div className="text-center py-8">
                  <Briefcase size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Мои заказы</h3>
                  <p className="text-sm text-muted-foreground mb-4">Управляйте активными и завершенными заказами</p>
                  <Button>
                    <Eye size={16} className="mr-2" />
                    Найти заказы
                  </Button>
                </div>
              </MobileCard>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-6">
              <MobileCard className="p-4">
                <div className="text-center py-8">
                  <DollarSign size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Доходы</h3>
                  <p className="text-sm text-muted-foreground mb-4">Отслеживайте ваши доходы и выплаты</p>
                  <div className="bg-background rounded-lg p-4 border">
                    <p className="text-2xl font-bold text-center">{formatPrice(stats.totalEarned)}</p>
                    <p className="text-sm text-muted-foreground text-center mt-1">Общий доход</p>
                  </div>
                </div>
              </MobileCard>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <MobileCard className="p-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <User size={32} className="text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Профиль специалиста</h3>
                  <p className="text-sm text-muted-foreground mb-4">Управляйте информацией о ваших услугах</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm">
                      <Settings size={16} className="mr-2" />
                      Настройки
                    </Button>
                    <Button variant="outline" size="sm">
                      <MapPin size={16} className="mr-2" />
                      Локация
                    </Button>
                  </div>
                </div>
              </MobileCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RoleGuard>
  );
}