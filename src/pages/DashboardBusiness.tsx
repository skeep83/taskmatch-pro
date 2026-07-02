import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { RoleGuard } from "@/components/RoleGuard";
import { Seo } from "@/components/Seo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import {
  Building2,
  User,
  Settings,
  BarChart3,
  Users,
  FileText,
  Briefcase,
  Gavel,
  Plus,
  CreditCard,
  DollarSign
} from "lucide-react";
import { BusinessAccountForm } from "@/components/business/BusinessAccountForm";
import { BusinessJobs } from "@/components/business/BusinessJobs";
import { BusinessInvoices } from "@/components/business/BusinessInvoices";
import { BusinessAnalytics } from "@/components/business/BusinessAnalytics";
import { BusinessTenders } from "@/components/business/BusinessTenders";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "@/mobile/components/navigation/MobileHeader";

export default function DashboardBusiness() {
  interface BasicUser {
    id: string;
    email?: string | null;
  }

  const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
  };

  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useEnhancedI18n();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<BasicUser | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewStats, setOverviewStats] = useState({
    totalExpensesCents: 0,
    invoicesCount: 0,
    jobsCount: 0,
    hasBusinessAccount: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      console.log('Checking authentication...');
      const { data: session } = await supabase.auth.getSession();

      if (!session.session?.user) {
        console.log('No user session found, redirecting to auth');
        navigate("/auth");
        return;
      }

      console.log('User authenticated:', session.session.user.email);
      setUser(session.session.user);
      setLoading(false);
    } catch (error: unknown) {
      console.error('Auth check error:', error);
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, t("dash.biz.auth_error")),
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [navigate, toast]);

  const loadOverviewStats = useCallback(async (uid: string) => {
    try {
      const { data: businessData, error: businessError } = await supabase
        .from("business_accounts")
        .select("id")
        .eq("owner_id", uid)
        .maybeSingle();

      if (businessError) throw businessError;

      if (!businessData) {
        setOverviewStats({
          totalExpensesCents: 0,
          invoicesCount: 0,
          jobsCount: 0,
          hasBusinessAccount: false,
        });
        return;
      }

      const [{ count: jobsCount, error: jobsError }, { data: invoices, error: invoicesError }] = await Promise.all([
        supabase
          .from("business_jobs")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessData.id),
        supabase
          .from("biz_invoices")
          .select("amount_cents")
          .eq("business_id", businessData.id),
      ]);

      if (jobsError) throw jobsError;
      if (invoicesError) throw invoicesError;

      const totalExpensesCents = (invoices || []).reduce((sum, invoice) => sum + (invoice.amount_cents || 0), 0);

      setOverviewStats({
        totalExpensesCents,
        invoicesCount: invoices?.length || 0,
        jobsCount: jobsCount || 0,
        hasBusinessAccount: true,
      });
    } catch (error: unknown) {
      console.error('Overview stats load error:', error);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user?.id) return;
    void loadOverviewStats(user.id);
  }, [loadOverviewStats, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadOverviewStats(user.id);
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const businessAccountsChannel = supabase
      .channel(`dashboard-business-accounts-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_accounts',
        filter: `owner_id=eq.${user.id}`,
      }, () => {
        void loadOverviewStats(user.id);
      })
      .subscribe();

    const businessJobsChannel = supabase
      .channel(`dashboard-business-jobs-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_jobs',
      }, () => {
        void loadOverviewStats(user.id);
      })
      .subscribe();

    const invoicesChannel = supabase
      .channel(`dashboard-business-invoices-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'biz_invoices',
      }, () => {
        void loadOverviewStats(user.id);
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(businessAccountsChannel);
      void supabase.removeChannel(businessJobsChannel);
      void supabase.removeChannel(invoicesChannel);
    };
  }, [loadOverviewStats, user?.id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="card-surface p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("dash.biz.loading")}</h1>
          <div className="animate-spin">⏳</div>
        </div>
      </main>
    );
  }

  const dashboardOptions = [
    {
      value: 'client',
      label: t('menu.role_client'),
      icon: User,
      description: t('dash.biz.role_client_desc'),
      available: true,
    },
    {
      value: 'pro',
      label: t('menu.role_pro'),
      icon: Briefcase,
      description: t('dash.biz.role_pro_desc'),
      available: true,
    },
    {
      value: 'business',
      label: t('menu.role_business'),
      icon: Building2,
      description: t('dash.biz.role_biz_desc'),
      available: true,
    },
  ];

  const handleDashboardChange = (dashboard: string) => {
    if (dashboard === 'client') {
      navigate('/dashboard/client');
    } else if (dashboard === 'pro') {
      navigate('/dashboard/pro');
    } else if (dashboard === 'business') {
      navigate('/dashboard/business');
    }
  };

  return (
    <RoleGuard requiredRole="business">
      <Seo title={`ServiceHub — ${t("dash.biz.title")}`} description={t("dash.biz.seo_desc")} canonical="/dashboard/business" />

      {isMobile && (
        <MobileHeader
          title={t("dash.biz.title")}
          showNotifications={true}
          showLogout={true}
          showDashboardSelector={true}
          dashboardOptions={dashboardOptions}
          currentDashboard="business"
          onDashboardChange={handleDashboardChange}
        />
      )}

      <main className="min-h-screen" style={{ paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 80px)' : '0' }}>

        {/* Header Section */}
        <section className="container mx-auto py-24 px-6">
        {!isMobile && (
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
              {t("dash.biz.title")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("dash.biz.subtitle")}
            </p>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-8">
            {/* Overview Section */}
            <div className="space-y-4 lg:space-y-6">
              <div className="p-5 lg:p-8 bg-neo neo-8 rounded-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-lg lg:text-2xl font-semibold mb-2 text-black">{t("dash.biz.what_now")}</h2>
                    <p className="text-muted-foreground text-sm lg:text-base">{t("dash.biz.what_now_desc")}</p>
                  </div>
                  <Button onClick={() => navigate("/job/new")} className="w-full lg:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("dash.biz.create_job")}
                  </Button>
                </div>
              </div>

              {/* Quick Actions - Business Style */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <motion.button type="button" whileHover={{ scale: 1.05 }} className="p-4 lg:p-6 transition-all bg-neo neo-8 hover:neo-4 rounded-2xl" onClick={() => navigate("/job/new")}>
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                      <Plus className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">{t("dash.biz.create_job")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t("dash.biz.create_job_desc")}</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button type="button" whileHover={{ scale: 1.05 }} className="p-4 lg:p-6 transition-all bg-neo neo-8 hover:neo-4 rounded-2xl" onClick={() => setActiveTab("jobs")}>
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">{t("dash.biz.work_jobs")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t("dash.biz.work_jobs_desc")}</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button type="button" whileHover={{ scale: 1.05 }} className="p-4 lg:p-6 transition-all bg-neo neo-8 hover:neo-4 rounded-2xl" onClick={() => setActiveTab("tenders")}>
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                      <Gavel className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">{t("biz.tenders.title")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t("dash.biz.tenders_desc")}</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button type="button" whileHover={{ scale: 1.05 }} className="p-4 lg:p-6 transition-all bg-neo neo-8 hover:neo-4 rounded-2xl" onClick={() => setActiveTab("company")}>
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
                      <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">{t("dash.biz.company")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t("dash.biz.company_desc")}</p>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Quick Stats */}
              <div>
                <div className="mb-3 lg:mb-4">
                  <h3 className="text-base lg:text-xl font-semibold text-black">{t("dash.biz.kpi")}</h3>
                  <p className="text-sm text-muted-foreground">{t("dash.biz.kpi_desc")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 lg:p-6 bg-neo neo-8 rounded-2xl hover:neo-4 transition-all"
                    onClick={() => setActiveTab("invoices")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("biz.analytics.total_spent")}</p>
                        <p className="text-xl lg:text-2xl font-bold text-black">${(overviewStats.totalExpensesCents / 100).toFixed(2)}</p>
                      </div>
                      <NeumorphicIcon icon={DollarSign} size={isMobile ? 48 : 64} variant="behance" />
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 lg:p-6 bg-neo neo-8 rounded-2xl hover:neo-4 transition-all"
                    onClick={() => setActiveTab("company")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("dash.biz.invoices_count")}</p>
                        <p className="text-xl lg:text-2xl font-bold text-black">{overviewStats.invoicesCount}</p>
                      </div>
                      <NeumorphicIcon icon={Users} size={isMobile ? 48 : 64} variant="behance" />
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 lg:p-6 bg-neo neo-8 rounded-2xl hover:neo-4 transition-all"
                    onClick={() => setActiveTab("jobs")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("dash.biz.jobs_count")}</p>
                        <p className="text-xl lg:text-2xl font-bold text-black">{overviewStats.jobsCount}</p>
                      </div>
                      <NeumorphicIcon icon={Briefcase} size={isMobile ? 48 : 64} variant="behance" />
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Horizontal Tab Navigation */}
            <div className={`overflow-x-auto ${isMobile ? '' : 'hidden'}`}>
              <div className="flex space-x-2 p-3 bg-neo neo-inset-8 rounded-2xl min-w-max">
                {[
                  { id: 'overview', label: t('dash.biz.tab_overview'), icon: BarChart3 },
                  { id: 'jobs', label: t('dash.biz.tab_jobs'), icon: Briefcase },
                  { id: 'tenders', label: t('biz.tenders.title'), icon: Gavel },
                  { id: 'company', label: t('dash.biz.company'), icon: Building2 }
                ].map((tab) => (
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

            {/* Desktop Tab Navigation */}
            {!isMobile && (
              <TabsList className="grid h-auto w-full grid-cols-4 gap-2">
                  <TabsTrigger
                    value="overview"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">{t("dash.biz.tab_overview")}</span>
                                      </TabsTrigger>
                  <TabsTrigger
                    value="jobs"
                  >
                    <Briefcase className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">{t("dash.biz.tab_jobs")}</span>
                                      </TabsTrigger>
                  <TabsTrigger
                    value="tenders"
                  >
                    <Gavel className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">{t("biz.tenders.title")}</span>
                                      </TabsTrigger>
                  <TabsTrigger
                    value="company"
                  >
                    <Building2 className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">{t("dash.biz.company")}</span>
                                      </TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="overview" className="space-y-4 lg:space-y-8">
              <div className="p-4 lg:p-8 bg-neo neo-8 rounded-2xl">
                <h2 className="text-lg lg:text-2xl font-semibold mb-3 lg:mb-4 text-black">{t("dash.biz.welcome")}</h2>
                <p className="text-muted-foreground mb-4 lg:mb-6 text-sm lg:text-base">
                  {t("dash.biz.welcome_desc")}
                </p>
                <div className="space-y-2 lg:space-y-3">
                  <p className="text-xs lg:text-sm text-muted-foreground"><strong>1.</strong> {t("dash.biz.step1")}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground"><strong>2.</strong> {t("dash.biz.step2")}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground"><strong>3.</strong> {t("dash.biz.step3")}</p>
                </div>
              </div>

              <div className="p-4 lg:p-8 bg-neo neo-8 rounded-2xl">
                <div className="mb-4 lg:mb-6">
                  <h3 className="text-base lg:text-xl font-semibold text-black">{t("dash.biz.extra_sections")}</h3>
                  <p className="text-sm text-muted-foreground">{t("dash.biz.extra_sections_desc")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="p-5 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("invoices")}>
                    <div className="flex items-center gap-3 mb-3"><FileText className="h-5 w-5 text-primary" /><span className="font-semibold text-black">{t("dash.biz.bills")}</span></div>
                    <p className="text-sm text-muted-foreground">{t("dash.biz.bills_desc")}</p>
                  </button>
                  <button className="p-5 text-left bg-neo neo-8 hover:neo-4 rounded-2xl transition-all" onClick={() => setActiveTab("analytics")}>
                    <div className="flex items-center gap-3 mb-3"><BarChart3 className="h-5 w-5 text-primary" /><span className="font-semibold text-black">{t("dash.biz.analytics")}</span></div>
                    <p className="text-sm text-muted-foreground">{t("dash.biz.analytics_desc")}</p>
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="company">
              <BusinessAccountForm />
            </TabsContent>


            <TabsContent value="jobs">
              <BusinessJobs />
            </TabsContent>

            <TabsContent value="tenders">
              <BusinessTenders />
            </TabsContent>

            <TabsContent value="invoices">
              <BusinessInvoices />
            </TabsContent>

            <TabsContent value="analytics">
              <BusinessAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
    </RoleGuard>
  );
}