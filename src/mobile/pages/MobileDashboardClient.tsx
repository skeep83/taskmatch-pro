import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Briefcase, Gavel, Crown, CreditCard, Gift, Settings, 
  CheckCircle, Clock, DollarSign, Plus, ChevronRight, Star 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function MobileDashboardClient() {
  const { t } = useEnhancedI18n();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0, 
    completedJobs: 0,
    totalSpent: 0
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  // Load user data and stats - same logic as desktop
  useEffect(() => {
    const loadUserData = async () => {
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

        // Get jobs stats
        const { data: jobs } = await supabase
          .from('jobs')
          .select('status, price_cents')
          .eq('client_id', user.id);

        if (jobs) {
          const stats = {
            totalJobs: jobs.length,
            activeJobs: jobs.filter(j => ['pending', 'in_progress'].includes(j.status)).length,
            completedJobs: jobs.filter(j => j.status === 'completed').length,
            totalSpent: jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (j.price_cents || 0), 0)
          };
          setStats(stats);
        }

        // Get recent jobs
        const { data: recentJobsData } = await supabase
          .from('jobs')
          .select(`
            *,
            categories(name_ru),
            job_applications(
              id,
              status,
              profiles(first_name, last_name, avatar_url)
            )
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentJobs(recentJobsData || []);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  return (
    <RoleGuard requiredRole="client">
      <Seo title={`${t('app.name')} — ${t('client.dashboard.title')}`} description={t('client.dashboard.description')} canonical="/dashboard/client" />
      
      <div className="min-h-screen bg-background">
        <MobileHeader 
          title={t('client.dashboard.title')}
        />

        <div 
          className="px-4 pt-4"
          style={{ 
            paddingTop: 56 + safeAreaInsets.top + 16,
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
                  <span className="text-sm">{t('client.dashboard.tabs.overview')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="jobs" 
                  className="flex items-center gap-2 rounded-xl bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 whitespace-nowrap"
                >
                  <Briefcase size={16} />
                  <span className="text-sm">{t('client.dashboard.tabs.jobs')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tenders" 
                  className="flex items-center gap-2 rounded-xl bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 whitespace-nowrap"
                >
                  <Gavel size={16} />
                  <span className="text-sm">{t('client.dashboard.tabs.tenders')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="subscription" 
                  className="flex items-center gap-2 rounded-xl bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 whitespace-nowrap"
                >
                  <Crown size={16} />
                  <span className="text-sm">{t('client.dashboard.tabs.subscription')}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Quick Stats - Mobile Grid (2x2) */}
              <div className="grid grid-cols-2 gap-4">
                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('client.dashboard.stats.total_jobs')}</p>
                      <p className="text-xl font-bold">{stats.totalJobs}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Clock size={20} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('client.dashboard.stats.active_jobs')}</p>
                      <p className="text-xl font-bold">{stats.activeJobs}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle size={20} className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('client.dashboard.stats.completed_jobs')}</p>
                      <p className="text-xl font-bold">{stats.completedJobs}</p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <DollarSign size={20} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('client.dashboard.stats.total_spent')}</p>
                      <p className="text-lg font-bold">{formatPrice(stats.totalSpent)}</p>
                    </div>
                  </div>
                </MobileCard>
              </div>

              {/* Quick Actions */}
              <MobileCard className="p-4">
                <h3 className="font-semibold mb-4">Быстрые действия</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <Plus size={20} />
                    <span className="text-xs">Создать заказ</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <Gavel size={20} />
                    <span className="text-xs">Создать тендер</span>
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
                          <Badge variant={
                            job.status === 'completed' ? 'default' : 
                            job.status === 'in_progress' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {job.status}
                          </Badge>
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
                  <p className="text-sm text-muted-foreground mb-4">Управляйте вашими заказами</p>
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Создать заказ
                  </Button>
                </div>
              </MobileCard>
            </TabsContent>

            {/* Tenders Tab */}
            <TabsContent value="tenders" className="space-y-6">
              <MobileCard className="p-4">
                <div className="text-center py-8">
                  <Gavel size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Мои тендеры</h3>
                  <p className="text-sm text-muted-foreground mb-4">Создавайте тендеры и получайте предложения</p>
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Создать тендер
                  </Button>
                </div>
              </MobileCard>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-6">
              <MobileCard className="p-4">
                <div className="text-center py-8">
                  <Crown size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Подписка</h3>
                  <p className="text-sm text-muted-foreground mb-4">Управляйте вашей подпиской HomeCare</p>
                  <Button variant="outline">
                    Управлять планом
                  </Button>
                </div>
              </MobileCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RoleGuard>
  );
}