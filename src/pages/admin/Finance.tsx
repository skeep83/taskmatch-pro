import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  DollarSign, TrendingUp, Wallet, CreditCard,
  Eye, Check, X, AlertTriangle, Clock, 
  RefreshCw
} from "lucide-react";

export default function AdminFinance() {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [escrows, setEscrows] = useState([]);
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrows')
        .select('id, job_id, amount_cents, status, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (escrowError) throw escrowError;
      setEscrows(escrowData || []);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки финансовых данных",
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
        <Seo title="ServiceHub — Управление финансами" description="Админ-панель управления финансами" canonical="/admin/finance" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const getEscrowStatusBadge = (status: string) => {
    const variants = {
      held: "secondary",
      released: "default",
      refunded: "destructive"
    };
    
    const labels = {
      held: "Удерживается",
      released: "Освобожден",
      refunded: "Возвращен"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalEscrow = escrows.reduce((sum, e) => sum + (e.amount_cents || 0), 0);
  const heldEscrow = escrows.filter(e => e.status === 'held').reduce((sum, e) => sum + (e.amount_cents || 0), 0);

  return (
    <div className="space-y-6">
      <Seo title="ServiceHub — Управление финансами" description="Админ-панель управления финансами" canonical="/admin/finance" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Управление финансами
          </h1>
          <p className="text-muted-foreground mt-1">
            Мониторинг эскроу, выплат и финансовых операций
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadFinanceData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий эскроу</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalEscrow / 100).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% за месяц
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Удерживается</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(heldEscrow / 100).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">В ожидании освобождения</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Управление эскроу ({escrows.length})</CardTitle>
          <CardDescription>
            Мониторинг и управление заблокированными средствами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escrows.map((escrow) => (
                <TableRow key={escrow.id}>
                  <TableCell className="font-mono text-sm">
                    {escrow.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {(escrow.amount_cents / 100).toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getEscrowStatusBadge(escrow.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(escrow.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {escrow.status === 'held' && (
                        <>
                          <Button variant="ghost" size="sm">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
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
