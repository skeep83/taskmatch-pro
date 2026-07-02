import { default as React, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { MediaViewer } from "@/components/media";
import { useMobile } from "@/mobile/providers/MobileProvider";
import { Seo } from "@/components/Seo";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleUpgrade } from "@/components/RoleUpgrade";
import { getUserRole, UserRole } from "@/lib/userRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { MobileCard } from "@/mobile/components/ui/MobileCard";
import { MobileHeader } from "@/mobile/components/navigation/MobileHeader";
import { canClientCancelJob, canClientDeleteJob, canClientEditJob } from "@/utils/jobLifecycle";
import { deleteClientJob } from "@/utils/deleteClientJob";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
  Trash2,
  Copy,
  ChevronDown,
  Building2,
  Camera
} from "lucide-react";

interface Job {
  id: string;
  public_id: string;
  title: string;
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'canceled' | 'disputed';
  budget_min_cents?: number;
  budget_max_cents?: number;
  created_at: string;
  scheduled_at?: string;
  urgency: string;
  pro_id?: string;
  end_confirmed?: boolean;
  categories?: {
    label_ru: string;
  };
  job_photos?: {
    id: string;
    file_url: string;
  }[];
}

interface Subscription {
  id: string;
  plan: 'basic' | 'plus' | 'max';
  status: 'active' | 'cancelled' | 'expired';
  expires_at: string;
  auto_renew: boolean;
}

interface BasicUser {
  id: string;
  email?: string | null;
}

interface UserProfile {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const LAST_CREATED_JOB_STORAGE_KEY = "taskmatch:lastCreatedJob";

type PendingCreatedJob = Job & {
  client_id: string;
};

const readPendingCreatedJob = (userId: string): PendingCreatedJob | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(LAST_CREATED_JOB_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingCreatedJob;
    if (!parsed?.id || parsed.client_id !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
};

const clearPendingCreatedJob = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(LAST_CREATED_JOB_STORAGE_KEY);
};

const mergePendingCreatedJob = (jobs: Job[], pending: PendingCreatedJob | null) => {
  if (!pending) return jobs;
  if (jobs.some(job => job.id === pending.id)) {
    clearPendingCreatedJob();
    return jobs;
  }

  return [pending, ...jobs].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export default function MobileDashboardClient() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { formatPrice: formatCurrency } = useCurrency();
  const { t } = useEnhancedI18n();
  const { safeAreaInsets } = useMobile();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<BasicUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
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
  const [hasPendingProRequest, setHasPendingProRequest] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    loadUserData();
  }, [user]);

  useEffect(() => {
    const nextTab = searchParams.get('tab') || 'overview';
    setActiveTab(nextTab);

    if (!user) return;
    if (!searchParams.get('refresh')) return;

    loadUserData();
  }, [searchParams, user]);

  useEffect(() => {
    if (!user) return;

    const refreshJobs = () => {
      if (document.visibilityState === 'visible') {
        loadUserData();
      }
    };

    window.addEventListener('focus', refreshJobs);
    document.addEventListener('visibilitychange', refreshJobs);

    return () => {
      window.removeEventListener('focus', refreshJobs);
      document.removeEventListener('visibilitychange', refreshJobs);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`mobile-dashboard-client-jobs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `client_id=eq.${user.id}`,
        },
        () => {
          void loadUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      // Load user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.session.user.id);

      if (rolesData) {
        setUserRoles(
          rolesData
            .map(r => r.role)
            .filter((r): r is UserRole => r === 'client' || r === 'pro' || r === 'business')
        );
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
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, t("auth.error.generic")),
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
      console.log('🔍 LOADING JOBS for user:', user.id);

      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          id,
          public_id,
          title,
          status,
          budget_min_cents,
          budget_max_cents,
          created_at,
          scheduled_at,
          urgency,
          pro_id,
          end_confirmed,
          categories (
            label_ru
          )
        `)
        .eq("client_id", user.id)
        .or("status.is.null,status.neq.canceled")
        .order("created_at", { ascending: false })
        .limit(10);

      if (jobsError) {
        console.error('❌ ERROR LOADING JOBS:', jobsError);
        throw jobsError;
      }

      console.log('✅ JOBS LOADED:', jobsData?.length, 'jobs');

      if (jobsData && jobsData.length > 0) {
        // Load photos separately
        const jobIds = jobsData.map(job => job.id);
        console.log('🖼️ Loading photos for jobs:', jobIds);

        const { data: photosData, error: photosError } = await supabase
          .from('job_photos')
          .select('id, job_id, file_url')
          .in('job_id', jobIds);

        if (photosError) {
          console.error('❌ ERROR LOADING PHOTOS:', photosError);
        } else {
          console.log('✅ PHOTOS LOADED:', photosData?.length, 'photos');
        }

        // Attach photos to jobs
        const jobsWithPhotos = jobsData.map(job => ({
          ...job,
          job_photos: photosData?.filter(photo => photo.job_id === job.id) || []
        }));

        console.log('✅ JOBS WITH PHOTOS ATTACHED');
        const mergedJobs = mergePendingCreatedJob(jobsWithPhotos, readPendingCreatedJob(user.id));
        setJobs(mergedJobs);
      } else {
        const mergedJobs = mergePendingCreatedJob([], readPendingCreatedJob(user.id));
        setJobs(mergedJobs);
      }

      const mergedStatsJobs = mergePendingCreatedJob(jobsData || [], readPendingCreatedJob(user.id));

      // Calculate stats
      const totalJobs = mergedStatsJobs.length || 0;
      const activeJobs = mergedStatsJobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length || 0;
      const completedJobs = mergedStatsJobs.filter(j => j.status === 'done').length || 0;
      const totalSpent = mergedStatsJobs.reduce((sum, j) => {
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

    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось сохранить изменения: ${getErrorMessage(error, 'неизвестная ошибка')}`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const canEditJob = (job: Job) => canClientEditJob({ job, isOwner: true });
  const canDeleteJob = (job: Job) => canClientDeleteJob({ job, isOwner: true });
  const canCancelJob = (job: Job) => canClientCancelJob({ job, isOwner: true });

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) {
      return;
    }

    try {
      const result = await deleteClientJob(jobId);

      toast({
        title: result === 'hard' ? 'Заказ удален' : 'Заказ скрыт из активных',
        description: result === 'hard' ? 'Заказ был успешно удален' : 'Заказ отменён и больше не показывается в активном кабинете'
      });

      loadUserData();
    } catch (error: unknown) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить заказ: ${getErrorMessage(error, 'неизвестная ошибка')}`,
        variant: 'destructive'
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('После выбора исполнителя заказ больше нельзя редактировать или удалять. Отменить заказ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'canceled',
          status_new: 'Cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) throw error;

      await supabase.rpc('transition_job_status', {
        _job_id: jobId,
        _new_status: 'Cancelled',
        _reason: 'client_cancelled_locked_job',
      });

      toast({
        title: 'Заказ отменён',
        description: 'Заказ сохранён в истории как отменённый'
      });

      loadUserData();
    } catch (error: unknown) {
      console.error('Error cancelling job:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось отменить заказ: ${getErrorMessage(error, 'неизвестная ошибка')}`,
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
      case 'canceled': return <XCircle className="h-3 w-3 flex-shrink-0" />;
      default: return <Clock className="h-3 w-3 flex-shrink-0" />;
    }
  };

  const getStatusBadge = (job: Job) => {
    const isDoneAwaitingConfirmation = job.status === 'done' && !job.end_confirmed;
    const statusMap = {
      'new': { label: 'Ищем исполнителя', variant: 'secondary' as const },
      'accepted': { label: 'Исполнитель выбран', variant: 'default' as const },
      'in_progress': { label: 'Работа выполняется', variant: 'default' as const },
      'done': { label: isDoneAwaitingConfirmation ? 'Ждёт подтверждения' : 'Выполнен', variant: 'default' as const },
      'canceled': { label: 'Отменён', variant: 'destructive' as const }
    };

    const statusInfo = statusMap[job.status as keyof typeof statusMap] || { label: job.status, variant: 'default' as const };
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <span>{statusInfo.label}</span>
        {getStatusIcon(job.status)}
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

  const getClientNextStepText = (job: Job) => {
    if (job.status === 'new') return 'Ожидайте отклики специалистов';
    if (job.status === 'accepted') return 'Исполнитель выбран — можно открыть детали и написать ему';
    if (job.status === 'in_progress') return 'Работа идёт — следите за прогрессом';
    if (job.status === 'done') return 'Откройте заказ, чтобы подтвердить выполнение';
    if (job.status === 'canceled') return 'Заказ отменён';
    return 'Откройте детали заказа';
  };

  const getClientPrimaryActionLabel = (job: Job) => {
    if (job.status === 'done') return 'Подтвердить';
    if (job.status === 'accepted' || job.status === 'in_progress') return 'Открыть';
    return 'Посмотреть';
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(stats.refferalCode);
    toast({
      title: 'Скопировано!',
      description: 'Реферальный код скопирован в буфер обмена'
    });
  };

  const getDashboardOptions = () => {
    const options = [
      {
        value: 'client',
        label: 'Клиент',
        icon: User,
        description: 'Заказы и услуги',
        available: true
      }
    ];

    if (userRoles.includes('pro') || hasPendingProRequest) {
      options.push({
        value: 'pro',
        label: 'Специалист',
        icon: Briefcase,
        description: 'Мои услуги и заказы',
        available: true
      });
    }

    if (userRoles.includes('business')) {
      options.push({
        value: 'business',
        label: 'Бизнес',
        icon: Building2,
        description: 'Компания и тендеры',
        available: true
      });
    }

    return options;
  };

  const handleDashboardSwitch = (dashboardType: string) => {
    if (dashboardType !== 'client') {
      navigate(`/dashboard/${dashboardType}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MobileCard className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('client.dashboard.loading')}</h1>
          <div className="animate-spin">⏳</div>
        </MobileCard>
      </div>
    );
  }

  const tabItems = [
    { id: "overview", label: "Обзор", icon: User },
    { id: "jobs", label: "Заказы", icon: Briefcase },
    { id: "tenders", label: "Тендеры", icon: Gavel },
    { id: "subscription", label: "Подписка", icon: Crown },
    { id: "payments", label: "Платежи", icon: CreditCard },
    { id: "referrals", label: "Рефералы", icon: Gift },
    { id: "settings", label: "Настройки", icon: Settings }
  ];

  return (
    <RoleGuard requiredRole="client">
      <Seo title={`${t('app.name')} — ${t('client.dashboard.title')}`} description={t('client.dashboard.description')} canonical="/dashboard/client" />

      <div className="min-h-screen bg-neo">
        <MobileHeader
          title="Панель клиента"
          showBack={false}
          showLogout={true}
          showNotifications={true}
          showDashboardSelector={true}
          dashboardOptions={getDashboardOptions()}
          currentDashboard="client"
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
                  <p className="text-sm text-muted-foreground">Потрачено</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalSpent)}</p>
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
                  onPress={() => navigate("/job/new")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Создать заказ</h3>
                </MobileCard>

                <MobileCard
                  pressable
                  onPress={() => navigate("/messages")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Сообщения</h3>
                </MobileCard>

                <MobileCard
                  pressable
                  onPress={() => setActiveTab("subscription")}
                  className="flex flex-col items-center justify-center text-center h-24"
                >
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Подписка</h3>
                </MobileCard>

                <MobileCard className="flex flex-col items-center justify-center text-center h-24 opacity-50">
                  <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center mb-2">
                    <Gavel className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Тендеры</h3>
                  <p className="text-xs text-muted-foreground">Только бизнес</p>
                </MobileCard>
              </div>

              {/* Role Upgrade */}
              {!hasPendingProRequest && (
                <MobileCard>
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
                </MobileCard>
              )}

              {/* Recent Jobs */}
              <MobileCard>
                <h2 className="text-xl font-semibold mb-4">Последние заказы</h2>
                {jobs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">У вас ещё нет заказов. Создайте первый!</p>
                    <Button
                      onClick={() => navigate("/job/new")}
                      className="bg-neo neo-8 hover:neo-4 text-gray-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать заказ
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="p-3 border rounded-lg bg-white/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{job.title || "Без названия"}</h4>
                          {getStatusBadge(job)}
                        </div>
                        <div className="mb-2 text-[11px] font-mono text-muted-foreground">№ заявки: {job.public_id}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {job.categories?.label_ru || "Другое"} • {formatPrice(job.budget_min_cents, job.budget_max_cents)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          {getClientNextStepText(job)}
                        </div>

                        {/* Job Photos */}
                        {(() => {
                          console.log('Rendering job card for:', job.id);
                          console.log('Job photos:', job.job_photos);
                          console.log('Has photos:', job.job_photos && job.job_photos.length > 0);
                          return true;
                        })()}

                        {job.job_photos && job.job_photos.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1 mb-2">
                              <Camera className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-500">
                                Фото и видео ({job.job_photos.length})
                              </span>
                            </div>
                            <div className="flex gap-1 overflow-x-auto">
                              {job.job_photos.slice(0, 4).map((photo, index) => (
                                <div
                                  key={photo.id || index}
                                  className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0"
                                >
                                  <MediaViewer
                                    src={supabase.storage.from('evidence').getPublicUrl(photo.file_url).data.publicUrl}
                                    alt={`Медиа ${index + 1}`}
                                    type="auto"
                                    className="w-full h-full object-cover"
                                    containerClassName="w-full h-full"
                                    controls
                                  />
                                </div>
                              ))}
                              {job.job_photos.length > 4 && (
                                <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs text-gray-600">+{job.job_photos.length - 4}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/job/${job.id}`)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {getClientPrimaryActionLabel(job)}
                          </Button>
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
              </MobileCard>
            </div>
          )}

          {activeTab === "jobs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Мои заказы</h2>
                <Button
                  onClick={() => navigate("/job/new")}
                  size="sm"
                  className="bg-neo neo-8 text-gray-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Создать
                </Button>
              </div>

              {jobs.length === 0 ? (
                <MobileCard className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">У вас ещё нет заказов. Создайте первый!</p>
                </MobileCard>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <MobileCard key={job.id}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{job.title}</h4>
                          {getStatusBadge(job)}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">№ заявки: {job.public_id}</div>

                        <div className="text-sm text-muted-foreground">
                          {job.categories?.label_ru || "Другое"}
                        </div>

                        <div className="text-sm">
                          <strong>Бюджет:</strong> {formatPrice(job.budget_min_cents, job.budget_max_cents)}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString('ru-RU')}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {getClientNextStepText(job)}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/job/${job.id}`)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {getClientPrimaryActionLabel(job)}
                          </Button>

                          {canEditJob(job) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/job/${job.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          {canDeleteJob(job) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}

                          {canCancelJob(job) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelJob(job.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
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
                    </MobileCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "tenders" && (
            <MobileCard className="text-center py-8">
              <div className="relative inline-block mb-6">
                <Gavel className="h-16 w-16 mx-auto opacity-30" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm text-white font-bold">B</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Бизнес-заказы доступны только для компаний</h3>
              <p className="text-muted-foreground mb-4">Для работы с корпоративными заказами используйте бизнес-аккаунт</p>
              <Button
                onClick={() => navigate("/dashboard/business")}
                className="bg-neo neo-8 text-gray-700"
              >
                Открыть бизнес-аккаунт
              </Button>
            </MobileCard>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Планы подписки</h2>

              {/* Current Plan */}
              <MobileCard>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-neo neo-4 flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Базовый план</h3>
                  <p className="text-muted-foreground">Текущий план</p>
                </div>
              </MobileCard>

              <div className="space-y-4">
                <MobileCard>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">HomeCare Basic</h4>
                      <p className="text-sm text-muted-foreground">Основные функции</p>
                      <p className="text-lg font-bold">99 ₽/мес</p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• Приоритетная поддержка</li>
                        <li>• Скидка 5% на заказы</li>
                        <li>• Расширенная гарантия</li>
                      </ul>
                    </div>
                    <Button variant="outline">Выбрать</Button>
                  </div>
                </MobileCard>

                <MobileCard className="border-2 border-primary bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">HomeCare Plus</h4>
                        <Badge>Популярный</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Расширенные возможности</p>
                      <p className="text-lg font-bold">199 ₽/мес</p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• Все из Basic</li>
                        <li>• Скидка 10% на заказы</li>
                        <li>• Бесплатная диагностика</li>
                        <li>• Приоритетная поддержка</li>
                      </ul>
                    </div>
                    <Button>Выбрать</Button>
                  </div>
                </MobileCard>

                <MobileCard>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">HomeCare Max</h4>
                      <p className="text-sm text-muted-foreground">Максимальный функционал</p>
                      <p className="text-lg font-bold">399 ₽/мес</p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• Все из Plus</li>
                        <li>• Скидка 15% на заказы</li>
                        <li>• Персональный менеджер</li>
                        <li>• VIP поддержка 24/7</li>
                      </ul>
                    </div>
                    <Button variant="outline">Выбрать</Button>
                  </div>
                </MobileCard>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <MobileCard className="text-center py-8">
              <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">История платежей</h3>
              <p className="text-muted-foreground">Здесь будет отображаться история ваших платежей</p>
            </MobileCard>
          )}

          {activeTab === "referrals" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Реферальная программа</h2>

              <MobileCard>
                <div className="text-center">
                  <Gift className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Ваш реферальный код</h3>
                  <div className="flex items-center gap-2 p-3 bg-white/50 rounded-lg mb-4">
                    <code className="flex-1 text-center font-mono text-lg">{stats.refferalCode}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyReferralCode}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Поделитесь кодом с друзьями и получите бонусы за каждого нового пользователя
                  </p>
                </div>
              </MobileCard>

              <MobileCard>
                <h4 className="font-semibold mb-3">Статистика рефералов</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Приглашено пользователей:</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Заработано бонусов:</span>
                    <span className="font-semibold">0 ₽</span>
                  </div>
                </div>
              </MobileCard>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Настройки</h2>

              <MobileCard>
                <h4 className="font-semibold mb-4">Профиль клиента</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-neo neo-inset-4 flex items-center justify-center text-lg font-semibold text-gray-600">
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Аватар клиента" className="w-full h-full object-cover" />
                      ) : (
                        (userProfile?.first_name || userProfile?.full_name || user?.email || 'К').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{userProfile?.full_name || [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') || 'Профиль клиента'}</p>
                      <p className="text-xs text-muted-foreground">Фото, имя, адрес, контакты и приватная локация</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate('/mobile/profile-settings')}
                    className="w-full bg-neo neo-8 text-gray-700"
                  >
                    Открыть полные настройки профиля
                  </Button>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Телефон</label>
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>

                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full bg-neo neo-8 text-gray-700"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить быстрые изменения'}
                  </Button>
                </div>
              </MobileCard>

              <MobileCard>
                <h4 className="font-semibold mb-4">Уведомления</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Email уведомления</label>
                      <p className="text-xs text-muted-foreground">Получать уведомления на email</p>
                    </div>
                    <Switch
                      checked={profileData.emailNotifications}
                      onCheckedChange={(checked) =>
                        setProfileData(prev => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">SMS уведомления</label>
                      <p className="text-xs text-muted-foreground">Получать SMS уведомления</p>
                    </div>
                    <Switch
                      checked={profileData.smsNotifications}
                      onCheckedChange={(checked) =>
                        setProfileData(prev => ({ ...prev, smsNotifications: checked }))
                      }
                    />
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