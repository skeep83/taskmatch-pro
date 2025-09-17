import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  topCategories: Array<{ category: string; count: number; amount: number }>;
}

export function BusinessAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadBusinessAnalytics();
  }, []);

  const loadBusinessAnalytics = async () => {
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

      // Calculate statistics
      const jobs = jobsData || [];
      const totalJobs = jobs.length;
      const activeJobs = jobs.filter(j => j.jobs.status === 'in_progress' || j.jobs.status === 'accepted').length;
      const completedJobs = jobs.filter(j => j.jobs.status === 'done').length;
      
      // Calculate total spent (using average of min/max budget for estimation)
      const totalSpent = jobs.reduce((sum, j) => {
        const job = j.jobs;
        if (job.budget_min_cents && job.budget_max_cents) {
          return sum + (job.budget_min_cents + job.budget_max_cents) / 2;
        }
        return sum;
      }, 0);

      const averageJobValue = totalJobs > 0 ? totalSpent / totalJobs : 0;

      // Group by categories
      const categoryStats = jobs.reduce((acc, j) => {
        const category = j.jobs.categories?.label_ru || 'Другое';
        if (!acc[category]) {
          acc[category] = { count: 0, amount: 0 };
        }
        acc[category].count++;
        
        const job = j.jobs;
        if (job.budget_min_cents && job.budget_max_cents) {
          acc[category].amount += (job.budget_min_cents + job.budget_max_cents) / 2;
        }
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      const topCategories = Object.entries(categoryStats)
        .map(([category, data]) => ({ 
          category, 
          count: (data as { count: number; amount: number }).count, 
          amount: (data as { count: number; amount: number }).amount 
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Monthly spending (last 6 months)
      const monthlySpending = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
        
        const monthJobs = jobs.filter(j => j.jobs.created_at.startsWith(monthKey));
        const monthAmount = monthJobs.reduce((sum, j) => {
          const job = j.jobs;
          if (job.budget_min_cents && job.budget_max_cents) {
            return sum + (job.budget_min_cents + job.budget_max_cents) / 2;
          }
          return sum;
        }, 0);
        
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
        title: "Ошибка",
        description: "Не удалось загрузить аналитику",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            Загрузка аналитики...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Общие расходы</p>
                <p className="text-2xl font-bold">{formatPrice(stats.totalSpent)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего заказов</p>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
              </div>
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Активных</p>
                <p className="text-2xl font-bold">{stats.activeJobs}</p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Завершено</p>
                <p className="text-2xl font-bold">{stats.completedJobs}</p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Расходы по месяцам
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlySpending.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-3">
                {stats.monthlySpending.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{month.month}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ 
                            width: `${Math.max(10, (month.amount / Math.max(...stats.monthlySpending.map(m => m.amount))) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-20 text-right">
                        {formatPrice(month.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Топ категории
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-3">
                {stats.topCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{category.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {category.count} заказ{category.count > 1 ? 'а' : ''}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPrice(category.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Средний чек</p>
                <p className="text-xl font-bold">{formatPrice(stats.averageJobValue)}</p>
              </div>
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Команда</p>
                <p className="text-xl font-bold">{stats.totalEmployees + 1}</p>
                <p className="text-xs text-muted-foreground">включая владельца</p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Успешность</p>
                <p className="text-xl font-bold">
                  {stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">завершенных заказов</p>
              </div>
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}