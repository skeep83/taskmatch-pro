import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Plus, Calendar, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [createOpen, setCreateOpen] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newCurrency, setNewCurrency] = useState("usd");
  const [creating, setCreating] = useState(false);

  const loadBusinessInvoices = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    void loadBusinessInvoices();
  }, [loadBusinessInvoices]);

  useEffect(() => {
    if (!businessId) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadBusinessInvoices();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const invoicesChannel = supabase
      .channel(`business-invoices-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'biz_invoices',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        void loadBusinessInvoices();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(invoicesChannel);
    };
  }, [businessId, loadBusinessInvoices]);

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

    const amount = Math.round(parseFloat(newAmount.replace(',', '.')) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Укажите сумму",
        description: "Сумма инвойса должна быть больше нуля",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from("biz_invoices")
        .insert({
          business_id: businessId,
          amount_cents: amount,
          currency: newCurrency,
          status: 'draft',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (error) throw error;

      setCreateOpen(false);
      setNewAmount("");
      loadBusinessInvoices();
      toast({
        title: "Инвойс создан",
        description: "Черновик инвойса создан. Срок оплаты — 30 дней."
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать инвойс",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-neo neo-8 rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 rounded-full bg-neo neo-4"></div>
          <span className="ml-3 text-black">Загрузка инвойсов...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neo neo-8 rounded-2xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-black">Инвойсы</h2>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-neo neo-8 hover:neo-4 active:neo-inset-4 rounded-xl px-6 py-3 transition-all duration-300 flex items-center gap-2 text-black font-semibold"
        >
          <Plus className="h-4 w-4" />
          Создать инвойс
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neo neo-4 flex items-center justify-center">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-black mb-2">У вас пока нет инвойсов</h3>
          <p className="text-gray-600 mb-6">Создайте первый инвойс для автоматизации оплат</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-neo neo-8 hover:neo-4 active:neo-inset-4 rounded-xl px-8 py-4 transition-all duration-300 flex items-center gap-2 text-black font-semibold"
          >
            <Plus className="h-4 w-4" />
            Создать инвойс
          </button>
        </div>
      ) : (
        <div className="bg-neo neo-inset-4 rounded-xl p-6">
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-neo neo-8 rounded-xl p-6 hover:neo-4 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="font-mono text-lg font-semibold text-black">
                        #{invoice.id.slice(-8).toUpperCase()}
                      </span>
                      {getStatusBadge(invoice.status)}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Срок: {invoice.due_date ?
                          new Date(invoice.due_date).toLocaleDateString() :
                          "Не указан"
                        }
                      </div>
                      <div>
                        Создан: {new Date(invoice.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xl font-bold text-black mb-3">
                      <DollarSign className="h-5 w-5" />
                      {formatPrice(invoice.amount_cents, invoice.currency)}
                    </div>
                    <button
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        invoice.pdf_url
                          ? 'bg-neo neo-4 hover:neo-2 active:neo-inset-2'
                          : 'bg-neo neo-inset-2 opacity-50'
                      }`}
                      disabled={!invoice.pdf_url}
                    >
                      <Download className="h-4 w-4 text-primary" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый инвойс</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invoice_amount">Сумма</Label>
              <Input
                id="invoice_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Например 1500.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_currency">Валюта</Label>
              <select
                id="invoice_currency"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
              >
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="mdl">MDL</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={createInvoice} disabled={creating}>
              {creating ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}