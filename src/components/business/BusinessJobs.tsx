import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Calendar, MapPin, DollarSign, AlertCircle, CheckCircle, PlayCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BusinessJob {
  id: string;
  job_id: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    description: string;
    status: string;
    budget_min_cents: number;
    budget_max_cents: number;
    location_address: string;
    scheduled_at: string;
    created_at: string;
    categories: {
      label_ru: string;
    };
    pro_id: string;
  };
}

export function BusinessJobs() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<BusinessJob[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const loadBusinessJobs = useCallback(async () => {
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
      const { data, error } = await supabase
        .from("business_jobs")
        .select(`
          *,
          jobs:job_id (
            id,
            title,
            description,
            status,
            budget_min_cents,
            budget_max_cents,
            location_address,
            scheduled_at,
            created_at,
            pro_id,
            categories:category_id (
              label_ru
            )
          )
        `)
        .eq("business_id", businessData.id);

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить заказы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadBusinessJobs();
  }, [loadBusinessJobs]);

  useEffect(() => {
    if (!businessId) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadBusinessJobs();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const businessJobsChannel = supabase
      .channel(`business-jobs-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_jobs',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        void loadBusinessJobs();
      })
      .subscribe();

    const jobsChannel = supabase
      .channel(`business-linked-jobs-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
      }, () => {
        void loadBusinessJobs();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(businessJobsChannel);
      void supabase.removeChannel(jobsChannel);
    };
  }, [businessId, loadBusinessJobs]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new': { label: 'Новый', variant: 'default' as const },
      'accepted': { label: 'Принят', variant: 'secondary' as const },
      'in_progress': { label: 'В работе', variant: 'default' as const },
      'done': { label: 'Выполнен', variant: 'default' as const },
      'cancelled': { label: 'Отменен', variant: 'destructive' as const }
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

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const };
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <span>{statusInfo.label}</span>
        {getStatusIcon(status)}
      </Badge>
    );
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"></div>
          <span className="ml-3 text-black">Загрузка заказов...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-black">Заказы компании</h2>
        </div>
        <button
          onClick={() => navigate('/job/new')}
          className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl px-6 py-3 transition-all duration-300 flex items-center gap-2 text-black font-semibold"
        >
          <Plus className="h-4 w-4" />
          Создать заказ
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-black mb-2">У вас пока нет заказов</h3>
          <p className="text-gray-600 mb-6">Создайте первый заказ для компании</p>
          <button
            onClick={() => navigate('/job/new')}
            className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl px-8 py-4 transition-all duration-300 flex items-center gap-2 text-black font-semibold"
          >
            <Plus className="h-4 w-4" />
            Создать заказ
          </button>
        </div>
      ) : (
        <div className="bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl p-6">
          <div className="space-y-4">
            {jobs.map((businessJob) => {
              const job = businessJob.jobs;
              return (
                <div key={businessJob.id} className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-xl p-6 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] transition-all duration-300 cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-black text-lg mb-2">{job.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{job.description}</p>

                      {job.location_address && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <MapPin className="h-4 w-4" />
                          {job.location_address}
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-lg px-3 py-1 text-sm text-black">
                          {job.categories?.label_ru || "Не указано"}
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-black font-semibold mb-2">
                        <DollarSign className="h-4 w-4" />
                        {job.budget_min_cents && job.budget_max_cents ? (
                          <span>{formatPrice(job.budget_min_cents)} - {formatPrice(job.budget_max_cents)}</span>
                        ) : (
                          <span className="text-gray-500">По договоренности</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {job.scheduled_at ?
                          new Date(job.scheduled_at).toLocaleDateString() :
                          new Date(job.created_at).toLocaleDateString()
                        }
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}