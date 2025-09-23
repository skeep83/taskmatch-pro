import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Seo } from "@/components/Seo";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleUpgrade } from "@/components/RoleUpgrade";
import { HallOfFame } from "@/pages/HallOfFame";

import { getUserRole, UserRole } from "@/lib/userRoles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { formatPrice: formatCurrency } = useCurrency();
  const { t } = useEnhancedI18n();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "overview");
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
  const [profileData, setProfileData] = useState({
    phone: '',
    emailNotifications: true,
    smsNotifications: false
  });
  const [saving, setSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('client');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasPendingProRequest, setHasPendingProRequest] = useState(false);

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
      
      // Load role data
      const roleResult = await getUserRole(session.session.user.id);
      if (roleResult.success) {
        setCurrentRole(roleResult.role);
      }

      // Load all user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.session.user.id);
      
      if (roles) {
        setUserRoles(roles.map(r => r.role));
      }

      // Check for pending pro upgrade request
      const { data: proRequest } = await supabase
        .from('pro_upgrade_requests')
        .select('status')
        .eq('user_id', session.session.user.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      setHasPendingProRequest(!!proRequest);
      
      // Load profile data
      const { data: profileInfo } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', session.session.user.id)
        .single();
      
      if (profileInfo) {
        setProfileData(prev => ({
          ...prev,
          phone: profileInfo.phone || ''
        }));
      }
      
      setLoading(false);
    } catch (error: any) {
      toast({ 
        title: t("common.error"), 
        description: error.message || t("auth.error.generic"), 
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

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone: profileData.phone
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Профиль обновлен',
        description: 'Изменения сохранены успешно'
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось сохранить изменения: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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
      case 'new': return <AlertCircle className="h-3 w-3 flex-shrink-0" />;
      case 'accepted': return <CheckCircle className="h-3 w-3 flex-shrink-0" />;
      case 'in_progress': return <PlayCircle className="h-3 w-3 flex-shrink-0" />;
      case 'done': return <CheckCircle className="h-3 w-3 flex-shrink-0" />;
      case 'cancelled': return <XCircle className="h-3 w-3 flex-shrink-0" />;
      default: return <Clock className="h-3 w-3 flex-shrink-0" />;
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
    console.log('Status badge rendering:', status, 'text:', statusInfo.label, 'icon at end');
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <span>{statusInfo.label}</span>
        {getStatusIcon(status)}
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
    
    if (minCents && maxCents) {
      return `${formatCurrency(minCents)} - ${formatCurrency(maxCents)}`;
    }
    
    return formatCurrency(minCents || maxCents || 0);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="p-8 text-center bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
          <h1 className="text-2xl font-bold mb-4">{t('client.dashboard.loading')}</h1>
          <div className="animate-spin">⏳</div>
        </div>
      </main>
    );
  }

  return (
    <RoleGuard requiredRole="client">
      <Seo title={`${t('app.name')} — ${t('client.dashboard.title')}`} description={t('client.dashboard.description')} canonical="/dashboard/client" />
      <main className="min-h-screen">
        {/* Header Section */}
        <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t('client.dashboard.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('client.dashboard.welcome')}, {
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
            <div className="flex justify-center items-center">
              <TabsList className="grid grid-cols-8 bg-muted shadow-neumorphic-inset rounded-2xl gap-1 h-12 p-1">
                <TabsTrigger 
                  value="overview" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t('client.dashboard.tabs.overview')}</span>
                  {activeTab === "overview" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="jobs" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <Briefcase className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t('client.dashboard.tabs.jobs')}</span>
                  {activeTab === "jobs" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="tenders" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <Gavel className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t('client.dashboard.tabs.tenders')}</span>
                  {activeTab === "tenders" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="subscription" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <Crown className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t('client.dashboard.tabs.subscription')}</span>
                  {activeTab === "subscription" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t('client.dashboard.tabs.payments')}</span>
                  {activeTab === "payments" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="referrals" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <Gift className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t('client.dashboard.tabs.referrals')}</span>
                  {activeTab === "referrals" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <Star className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Зал славы</span>
                  {activeTab === "reviews" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                >
                  <Settings className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t('client.dashboard.tabs.settings')}</span>
                  {activeTab === "settings" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
                </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.total_jobs')}</p>
                      <p className="text-2xl font-bold">{stats.totalJobs}</p>
                    </div>
                    <NeumorphicIcon icon={Briefcase} size={64} variant="behance" />
                  </div>
                </div>

                <div className="p-6 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.active_jobs')}</p>
                      <p className="text-2xl font-bold">{stats.activeJobs}</p>
                    </div>
                    <NeumorphicIcon icon={Clock} size={64} variant="behance" />
                  </div>
                </div>

                <div className="p-6 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.completed_jobs')}</p>
                      <p className="text-2xl font-bold">{stats.completedJobs}</p>
                    </div>
                    <NeumorphicIcon icon={CheckCircle} size={64} variant="behance" />
                  </div>
                </div>

                <div className="p-6 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.total_spent')}</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                    </div>
                    <NeumorphicIcon icon={DollarSign} size={64} variant="behance" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button 
                  className="p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => navigate("/job/new")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Plus className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">{t('client.dashboard.quick_actions.create_job')}</h3>
                      <p className="text-sm text-gray-600">{t('client.dashboard.quick_actions.create_job_description')}</p>
                    </div>
                  </div>
                </button>

                {/* Тендеры доступны только для бизнес аккаунтов */}
                <div 
                  className="p-6 opacity-50 cursor-not-allowed border-dashed bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl"
                  title="Тендеры доступны только для бизнес аккаунтов"
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <NeumorphicIcon icon={Gavel} size={64} variant="behance" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">B</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-muted-foreground">Создать тендер</h3>
                      <p className="text-sm text-muted-foreground">Только для бизнес аккаунтов</p>
                    </div>
                  </div>
                </div>

                <button 
                  className="p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("subscription")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Crown className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">{t('client.dashboard.quick_actions.homecare')}</h3>
                      <p className="text-sm text-gray-600">{t('client.dashboard.quick_actions.premium_subscription')}</p>
                    </div>
                  </div>
                </button>

                <button 
                  className="p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => navigate("/messages")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">Сообщения</h3>
                      <p className="text-sm text-gray-600">Чат со специалистами</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Role Upgrade Section */}
              {!hasPendingProRequest && !(userRoles.includes('pro') && userRoles.includes('business')) && (
                <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <RoleUpgrade
                    userId={user?.id || ''}
                    currentRole={currentRole}
                    onRoleUpgraded={(newRole) => {
                      setCurrentRole(newRole);
                      if (newRole === 'pro') {
                        setHasPendingProRequest(true);
                      }
                      toast({
                        title: "Заявка отправлена",
                        description: newRole === 'pro' 
                          ? "Ваша заявка на статус специалиста отправлена на рассмотрение!"
                          : "Ваша роль была успешно обновлена!"
                      });
                    }}
                  />
                </div>
              )}

              {/* Recent Jobs */}
              <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                <h2 className="text-2xl font-semibold mb-6">Последние заказы</h2>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>У вас пока нет заказов</p>
                    <p className="text-sm mb-4">Создайте первый заказ для поиска специалистов</p>
                    <button 
                      onClick={() => navigate("/job/new")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800"
                    >
                      <Plus className="h-4 w-4" />
                      Создать заказ
                    </button>
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
              <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
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
              <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                <div className="text-center py-12 text-muted-foreground">
                  <div className="relative inline-block mb-6">
                    <Gavel className="h-16 w-16 mx-auto opacity-30" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm text-white font-bold">B</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Тендеры доступны только для бизнес аккаунтов</h3>
                  <p className="mb-4">Для создания тендеров необходимо перейти на бизнес аккаунт</p>
                  <button 
                    onClick={() => navigate("/dashboard/business")}
                    className="px-6 py-3 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800"
                  >
                    Перейти к бизнес аккаунту
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
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
                      <button className="w-full px-6 py-3 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800">Выбрать план</button>
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
              <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                <h2 className="text-2xl font-semibold mb-6">История платежей</h2>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>История платежей пуста</p>
                </div>
              </div>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals">
              <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                <h2 className="text-2xl font-semibold mb-6">Реферальная программа</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-4">Ваш реферальный код</h3>
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <code className="font-mono text-lg">{stats.refferalCode}</code>
                      <button className="px-4 py-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 hover:text-gray-800 text-sm">Копировать</button>
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

            {/* Reviews Tab - Hall of Fame */}
            <TabsContent value="reviews">
              <div className="max-w-4xl mx-auto">
                <HallOfFame />
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
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
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+373 XX XXX XXX"
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button 
                      onClick={saveProfile}
                      disabled={saving}
                      className="w-full md:w-auto px-6 py-3 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800 disabled:opacity-50"
                    >
                      {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                  </div>
                </div>

                <div className="p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <h2 className="text-2xl font-semibold mb-6">Уведомления</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Email уведомления</h4>
                        <p className="text-sm text-muted-foreground">Получать уведомления на email</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={profileData.emailNotifications}
                        onChange={(e) => setProfileData(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                        className="toggle" 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">SMS уведомления</h4>
                        <p className="text-sm text-muted-foreground">Получать SMS о важных событиях</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={profileData.smsNotifications}
                        onChange={(e) => setProfileData(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                        className="toggle" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
    </RoleGuard>
  );
}