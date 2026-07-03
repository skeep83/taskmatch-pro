import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel } from '@/lib/categoryLabel';
import { useToast } from "@/hooks/use-toast";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, Briefcase, Clock, Target } from "lucide-react";

interface BusinessStats {
  totalSpent: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  averageJobValue: number;
  totalEmployees: number;
  monthlySpending: Array<{ month: string; amount: number }>;
  topCategories: Array<{ category: string; count: number }>;
}

export function BusinessAnalytics() {
  const { toast } = useToast();
  const { t, language } = useEnhancedI18n();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [stats, setStats] = useState<BusinessStats>({
    totalSpent: 0,
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    averageJobValue: 0,
    totalEmployees: 0,
    monthlySpending: [],
    topCategories: []
  });

  const loadBusinessAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      // Get business account
      const { data: businessData, error: businessError } = await supabase
        .from("business_accounts")
        .select("id")
        .eq("owner_id", session.session.user.id)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!businessData) return;

      setBusinessId(businessData.id);

      // Get business jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("business_jobs")
        .select(`
          *,
          jobs:job_id (
            id,
            status,
            budget_min_cents,
            budget_max_cents,
            created_at,
            categories:category_id (
              label_ru
            )
          )
        `)
        .eq("business_id", businessData.id);

      if (jobsError) throw jobsError;

      // Get business members
      const { data: membersData, error: membersError } = await supabase
        .from("business_members")
        .select("id")
        .eq("business_id", businessData.id);

      if (membersError) throw membersError;

      const { data: invoicesData, error: invoicesError } = await supabase
        .from("biz_invoices")
        .select("amount_cents, created_at")
        .eq("business_id", businessData.id);

      if (invoicesError) throw invoicesError;

      // Calculate statistics
      const jobs = jobsData || [];
      const invoices = invoicesData || [];
      const totalJobs = jobs.length;
      const activeJobs = jobs.filter(j => j.jobs.status === 'in_progress' || j.jobs.status === 'accepted').length;
      const completedJobs = jobs.filter(j => j.jobs.status === 'done').length;

      // Calculate real spending from business invoices instead of estimated job budgets
      const totalSpent = invoices.reduce((sum, invoice) => sum + (invoice.amount_cents || 0), 0);

      const averageJobValue = invoices.length > 0 ? totalSpent / invoices.length : 0;

      // Group categories by real linked jobs count only; no truthful invoice→category spend attribution exists here
      const categoryStats = jobs.reduce((acc, j) => {
        const category = categoryLabel(j.jobs.categories, language) || t('biz.analytics.other');
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += 1;
        return acc;
      }, {} as Record<string, number>);

      const topCategories = Object.entries(categoryStats)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Monthly spending (last 6 months) based on real invoice amounts
      const monthlySpending = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM

        const monthInvoices = invoices.filter(invoice => invoice.created_at.startsWith(monthKey));
        const monthAmount = monthInvoices.reduce((sum, invoice) => sum + (invoice.amount_cents || 0), 0);

        monthlySpending.push({
          month: date.toLocaleDateString('ru', { month: 'short', year: 'numeric' }),
          amount: monthAmount
        });
      }

      setStats({
        totalSpent,
        totalJobs,
        activeJobs,
        completedJobs,
        averageJobValue,
        totalEmployees: membersData?.length || 0,
        monthlySpending,
        topCategories
      });

    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("biz.analytics.load_error"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadBusinessAnalytics();
  }, [loadBusinessAnalytics]);

  useEffect(() => {
    if (!businessId) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadBusinessAnalytics();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const businessJobsChannel = supabase
      .channel(`business-analytics-jobs-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_jobs',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        void loadBusinessAnalytics();
      })
      .subscribe();

    const linkedJobsChannel = supabase
      .channel(`business-analytics-linked-jobs-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
      }, () => {
        void loadBusinessAnalytics();
      })
      .subscribe();

    const membersChannel = supabase
      .channel(`business-analytics-members-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_members',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        void loadBusinessAnalytics();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(businessJobsChannel);
      void supabase.removeChannel(linkedJobsChannel);
      void supabase.removeChannel(membersChannel);
    };
  }, [businessId, loadBusinessAnalytics]);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-neo neo-8 rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 rounded-full bg-neo neo-4"></div>
          <span className="ml-3 text-black">{t("biz.analytics.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-black">{t("biz.analytics.title")}</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neo neo-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t("biz.analytics.total_spent")}</p>
              <p className="text-2xl font-bold text-black">{formatPrice(stats.totalSpent)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-neo neo-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t("biz.analytics.total_jobs")}</p>
              <p className="text-2xl font-bold text-black">{stats.totalJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-neo neo-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t("biz.analytics.active")}</p>
              <p className="text-2xl font-bold text-black">{stats.activeJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-neo neo-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t("biz.analytics.completed")}</p>
              <p className="text-2xl font-bold text-black">{stats.completedJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
              <Target className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-neo neo-8 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-black">{t("biz.analytics.monthly")}</h3>
          </div>

          {stats.monthlySpending.length === 0 ? (
            <p className="text-gray-600 text-center py-4">{t("common.no_data")}</p>
          ) : (
            <div className="space-y-4">
              {stats.monthlySpending.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-black font-medium">{month.month}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-3 bg-neo neo-inset-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(10, (month.amount / Math.max(...stats.monthlySpending.map(m => m.amount))) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-black w-20 text-right">
                      {formatPrice(month.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-neo neo-8 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-black">{t("biz.analytics.top_categories")}</h3>
          </div>

          {stats.topCategories.length === 0 ? (
            <p className="text-gray-600 text-center py-4">{t("common.no_data")}</p>
          ) : (
            <div className="space-y-4">
              {stats.topCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-neo neo-4 rounded-lg px-3 py-1 text-sm text-black font-medium">
                      {category.category}
                    </div>
                    <span className="text-sm text-gray-600">
                      {category.count} {t('biz.analytics.orders_short')}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-black">
                    {category.count} {t('biz.analytics.orders_short')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neo neo-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t("biz.analytics.avg_invoice")}</p>
              <p className="text-xl font-bold text-black">{formatPrice(stats.averageJobValue)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-neo neo-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t("biz.analytics.team")}</p>
              <p className="text-xl font-bold text-black">{stats.totalEmployees + 1}</p>
              <p className="text-xs text-gray-500">{t("biz.analytics.incl_owner")}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-neo neo-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t("biz.analytics.completion_rate")}</p>
              <p className="text-xl font-bold text-black">
                {stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500">{t("biz.analytics.of_all_jobs")}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-neo neo-4 flex items-center justify-center">
              <Target className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}