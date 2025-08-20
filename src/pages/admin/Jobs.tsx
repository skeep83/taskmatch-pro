import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Search, Briefcase, Clock, CheckCircle, AlertTriangle, 
  Eye, Edit, Ban, MapPin, DollarSign, Calendar,
  Filter, Download, RefreshCw, TrendingUp, Users
} from "lucide-react";

export default function AdminJobs() {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select(`
          id, title, description, status, created_at, scheduled_at,
          budget_min_cents, budget_max_cents, location_address,
          client_id, pro_id, category_id
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setJobs(jobsData || []);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки заказов",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Seo title="ServiceHub — Управление заказами" description="Админ-панель управления заказами" canonical="/admin/jobs" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      new: "secondary",
      accepted: "default", 
      in_progress: "default",
      done: "default",
      cancelled: "destructive"
    };
    
    const labels = {
      new: "Новый",
      accepted: "Принят",
      in_progress: "В работе", 
      done: "Выполнен",
      cancelled: "Отменен"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalJobs = jobs.length;
  const newJobs = jobs.filter(j => j.status === 'new').length;
  const activeJobs = jobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length;
  const completedJobs = jobs.filter(j => j.status === 'done').length;

  return (
    <div className="space-y-6">
      <Seo title="ServiceHub — Управление заказами" description="Админ-панель управления заказами" canonical="/admin/jobs" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Управление заказами
          </h1>
          <p className="text-muted-foreground mt-1">
            Мониторинг и управление всеми заказами платформы
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadJobs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">+8% за неделю</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newJobs}</div>
            <p className="text-xs text-muted-foreground">Ожидают исполнителя</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <p className="text-xs text-muted-foreground">Активно выполняются</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершено</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs}</div>
            <p className="text-xs text-muted-foreground">Успешно выполнено</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Заказы ({jobs.length})</CardTitle>
          <CardDescription>
            Управление всеми заказами платформы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заказ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Бюджет</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.slice(0, 20).map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium line-clamp-1">
                        {job.title || 'Без названия'}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {job.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(job.status)}
                  </TableCell>
                  <TableCell>
                    {job.budget_max_cents ? `$${(job.budget_max_cents / 100).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell>
                    {new Date(job.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
