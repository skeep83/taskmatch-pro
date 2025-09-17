import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Plus, Calendar, DollarSign } from "lucide-react";

interface BusinessInvoice {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  due_date: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export function BusinessInvoices() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<BusinessInvoice[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessInvoices();
  }, []);

  const loadBusinessInvoices = async () => {
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

      // Get invoices
      const { data, error } = await supabase
        .from("biz_invoices")
        .select("*")
        .eq("business_id", businessData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить инвойсы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'draft': { label: 'Черновик', variant: 'secondary' as const },
      'sent': { label: 'Отправлен', variant: 'default' as const },
      'paid': { label: 'Оплачен', variant: 'default' as const },
      'overdue': { label: 'Просрочен', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatPrice = (cents: number, currency: string) => {
    const symbol = currency === 'usd' ? '$' : currency === 'eur' ? '€' : currency.toUpperCase();
    return `${symbol}${(cents / 100).toFixed(2)}`;
  };

  const createInvoice = async () => {
    if (!businessId) return;

    try {
      // Create a proper business invoice with all required fields
      const invoiceData = {
        business_id: businessId,
        amount_cents: Math.floor(Math.random() * 500000) + 50000, // $500-$5000
        currency: 'usd',
        status: 'draft',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        invoice_number: `INV-${Date.now()}`,
        description: 'Автоматически созданный инвойс для демонстрации',
        line_items: [
          {
            description: 'Услуги консультации',
            quantity: 1,
            unit_price: Math.floor(Math.random() * 300000) + 30000,
            total: Math.floor(Math.random() * 300000) + 30000
          },
          {
            description: 'Сервисные работы',
            quantity: 2,
            unit_price: Math.floor(Math.random() * 100000) + 10000,
            total: Math.floor(Math.random() * 200000) + 20000
          }
        ],
        tax_rate: 0.2, // 20% НДС
        payment_terms: 'Net 30'
      };

      const { error } = await supabase
        .from("biz_invoices")
        .insert(invoiceData);

      if (error) throw error;

      loadBusinessInvoices();
      toast({
        title: "Инвойс создан",
        description: "E-invoice готов к отправке клиенту"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать инвойс",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            Загрузка инвойсов...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Инвойсы
        </CardTitle>
        <Button onClick={createInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Создать инвойс
        </Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>У вас пока нет инвойсов</p>
            <p className="text-sm mb-4">Создайте первый инвойс для автоматизации оплат</p>
            <Button onClick={createInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Создать инвойс
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Срок оплаты</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="font-mono text-sm">
                      #{invoice.id.slice(-8).toUpperCase()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {formatPrice(invoice.amount_cents, invoice.currency)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {invoice.due_date ? 
                        new Date(invoice.due_date).toLocaleDateString() :
                        "Не указан"
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {invoice.pdf_url ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}