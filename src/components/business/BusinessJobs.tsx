import { useState, useEffect } from "react";
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

  useEffect(() => {
    loadBusinessJobs();
  }, []);

  const loadBusinessJobs = async () => {
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
  };

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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            Загрузка заказов...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Заказы компании
        </CardTitle>
        <Button onClick={() => navigate('/job/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Создать заказ
        </Button>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>У вас пока нет заказов</p>
            <p className="text-sm mb-4">Создайте первый заказ для компании</p>
            <Button onClick={() => navigate('/job/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Создать заказ
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заказ</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Бюджет</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((businessJob) => {
                const job = businessJob.jobs;
                return (
                  <TableRow key={businessJob.id} className="cursor-pointer">
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {job.description}
                        </div>
                        {job.location_address && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {job.location_address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {job.categories?.label_ru || "Не указано"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {job.budget_min_cents && job.budget_max_cents ? (
                          <span>
                            {formatPrice(job.budget_min_cents)} - {formatPrice(job.budget_max_cents)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">По договоренности</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {job.scheduled_at ? 
                          new Date(job.scheduled_at).toLocaleDateString() :
                          new Date(job.created_at).toLocaleDateString()
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}