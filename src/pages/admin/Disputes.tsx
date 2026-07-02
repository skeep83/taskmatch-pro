import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, Clock, CheckCircle, Eye,
  Scale, Gavel, RefreshCw, TrendingDown
} from "lucide-react";

export default function AdminDisputes() {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {

      const { data: disputesData, error } = await supabase
        .from('dispute_cases')
        .select('id, job_id, claimant, status, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDisputes(disputesData || []);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки споров",
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
        <Seo title="ServiceHub — Управление спорами" description="Админ-панель управления спорами" canonical="/admin/disputes" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: "destructive",
      in_review: "secondary",
      resolved: "default",
      closed: "outline"
    };

    const labels = {
      open: "Открыт",
      in_review: "На рассмотрении",
      resolved: "Разрешен",
      closed: "Закрыт"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalDisputes = disputes.length;
  const openDisputes = disputes.filter(d => d.status === 'open').length;
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <Seo title="ServiceHub — Управление спорами" description="Админ-панель управления спорами" canonical="/admin/disputes" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Управление спорами
          </h1>
          <p className="text-muted-foreground mt-1">
            Рассмотрение и разрешение споров между клиентами и специалистами
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDisputes}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего споров</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDisputes}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-3 w-3 mr-1" />
              -5% за месяц
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Открытые</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openDisputes}</div>
            <p className="text-xs text-muted-foreground">Требуют рассмотрения</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Разрешены</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedDisputes}</div>
            <p className="text-xs text-muted-foreground">Успешно закрыты</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Споры ({disputes.length})</CardTitle>
          <CardDescription>
            Управление спорными ситуациями
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID спора</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell className="font-mono text-sm">
                    #{dispute.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {dispute.job_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(dispute.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {dispute.status === 'open' && (
                        <Button variant="ghost" size="sm">
                          <Gavel className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
