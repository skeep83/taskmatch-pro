import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel } from '@/lib/categoryLabel';
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Seo } from "@/components/Seo";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleUpgrade } from "@/components/RoleUpgrade";
import { HallOfFame } from "@/pages/HallOfFame";
import { canClientCancelJob, canClientDeleteJob, canClientEditJob } from "@/utils/jobLifecycle";
import { deleteClientJob } from "@/utils/deleteClientJob";
import { PaymentMethodsCard } from "@/components/PaymentMethodsCard";
import { UserReviews } from "@/components/UserReviews";
import { openChatWidget, isDesktopViewport } from "@/lib/chatWidget";

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

export default function DashboardClient() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { formatPrice: formatCurrency } = useCurrency();
  const { t, language } = useEnhancedI18n();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<BasicUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
      .channel(`dashboard-client-jobs-${user.id}`)
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

      if (jobsError) throw jobsError;
      const mergedJobs = mergePendingCreatedJob(jobsData || [], readPendingCreatedJob(user.id));
      setJobs(mergedJobs);

      // Calculate stats
      const totalJobs = mergedJobs.length;
      const activeJobs = mergedJobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length || 0;
      const completedJobs = mergedJobs.filter(j => j.status === 'done').length || 0;
      const totalSpent = mergedJobs.reduce((sum, j) => {
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
        title: t('dash.client.profile_updated'),
        description: t('dash.client.changes_saved')
      });
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      toast({
        title: t('common.error'),
        description: t('dash.client.save_error', { error: getErrorMessage(error, t('dash.client.unknown_error')) }),
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
    if (!confirm(t('dash.client.delete_confirm'))) {
      return;
    }

    try {
      const result = await deleteClientJob(jobId);

      toast({
        title: result === 'hard' ? t('dash.client.job_deleted') : t('dash.client.job_hidden'),
        description: result === 'hard' ? t('dash.client.job_deleted_desc') : t('dash.client.job_hidden_desc')
      });

      // Обновляем список заказов
      loadUserData();
    } catch (error: unknown) {
      console.error('Error deleting job:', error);
      toast({
        title: t('common.error'),
        description: t('dash.client.delete_error', { error: getErrorMessage(error, t('dash.client.unknown_error')) }),
        variant: 'destructive'
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm(t('dash.client.cancel_confirm'))) {
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
        title: t('dash.client.job_canceled'),
        description: t('dash.client.job_canceled_desc')
      });

      loadUserData();
    } catch (error: unknown) {
      console.error('Error cancelling job:', error);
      toast({
        title: t('common.error'),
        description: t('dash.client.cancel_error', { error: getErrorMessage(error, t('dash.client.unknown_error')) }),
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
      'new': { label: t('dash.client.st_new'), variant: 'secondary' as const },
      'accepted': { label: t('dash.client.st_accepted'), variant: 'default' as const },
      'in_progress': { label: t('dash.client.st_in_progress'), variant: 'default' as const },
      'done': { label: isDoneAwaitingConfirmation ? t('dash.client.st_done_wait') : t('status.done'), variant: 'default' as const },
      'canceled': { label: t('status.canceled'), variant: 'destructive' as const }
    };

    const statusInfo = statusMap[job.status as keyof typeof statusMap] || { label: job.status, variant: 'default' as const };
    console.log('Status badge rendering:', job.status, 'text:', statusInfo.label, 'icon at end');
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <span>{statusInfo.label}</span>
        {getStatusIcon(job.status)}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      'normal': { label: t('dash.client.urg_normal'), variant: 'outline' as const },
      'urgent': { label: t('dash.client.urg_urgent'), variant: 'secondary' as const },
      'same_day': { label: t('dash.client.urg_same_day'), variant: 'destructive' as const }
    };

    const urgencyInfo = urgencyMap[urgency as keyof typeof urgencyMap] || { label: urgency, variant: 'outline' as const };
    return <Badge variant={urgencyInfo.variant}>{urgencyInfo.label}</Badge>;
  };

  const formatPrice = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return t("dash.client.budget_na");

    if (minCents && maxCents) {
      return `${formatCurrency(minCents)} - ${formatCurrency(maxCents)}`;
    }

    return formatCurrency(minCents || maxCents || 0);
  };

  const getClientNextStepText = (job: Job) => {
    if (job.status === 'new') return t('dash.client.hint_new');
    if (job.status === 'accepted') return t('dash.client.hint_accepted');
    if (job.status === 'in_progress') return t('dash.client.hint_in_progress');
    if (job.status === 'done') return t('dash.client.hint_done');
    if (job.status === 'canceled') return t('dash.client.hint_canceled');
    return t('dash.client.hint_default');
  };

  const getClientPrimaryActionLabel = (job: Job) => {
    if (job.status === 'new') return t('dash.client.act_new');
    if (job.status === 'accepted') return t('dash.client.act_accepted');
    if (job.status === 'in_progress') return t('dash.client.act_in_progress');
    if (job.status === 'done') return t('dash.client.act_done');
    if (job.status === 'canceled') return t('dash.client.act_canceled');
    return t('dash.client.act_default');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="p-8 text-center bg-neo neo-8 rounded-2xl">
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
        <section className="container mx-auto py-6 md:py-10 px-4 md:px-6">
        <div className="max-w-7xl mx-auto mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            {t('client.dashboard.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
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
            <TabsList className="grid h-auto w-full grid-cols-4 gap-2">
                <TabsTrigger
                  value="overview"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t("dash.client.tab_overview")}</span>
                                  </TabsTrigger>
                <TabsTrigger
                  value="jobs"
                >
                  <Briefcase className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t("dash.client.tab_jobs")}</span>
                                  </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                >
                  <Crown className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t("dash.client.tab_subscription")}</span>
                                  </TabsTrigger>
                <TabsTrigger
                  value="settings"
                >
                  <Settings className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">{t("dash.client.tab_settings")}</span>
                                  </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              <div className="p-6 bg-neo neo-8 rounded-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t("dash.client.what_now")}</h2>
                    <p className="text-muted-foreground">{t('dash.client.what_now_desc')}</p>
                  </div>
                  <Button onClick={() => navigate("/job/new")} className="lg:w-auto w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("dash.client.create_job")}
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800">{t("dash.client.quick_actions")}</h2>
                  <p className="text-muted-foreground">{t("dash.client.quick_actions_desc")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button
                  type="button"
                  className="p-6 transition-all bg-neo neo-8 hover:neo-4 rounded-2xl"
                  onClick={() => navigate("/job/new")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-neo neo-4 flex items-center justify-center">
                      <Plus className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">{t('client.dashboard.quick_actions.create_job')}</h3>
                      <p className="text-sm text-gray-600">{t('client.dashboard.quick_actions.create_job_description')}</p>
                    </div>
                  </div>
                </button>

                {/* Бизнес-тендеры доступны только для бизнес-аккаунтов */}
                <div
                  aria-disabled="true"
                  className="p-6 opacity-50 cursor-not-allowed border-dashed bg-neo neo-8 rounded-2xl"
                  title={t("dash.client.biz_tender_only")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <NeumorphicIcon icon={Gavel} size={64} variant="behance" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">B</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-muted-foreground">{t("dash.client.biz_tender")}</h3>
                      <p className="text-sm text-muted-foreground">{t("dash.client.biz_tender_desc")}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="p-6 transition-all bg-neo neo-8 hover:neo-4 rounded-2xl"
                  onClick={() => setActiveTab("subscription")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-neo neo-4 flex items-center justify-center">
                      <Crown className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">{t("dash.client.subscription_home")}</h3>
                      <p className="text-sm text-gray-600">{t("dash.client.subscription_desc")}</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className="p-6 transition-all bg-neo neo-8 hover:neo-4 rounded-2xl"
                  onClick={() => (isDesktopViewport() ? openChatWidget() : navigate("/messages"))}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-neo neo-4 flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">{t("dash.client.messages")}</h3>
                      <p className="text-sm text-gray-600">{t("dash.client.messages_desc")}</p>
                    </div>
                  </div>
                </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800">{t("dash.client.kpi")}</h2>
                  <p className="text-muted-foreground">{t("dash.client.kpi_desc")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <button className="p-6 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("jobs")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.total_jobs')}</p>
                        <p className="text-2xl font-bold">{stats.totalJobs}</p>
                        <p className="text-xs text-muted-foreground mt-2">{t("dash.client.open_all_jobs")}</p>
                      </div>
                      <NeumorphicIcon icon={Briefcase} size={64} variant="behance" />
                    </div>
                  </button>

                  <button className="p-6 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("jobs")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.active_jobs')}</p>
                        <p className="text-2xl font-bold">{stats.activeJobs}</p>
                        <p className="text-xs text-muted-foreground mt-2">{t("dash.client.goto_active")}</p>
                      </div>
                      <NeumorphicIcon icon={Clock} size={64} variant="behance" />
                    </div>
                  </button>

                  <button className="p-6 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("jobs")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.completed_jobs')}</p>
                        <p className="text-2xl font-bold">{stats.completedJobs}</p>
                        <p className="text-xs text-muted-foreground mt-2">{t("dash.client.view_completed")}</p>
                      </div>
                      <NeumorphicIcon icon={CheckCircle} size={64} variant="behance" />
                    </div>
                  </button>

                  <button className="p-6 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("payments")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('client.dashboard.stats.total_spent')}</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                        <p className="text-xs text-muted-foreground mt-2">{t("dash.client.open_payments")}</p>
                      </div>
                      <NeumorphicIcon icon={DollarSign} size={64} variant="behance" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-8 bg-neo neo-8 rounded-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800">{t("dash.client.extra_sections")}</h2>
                    <p className="text-muted-foreground">{t('dash.client.extra_sections_desc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="p-5 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("payments")}>
                    <div className="flex items-center gap-3 mb-3"><CreditCard className="h-5 w-5 text-primary" /><span className="font-semibold text-gray-800">{t("dash.client.finance")}</span></div>
                    <p className="text-sm text-muted-foreground">{t("dash.client.payments_history_desc")}</p>
                  </button>
                  <button className="p-5 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("referrals")}>
                    <div className="flex items-center gap-3 mb-3"><Gift className="h-5 w-5 text-primary" /><span className="font-semibold text-gray-800">{t("dash.client.referral")}</span></div>
                    <p className="text-sm text-muted-foreground">{t("dash.client.referral_desc")}</p>
                  </button>
                  <button className="p-5 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("reviews")}>
                    <div className="flex items-center gap-3 mb-3"><Star className="h-5 w-5 text-primary" /><span className="font-semibold text-gray-800">{t("dash.client.performers")}</span></div>
                    <p className="text-sm text-muted-foreground">{t("dash.client.rating_desc")}</p>
                  </button>
                  <button className="p-5 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("tenders")}>
                    <div className="flex items-center gap-3 mb-3"><Gavel className="h-5 w-5 text-primary" /><span className="font-semibold text-gray-800">{t("dash.client.company_tenders")}</span></div>
                    <p className="text-sm text-muted-foreground">{t("dash.client.tenders_desc")}</p>
                  </button>
                </div>
              </div>

              {/* Role Upgrade Section */}
              {!hasPendingProRequest && !(userRoles.includes('pro') && userRoles.includes('business')) && (
                <div className="p-8 bg-neo neo-8 rounded-2xl">
                  <RoleUpgrade
                    userId={user?.id || ''}
                    currentRole={currentRole}
                    onRoleUpgraded={(newRole) => {
                      setCurrentRole(newRole);
                      if (newRole === 'pro') {
                        setHasPendingProRequest(true);
                      }
                      toast({
                        title: t("dash.client.request_sent"),
                        description: newRole === 'pro'
                          ? t("dash.client.pro_request_sent")
                          : t("dash.client.role_updated")
                      });
                    }}
                  />
                </div>
              )}

              {/* Recent Jobs */}
              <div className="p-8 bg-neo neo-8 rounded-2xl">
                <h2 className="text-2xl font-semibold mb-6">{t("dash.client.my_jobs")}</h2>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("dash.client.no_jobs")}</p>
                    <p className="text-sm mb-4">{t("dash.client.no_jobs_desc")}</p>
                    <button
                      onClick={() => navigate("/job/new")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-neo neo-8 hover:neo-4 rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800"
                    >
                      <Plus className="h-4 w-4" />
                      {t("dash.client.create_job")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{job.title || t("dash.client.untitled")}</h4>
                            {getStatusBadge(job)}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">{t("dash.client.request_no")}: {job.public_id}</div>
                          <div className="text-sm text-muted-foreground">
                            {categoryLabel(job.categories, language) || t("dash.client.other")} • {formatPrice(job.budget_min_cents, job.budget_max_cents)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {getClientNextStepText(job)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/job/${job.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {getClientPrimaryActionLabel(job)}
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
                              onClick={() => (isDesktopViewport() ? openChatWidget() : navigate("/messages"))}
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
              <div className="p-8 bg-neo neo-8 rounded-2xl">
                <div className="flex flex-row items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">{t("dash.client.my_jobs")}</h2>
                  <Button onClick={() => navigate("/job/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("dash.client.create_job")}
                  </Button>
                </div>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("dash.client.no_jobs")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dash.client.col_job")}</TableHead>
                        <TableHead>{t("dash.client.col_status")}</TableHead>
                        <TableHead>{t("dash.client.col_budget")}</TableHead>
                        <TableHead>{t("dash.client.col_date")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{job.title}</div>
                              <div className="text-xs font-mono text-muted-foreground">{t("dash.client.request_no")}: {job.public_id}</div>
                              <div className="text-sm text-muted-foreground">
                                {categoryLabel(job.categories, language) || t("dash.client.other")}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {getClientNextStepText(job)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(job)}
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
                                <Eye className="h-4 w-4 mr-2" />
                                {getClientPrimaryActionLabel(job)}
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
                                  onClick={() => (isDesktopViewport() ? openChatWidget() : navigate("/messages"))}
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
              <div className="p-8 bg-neo neo-8 rounded-2xl">
                <div className="text-center py-12 text-muted-foreground">
                  <div className="relative inline-block mb-6">
                    <Gavel className="h-16 w-16 mx-auto opacity-30" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm text-white font-bold">B</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t("dash.client.biz_only_title")}</h3>
                  <p className="mb-4">{t("dash.client.biz_only_desc")}</p>
                  <button
                    onClick={() => navigate("/dashboard/business")}
                    className="px-6 py-3 bg-neo neo-8 hover:neo-4 rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800"
                  >
                    {t("dash.client.open_biz")}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="p-8 bg-neo neo-8 rounded-2xl">
                  <h2 className="text-2xl font-semibold mb-6">{t("dash.client.subscription_home")}</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold">Basic</h3>
                      </div>
                      <div className="text-2xl font-bold mb-2">99 <span className="text-sm font-normal">{t("dash.client.per_month")}</span></div>
                      <ul className="space-y-2 text-sm">
                        <li>• {t("dash.client.priority_support")}</li>
                        <li>• {t("dash.client.discount5")}</li>
                        <li>• {t("dash.client.warranty")}</li>
                      </ul>
                    </div>

                    <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
                      <div className="flex items-center gap-2 mb-4">
                        <Crown className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold">Plus</h3>
                        <Badge>{t("dash.client.popular")}</Badge>
                      </div>
                      <div className="text-2xl font-bold mb-2">199 <span className="text-sm font-normal">{t("dash.client.per_month")}</span></div>
                      <ul className="space-y-2 text-sm mb-4">
                        <li>• {t("dash.client.all_basic")}</li>
                        <li>• {t("dash.client.discount10")}</li>
                        <li>• {t("dash.client.free_diag")}</li>
                        <li>• {t("dash.client.priority_support")}</li>
                      </ul>
                      <button onClick={() => navigate("/how-it-works")} className="w-full px-6 py-3 bg-neo neo-8 hover:neo-4 rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800">{t("dash.client.compare_plans")}</button>
                    </div>

                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold">Max</h3>
                      </div>
                      <div className="text-2xl font-bold mb-2">399 <span className="text-sm font-normal">{t("dash.client.per_month")}</span></div>
                      <ul className="space-y-2 text-sm">
                        <li>• {t("dash.client.all_plus")}</li>
                        <li>• {t("dash.client.discount15")}</li>
                        <li>• {t("dash.client.personal_manager")}</li>
                        <li>• {t("dash.client.vip_support")}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <div className="space-y-6">
              {user?.id && <PaymentMethodsCard userId={user.id} />}
              <div className="p-8 bg-neo neo-8 rounded-2xl">
                <h2 className="text-2xl font-semibold mb-6">{t("dash.client.payments_history")}</h2>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("dash.client.payments_empty")}</p>
                </div>
              </div>
              </div>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals">
              <div className="p-8 bg-neo neo-8 rounded-2xl">
                <h2 className="text-2xl font-semibold mb-6">{t("dash.client.referral")}</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-4">{t("dash.client.your_code")}</h3>
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <code className="font-mono text-lg">{stats.refferalCode}</code>
                      <button className="px-4 py-2 bg-neo neo-8 hover:neo-4 rounded-xl transition-all duration-300 text-gray-700 hover:text-gray-800 text-sm">{t("dash.client.copy")}</button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("dash.client.share_code")}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">{t("dash.client.stats")}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t("dash.client.invited")}:</span>
                        <span className="font-semibold">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("dash.client.earned")}:</span>
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
                <div className="p-8 bg-neo neo-8 rounded-2xl">
                  <h2 className="text-2xl font-semibold mb-2">{t("settings.hub_title")}</h2>
                  <p className="text-muted-foreground mb-6">{t("settings.hub_desc")}</p>
                  <button
                    onClick={() => navigate('/profile/settings')}
                    className="px-6 py-3 bg-neo neo-8 hover:neo-4 rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-800 font-medium"
                  >
                    {t("settings.open_full")}
                  </button>
                </div>

                {user?.id && (
                  <div className="p-8 bg-neo neo-8 rounded-2xl">
                    <h2 className="text-2xl font-semibold mb-1">{t("reviews.about_me")}</h2>
                    <p className="text-muted-foreground mb-6">{t("reviews.about_me_desc")}</p>
                    <UserReviews userId={user.id} showHeader={false} />
                  </div>
                )}

                <div className="p-8 bg-neo neo-8 rounded-2xl">
                  <h2 className="text-2xl font-semibold mb-6">{t("dash.client.notifications")}</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{t("dash.client.email_notif")}</h4>
                        <p className="text-sm text-muted-foreground">{t("dash.client.email_notif_desc")}</p>
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
                        <h4 className="font-medium">{t("dash.client.sms_notif")}</h4>
                        <p className="text-sm text-muted-foreground">{t("dash.client.sms_notif_desc")}</p>
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