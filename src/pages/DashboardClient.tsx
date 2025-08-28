import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, DollarSign, Star, Plus, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { SmartText } from "@/i18n/SmartText";

interface Job {
  id: string;
  description: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  pro_id: string | null;
  client_id: string;
}

interface Category {
  id: string;
  key: string;
  label_ru: string;
  label_ro: string;
}

export default function DashboardClient() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatPrice, loading: currencyLoading } = useCurrency();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('DashboardClient: Starting loadDashboard...');
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    console.log('DashboardClient: loadDashboard started');
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        navigate("/auth");
        return;
      }

      // Ensure user has at least client role
      const { ensureUserRoles } = await import("@/lib/userRoles");
      const roleResult = await ensureUserRoles(session.session.user.id);
      
      if (!roleResult.success) {
        toast({ 
          title: "Ошибка доступа", 
          description: roleResult.error || "Не удалось загрузить роли пользователя", 
          variant: "destructive" 
        });
        navigate("/");
        return;
      }

      // Load user's jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, description, status, scheduled_at, created_at, budget_min_cents, budget_max_cents, pro_id, client_id")
        .eq("client_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("label_ru", { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive"
      });
    } finally {
      
      console.log('DashboardClient: Loading complete, setting loading to false');
      setLoading(false);
    }
  };

  const formatJobPrice = (job: Job) => {
    if (job.budget_min_cents && job.budget_max_cents) {
      return `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`;
    } else if (job.budget_min_cents) {
      return `от ${formatPrice(job.budget_min_cents)}`;
    } else if (job.budget_max_cents) {
      return `до ${formatPrice(job.budget_max_cents)}`;
    }
    return 'Договорная';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Новый</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Принят</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">В работе</Badge>;
      case 'done':
        return <Badge variant="outline" className="text-green-600 border-green-600">Завершен</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || currencyLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Личный кабинет
            </h1>
            <p className="text-muted-foreground">
              Управляйте заказами и отслеживайте прогресс
            </p>
          </div>
          <Button onClick={() => navigate("/job/new")} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Новый заказ
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">В работе</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobs.filter(job => job.status === 'in_progress').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Завершено</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobs.filter(job => job.status === 'done').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Мои заказы</CardTitle>
            <CardDescription>
              Последние заказы и их статус
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">У вас пока нет заказов</p>
                <Button onClick={() => navigate("/job/new")}>
                  Создать первый заказ
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">{job.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                        {job.scheduled_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(job.scheduled_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatJobPrice(job)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      {job.pro_id && (
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Чат
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {jobs.length > 5 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" onClick={() => navigate("/jobs")}>
                      Показать все заказы
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}