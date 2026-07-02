import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { FloatingCard } from "@/components/ui/floating-card";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import i18n from "@/i18n/config";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadProNearbyJobs, type ProNearbyJob } from "@/utils/proNearbyJobs";
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

const getJobStatusText = (job: DashboardJob) => {
  const isDoneAwaitingConfirmation = job.status === 'done' && !job.end_confirmed;
  const map: Record<string, string> = {
    'new': i18n.t('status.new'),
    'accepted': i18n.t('status.accepted'),
    'in_progress': i18n.t('status.in_progress'),
    'done': isDoneAwaitingConfirmation ? i18n.t('status.awaiting_confirm') : i18n.t('status.done'),
    'canceled': i18n.t('status.canceled'),
    'expired': i18n.t('status.expired'),
  };
  return map[job.status] || job.status;
};

interface DashboardJob {
  id: string;
  title?: string | null;
  description?: string | null;
  status: string;
  end_confirmed?: boolean | null;
  scheduled_at?: string | null;
  budget_min_cents?: number | null;
  budget_max_cents?: number | null;
  client_id?: string | null;
  location_address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  pro_id?: string | null;
}

interface DashboardTender {
  id: string;
  title: string;
  deadline: string;
}

interface RealtimeJobPayload {
  title?: string | null;
  status?: string | null;
  pro_id?: string | null;
}

interface RatingRow {
  score: number;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const DashboardPro = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { formatPrice, loading: currencyLoading } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nearbyJobs, setNearbyJobs] = useState<ProNearbyJob[]>([]);
  const [hasProLocation, setHasProLocation] = useState(false);
  const [myActiveJobs, setMyActiveJobs] = useState<DashboardJob[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [kycStatus, setKycStatus] = useState<string>('pending');
  const [monthlyEarnings, setMonthlyEarnings] = useState<number>(0);
  const [completedJobs, setCompletedJobs] = useState<number>(0);
  const [responseTime, setResponseTime] = useState<string>(t('dash.pro.hour_short'));
  const [tenders, setTenders] = useState<DashboardTender[]>([]);
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

    // Настройка реального времени для отслеживания изменений в работах
    const jobsChannel = supabase
      .channel(`jobs_pro_dashboard_${userId ?? 'anonymous'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('DashboardPro: Job changed:', payload);

          if (!userId) {
            return;
          }

          const updatedJob = ((payload.new as RealtimeJobPayload | null) ?? {}) as RealtimeJobPayload;
          const oldJob = ((payload.old as RealtimeJobPayload | null) ?? {}) as RealtimeJobPayload;
          const isAssignedToCurrentUser = updatedJob.pro_id === userId || oldJob.pro_id === userId;
          const affectsNearbyJobs = updatedJob.status === 'new' || oldJob.status === 'new' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE';

          if (updatedJob.pro_id === userId && updatedJob.status === 'accepted' &&
              (oldJob.status !== 'accepted' || oldJob.pro_id !== userId)) {
            console.log('DashboardPro: Job assigned to current user, forcing data reload');

            toast({
              title: t("dash.pro.new_job_assigned"),
              description: t("dash.pro.new_job_assigned_desc", { title: updatedJob.title }),
              duration: 8000
            });
          }

          if (isAssignedToCurrentUser) {
            setTimeout(() => {
              loadActiveJobs(userId);
            }, 300);
          }

          if (affectsNearbyJobs || isAssignedToCurrentUser) {
            setTimeout(() => {
              loadNearbyJobs(userId);
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kycChannel);
      supabase.removeChannel(jobsChannel);
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

      // Дополнительная проверка через 2 секунды на случай пропущенных обновлений
      setTimeout(() => {
        console.log('DashboardPro: Performing delayed check for missed updates');
        loadActiveJobs(uid);
      }, 2000);
    } catch (error: unknown) {
      console.error('DashboardPro: Error during initialization:', error);
      toast({
        title: t("dash.pro.load_error_title"),
        description: getErrorMessage(error, t("dash.pro.load_error")),
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
          title: t("dash.pro.welcome"),
          description: t("dash.pro.role_activated")
        });
      }
    } catch (error: unknown) {
      console.error('DashboardPro: Error ensuring pro role:', error);
      // Don't throw - just log and continue
    }
  };

  const loadNearbyJobs = async (uid: string) => {
    try {
      const result = await loadProNearbyJobs(uid);
      setNearbyJobs(result.jobs);
      setHasProLocation(result.hasProLocation);
    } catch (error) {
      console.error('DashboardPro: Error loading nearby jobs:', error);
    }
  };

  const loadActiveJobs = async (uid: string) => {
    try {
      console.log('DashboardPro: Loading active jobs for pro_id:', uid);
      console.log('DashboardPro: Looking for specific job: d984322c-a83b-477b-acfa-0ac6e80d03e6');

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          client_id,
          title,
          description,
          status,
          end_confirmed,
          scheduled_at,
          budget_min_cents,
          budget_max_cents,
          location_address,
          created_at,
          updated_at,
          pro_id
        `)
        .eq('pro_id', uid)
        .in('status', ['accepted', 'in_progress', 'done'])
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('DashboardPro: Error loading active jobs:', error);
        return;
      }

      const jobs = data || [];
      const targetJob = jobs.find(job => job.id === 'd984322c-a83b-477b-acfa-0ac6e80d03e6');
       console.log('DashboardPro: Loaded active jobs:', {
        totalJobs: jobs.length,
        jobs: jobs,
        targetJobFound: !!targetJob,
        targetJob: targetJob,
        userId: uid,
        timestamp: new Date().toISOString()
      });

      // Обновляем состояние
      setMyActiveJobs(jobs);

      // Calculate completed jobs count
      const completed = jobs.filter(job => job.status === 'done').length;
      setCompletedJobs(completed);

      // Если целевой заказ найден, показываем дополнительное уведомление
      if (targetJob && targetJob.status === 'accepted') {
        console.log('DashboardPro: Target job found and accepted!');
      }
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
      const scores = (ratings || []).map((r: RatingRow) => r.score);
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
      setTenders((data || []).map((row) => ({
        id: row.id,
        title: row.title || t('dash.pro.tender_fallback'),
        deadline: row.window_to || row.created_at,
      })));
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
        <h1 className="text-2xl font-display font-bold text-gradient mb-4">{t("dash.pro.loading")}</h1>
        <div className="flex items-center justify-center gap-2">
          <NeumorphicIcon icon={Clock} size={32} variant="square" className="animate-spin" />
            </div>
          </div>

    </main>
  );

  return (
    <RoleGuard requiredRole="pro">
      <main className="min-h-screen">
        <Seo title={`${t('app.name')} — Кабинет специалиста`} description="Управляйте откликами, заказами и доходами" canonical="/pro/dashboard" />

      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("dash.pro.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("dash.pro.subtitle")}
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
              <Link to="/wallet" className="flex items-center justify-between p-2 rounded-xl hover:shadow-lg transition-shadow cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("dash.pro.balance")}</p>
                  <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
                </div>
                <NeumorphicIcon icon={Wallet} size={64} variant="behance" />
              </Link>
            </div>

            <div className="card-surface p-6">
              <Link to="/profile" className="flex items-center justify-between p-2 rounded-xl hover:shadow-lg transition-shadow cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("dash.pro.rating")}</p>
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
              </Link>
            </div>

            <div className="card-surface p-6">
              <Link to="/jobs?status=done" className="flex items-center justify-between p-2 rounded-xl hover:shadow-lg transition-shadow cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("dash.pro.completed")}</p>
                  <p className="text-2xl font-bold">{completedJobs}</p>
                </div>
                <NeumorphicIcon icon={Award} size={64} variant="behance" />
              </Link>
            </div>

            <div className="card-surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("dash.pro.response_time")}</p>
                  <p className="text-2xl font-bold text-foreground">{responseTime}</p>
                </div>
                <NeumorphicIcon icon={Clock} size={64} variant="behance" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12">
            <Link to="/profile/settings" className="p-4 text-center transition-all bg-neo neo-8 hover:neo-4 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t("dash.pro.profile")}</span>
            </Link>

            <Link to="/pro/schedule" className="p-4 text-center transition-all bg-neo neo-8 hover:neo-4 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t("dash.pro.schedule")}</span>
            </Link>

            <Link to="/portfolio" className="p-4 text-center transition-all bg-neo neo-8 hover:neo-4 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t("dash.pro.portfolio")}</span>
            </Link>

            <Link to="/tenders" className="p-4 text-center transition-all bg-neo neo-8 hover:neo-4 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t("dash.pro.deadline_jobs")}</span>
            </Link>

            <button type="button" disabled aria-disabled="true" title={t("dash.pro.payout_hint")} className="p-4 text-center transition-all bg-neo neo-8 rounded-2xl opacity-60 cursor-not-allowed">
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t("dash.pro.payout")}</span>
                <span className="text-xs text-muted-foreground">{t("dash.pro.payout_soon")}</span>
              </div>
            </button>


            <Link to="/kyc" className="p-4 text-center transition-all bg-neo neo-8 hover:neo-4 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">KYC</span>
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Available Jobs */}
            <div className="lg:col-span-2 space-y-8">
              <div className="card-surface p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <NeumorphicIcon icon={Briefcase} size={48} variant="behance" />
                    <h2 className="text-2xl font-display font-bold">{t("dash.pro.jobs_for_offers")}</h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {nearbyJobs.length} {t("dash.pro.jobs_nearby")}
                  </div>
                </div>

                <div className="space-y-4">
                  {nearbyJobs.length === 0 && (
                    <div className="text-center py-12">
                      <NeumorphicIcon icon={Briefcase} size={64} variant="behance" className="mb-4 mx-auto" />
                      <h3 className="text-lg font-semibold mb-2">{t("dash.pro.no_jobs_title")}</h3>
                      <p className="text-muted-foreground mb-6">
                        {hasProLocation
                          ? t('dash.pro.no_jobs_check_later')
                          : t('dash.pro.no_jobs_set_location')}
                      </p>
                      <Link to="/profile/settings" className="btn-hero px-8 py-4 rounded-xl font-semibold text-lg">
                        {t("dash.pro.setup_profile")}
                      </Link>
                    </div>
                  )}

                  {nearbyJobs.slice(0, 5).map((job, index) => (
                    <div key={job.id} className="card-surface p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{job.description || t('dash.pro.new_order')}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-5 w-5" />
                              <span>{job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString() : t('common.not_specified')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-5 w-5" />
                              <span>
                                {job.budget_min_cents && job.budget_max_cents
                                  ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                                  : job.budget_min_cents
                                  ? `${t('dash.pro.from')} ${formatPrice(job.budget_min_cents)}`
                                  : job.budget_max_cents
                                  ? `${t('dash.pro.to')} ${formatPrice(job.budget_max_cents)}`
                                  : t('dash.pro.negotiable')
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-5 w-5" />
                              <span>{job.distanceKm !== null ? `${job.distanceKm.toFixed(1)} ${t('dash.pro.km')}` : t('dash.pro.no_distance')}</span>
                            </div>
                          </div>
                          {job.location_address && (
                            <div className="text-sm text-muted-foreground mb-3">
                              {job.location_address}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          to={`/job/${job.id}`}
                          className="btn-ghost px-6 py-3 rounded-xl font-semibold"
                        >
                          {t("dash.pro.details")}
                        </Link>
                        <button className="btn-hero px-6 py-3 rounded-xl font-semibold">
                          {t("dash.pro.send_offer")}
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
                  <h2 className="text-2xl font-display font-bold">{t("dash.pro.my_active_jobs")}</h2>
                </div>

                <div className="space-y-4">
                  {myActiveJobs.length === 0 && (
                    <div className="text-center py-12">
                      <NeumorphicIcon icon={Clock} size={64} variant="behance" className="mb-4 mx-auto" />
                      <p className="text-muted-foreground mb-4">{t("dash.pro.no_active_jobs")}</p>
                      <Link to="/feed" className="btn-hero px-6 py-3 rounded-xl font-semibold inline-block">
                        {t("dash.pro.find_jobs")}
                      </Link>
                    </div>
                  )}

                  {myActiveJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="card-surface p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{job.description || t('dash.pro.job_fallback')}</h3>
                          <div className="text-sm text-muted-foreground mb-2">
                            Статус: {getJobStatusText(job)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {job.budget_min_cents && job.budget_max_cents
                              ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                              : t('dash.pro.negotiable')
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          to={`/job/${job.id}`}
                          className="btn-hero px-6 py-3 rounded-xl font-semibold"
                        >
                          {t("dash.pro.manage")}
                        </Link>
                        <Link
                          to={`/messages?user=${job.client_id}&job=${job.id}`}
                          className="btn-ghost px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
                        >
                          <NeumorphicIcon icon={MessageSquare} size={20} variant="behance" />
                          {t("dash.pro.continue_job")}
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
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-neo neo-8 transition-all duration-300">
                  <div className="w-8 h-8 rounded-full bg-neo neo-4 flex items-center justify-center">
                    {kycStatus === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : kycStatus === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {t('dash.pro.status_label')}: {kycStatus === 'approved' ? t('dash.pro.kyc_approved') :
                             kycStatus === 'rejected' ? t('dash.pro.kyc_rejected') :
                             t('dash.pro.kyc_pending')}
                  </span>
                </div>

                <button
                  onClick={() => userId && loadKycStatus(userId)}
                  className="w-10 h-10 rounded-xl bg-neo neo-4 hover:neo-2 transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-primary"
                  title={t("dash.pro.kyc_refresh")}
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
              </div>

              {/* Business tenders */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <NeumorphicIcon icon={TrendingUp} size={48} variant="behance" />
                  <h3 className="font-bold">{t("dash.pro.biz_tenders")}</h3>
                </div>

                {tenders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("dash.pro.no_open_tenders")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tenders.slice(0, 3).map((tender) => (
                      <div key={tender.id} className="card-surface p-4">
                        <h4 className="font-medium text-sm mb-1">{tender.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {t("dash.pro.until")} {new Date(tender.deadline).toLocaleDateString()}
                        </p>
                        <button className="btn-hero px-4 py-2 rounded-lg text-sm font-semibold w-full">
                          {t("dash.pro.respond")}
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
                  <h3 className="font-bold">{t("dash.pro.activity")}</h3>
                </div>

                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>{t("dash.pro.responses_today")}</span>
                      <span className="font-semibold">0</span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>{t("dash.pro.profile_views")}</span>
                      <span className="font-semibold">12</span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>{t("dash.pro.new_messages")}</span>
                      <span className="font-semibold">3</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <NeumorphicIcon icon={Zap} size={48} variant="behance" />
                  <h3 className="font-bold">{t("dash.pro.tips")}</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="font-medium mb-1">{t("dash.pro.tip1_title")}</p>
                    <p className="text-muted-foreground">{t("dash.pro.tip1")}</p>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="font-medium mb-1">{t("dash.pro.tip2_title")}</p>
                    <p className="text-muted-foreground">{t("dash.pro.tip2")}</p>
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