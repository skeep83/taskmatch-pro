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
      <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"></div>
          <span className="ml-3 text-black">Загрузка аналитики...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-black">Аналитика бизнеса</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Общие расходы</p>
              <p className="text-2xl font-bold text-black">{formatPrice(stats.totalSpent)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Всего заказов</p>
              <p className="text-2xl font-bold text-black">{stats.totalJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Активных</p>
              <p className="text-2xl font-bold text-black">{stats.activeJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Завершено</p>
              <p className="text-2xl font-bold text-black">{stats.completedJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <Target className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-black">Расходы по месяцам</h3>
          </div>
          
          {stats.monthlySpending.length === 0 ? (
            <p className="text-gray-600 text-center py-4">Нет данных</p>
          ) : (
            <div className="space-y-4">
              {stats.monthlySpending.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-black font-medium">{month.month}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-3 bg-[#E5E7EB] shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] rounded-full overflow-hidden">
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

        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-black">Топ категории</h3>
          </div>
          
          {stats.topCategories.length === 0 ? (
            <p className="text-gray-600 text-center py-4">Нет данных</p>
          ) : (
            <div className="space-y-4">
              {stats.topCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-lg px-3 py-1 text-sm text-black font-medium">
                      {category.category}
                    </div>
                    <span className="text-sm text-gray-600">
                      {category.count} заказ{category.count > 1 ? 'а' : ''}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-black">
                    {formatPrice(category.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Средний чек</p>
              <p className="text-xl font-bold text-black">{formatPrice(stats.averageJobValue)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Команда</p>
              <p className="text-xl font-bold text-black">{stats.totalEmployees + 1}</p>
              <p className="text-xs text-gray-500">включая владельца</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Успешность</p>
              <p className="text-xl font-bold text-black">
                {stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500">завершенных заказов</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <Target className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}