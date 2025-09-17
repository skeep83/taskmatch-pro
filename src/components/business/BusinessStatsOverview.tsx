import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, Briefcase, DollarSign, Calendar, Target } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface BusinessStats {
  totalSpent: number;
  totalJobs: number;
  totalMembers: number;
  activeJobs: number;
  completedJobs: number;
  completionRate: number;
  monthlyGrowth: number;
}

export function BusinessStatsOverview() {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<BusinessStats>({
    totalSpent: 0,
    totalJobs: 0,
    totalMembers: 0,
    activeJobs: 0,
    completedJobs: 0,
    completionRate: 0,
    monthlyGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
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

      // Get business jobs with status
      const { data: jobsData, error: jobsError } = await supabase
        .from("business_jobs")
        .select(`
          *,
          jobs:job_id (
            id,
            status,
            budget_min_cents,
            budget_max_cents,
            created_at
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

      // Calculate statistics
      const jobs = jobsData || [];
      const totalJobs = jobs.length;
      const activeJobs = jobs.filter(j => j.jobs?.status === 'in_progress' || j.jobs?.status === 'accepted').length;
      const completedJobs = jobs.filter(j => j.jobs?.status === 'done').length;
      
      // Calculate total spent (using average of min/max budget for completed jobs)
      const totalSpent = jobs
        .filter(j => j.jobs?.status === 'done')
        .reduce((sum, j) => {
          const job = j.jobs;
          if (job?.budget_min_cents && job?.budget_max_cents) {
            return sum + (job.budget_min_cents + job.budget_max_cents) / 2;
          }
          return sum;
        }, 0);

      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      
      // Calculate monthly growth (last month vs this month)
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
      
      const thisMonthJobs = jobs.filter(j => j.jobs?.created_at?.startsWith(thisMonth)).length;
      const lastMonthJobs = jobs.filter(j => j.jobs?.created_at?.startsWith(lastMonth)).length;
      
      const monthlyGrowth = lastMonthJobs > 0 ? ((thisMonthJobs - lastMonthJobs) / lastMonthJobs) * 100 : 0;

      setStats({
        totalSpent,
        totalJobs,
        totalMembers: membersData?.length || 0,
        activeJobs,
        completedJobs,
        completionRate,
        monthlyGrowth
      });

    } catch (error: any) {
      console.error('Stats loading error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить статистику",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="card-surface">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Общие расходы",
      value: formatPrice(stats.totalSpent),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: stats.monthlyGrowth > 0 ? `+${stats.monthlyGrowth.toFixed(1)}%` : null
    },
    {
      title: "Всего заказов",
      value: stats.totalJobs.toString(),
      icon: Briefcase,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: stats.monthlyGrowth > 0 ? `+${stats.monthlyGrowth.toFixed(1)}%` : null
    },
    {
      title: "Активных заказов",
      value: stats.activeJobs.toString(),
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-100"
    },
    {
      title: "Успешность",
      value: `${stats.completionRate.toFixed(1)}%`,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      subtitle: `${stats.completedJobs} из ${stats.totalJobs} завершено`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="card-surface hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.change && (
                      <span className="text-xs text-green-600 font-medium">
                        {stat.change}
                      </span>
                    )}
                  </div>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}