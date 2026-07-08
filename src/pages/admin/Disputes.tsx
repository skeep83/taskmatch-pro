import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, CheckCircle, Eye, Scale, RefreshCw, Loader2, Undo2, HandCoins, Percent,
} from "lucide-react";

interface EvidenceEntry { user_id: string; text: string; files: string[]; at: string }

interface DisputeRow {
  id: string;
  job_id: string;
  claimant: string;
  status: string;
  resolution: string | null;
  refund_cents: number | null;
  evidence: EvidenceEntry[] | null;
  created_at: string;
}

interface JobInfo {
  id: string;
  title: string | null;
  client_id: string;
  pro_id: string | null;
}

interface EscrowInfo { amount_cents: number; fee_cents: number; tax_cents: number; status: string; currency: string }

const fmt = (cents: number, cur = "mdl") => `${(cents / 100).toLocaleString("ru-RU")} ${cur.toUpperCase()}`;

export default function AdminDisputes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [jobs, setJobs] = useState<Record<string, JobInfo>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<DisputeRow | null>(null);
  const [escrow, setEscrow] = useState<EscrowInfo | null>(null);
  const [resolution, setResolution] = useState("");
  const [refundInput, setRefundInput] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dispute_cases")
        .select("id, job_id, claimant, status, resolution, refund_cents, evidence, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data || []) as unknown as DisputeRow[];
      setDisputes(rows);

      const jobIds = [...new Set(rows.map((d) => d.job_id))];
      if (jobIds.length) {
        const { data: jobRows } = await supabase
          .from("jobs")
          .select("id, title, client_id, pro_id")
          .in("id", jobIds);
        const jmap: Record<string, JobInfo> = {};
        (jobRows || []).forEach((j) => { jmap[j.id] = j as JobInfo; });
        setJobs(jmap);

        const userIds = [...new Set((jobRows || []).flatMap((j) => [j.client_id, j.pro_id]).filter(Boolean))] as string[];
        if (userIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name")
            .in("id", userIds);
          const nmap: Record<string, string> = {};
          (profiles || []).forEach((p) => {
            nmap[p.id] = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id.slice(0, 8);
          });
          setNames(nmap);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: "Ошибка загрузки споров", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDisputes(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openDetail = async (d: DisputeRow) => {
    setSelected(d);
    setResolution("");
    setRefundInput("");
    const { data } = await supabase
      .from("escrows")
      .select("amount_cents, fee_cents, tax_cents, status, currency")
      .eq("job_id", d.job_id)
      .maybeSingle();
    setEscrow((data as EscrowInfo) || null);
  };

  const resolve = async (decision: "release" | "refund" | "partial") => {
    if (!selected) return;
    if (!resolution.trim()) {
      toast({ title: "Укажите текст решения", description: "Обе стороны получат его в уведомлении.", variant: "destructive" });
      return;
    }
    const refundCents = decision === "partial" ? Math.round((Number(refundInput) || 0) * 100) : undefined;
    if (decision === "partial" && (!refundCents || refundCents <= 0)) {
      toast({ title: "Укажите сумму возврата клиенту", variant: "destructive" });
      return;
    }
    setResolving(decision);
    try {
      const { data, error } = await supabase.rpc("resolve_dispute", {
        _dispute_id: selected.id,
        _decision: decision,
        _resolution: resolution.trim(),
        _refund_cents: refundCents,
      });
      if (error) throw error;
      const res = data as { success?: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "failed");
      toast({ title: "Спор решён", description: decision === "release" ? "Средства выплачены специалисту." : decision === "refund" ? "Средства возвращены клиенту." : "Частичный возврат выполнен." });
      setSelected(null);
      void loadDisputes();
    } catch (e) {
      toast({ title: "Ошибка", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setResolving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { v: "destructive" | "secondary" | "default" | "outline"; l: string }> = {
      open: { v: "destructive", l: "Открыт" },
      investigating: { v: "secondary", l: "На рассмотрении" },
      resolved: { v: "default", l: "Разрешён" },
      closed: { v: "outline", l: "Закрыт" },
    };
    const m = map[status] || { v: "secondary" as const, l: status };
    return <Badge variant={m.v}>{m.l}</Badge>;
  };

  const openCount = disputes.filter((d) => d.status === "open" || d.status === "investigating").length;
  const resolvedCount = disputes.filter((d) => d.status === "resolved").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Seo title="ServiceHub — Управление спорами" description="Админ-панель управления спорами" canonical="/admin/disputes" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const selectedJob = selected ? jobs[selected.job_id] : null;
  const evidence: EvidenceEntry[] = selected && Array.isArray(selected.evidence) ? selected.evidence : [];
  const canResolve = selected && selected.status !== "resolved" && escrow?.status === "held";

  return (
    <div className="space-y-6">
      <Seo title="ServiceHub — Управление спорами" description="Админ-панель управления спорами" canonical="/admin/disputes" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление спорами</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Изучите доказательства сторон и примите решение — средства эскроу распределятся автоматически.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadDisputes()}>
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
          <CardContent><div className="text-2xl font-bold">{disputes.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Открытые</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
            <p className="text-xs text-muted-foreground">Требуют рассмотрения</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Разрешены</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{resolvedCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Споры ({disputes.length})</CardTitle>
          <CardDescription>Нажмите на спор, чтобы изучить доказательства и вынести решение</CardDescription>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Споров пока нет.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заказ</TableHead>
                  <TableHead>Инициатор</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((d) => {
                  const j = jobs[d.job_id];
                  return (
                    <TableRow key={d.id} className="cursor-pointer" onClick={() => void openDetail(d)}>
                      <TableCell className="max-w-[260px]">
                        <div className="font-medium truncate">{j?.title || d.job_id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground font-mono">#{d.id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {names[d.claimant] || d.claimant.slice(0, 8)}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({j && d.claimant === j.client_id ? "клиент" : "специалист"})
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(d.status)}</TableCell>
                      <TableCell className="text-sm">{new Date(d.created_at).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); void openDetail(d); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Спор по заказу «{selectedJob?.title || "…"}»
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-neo neo-inset-2 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Клиент</div>
                  <div className="font-medium truncate">{selectedJob ? names[selectedJob.client_id] || "—" : "—"}</div>
                </div>
                <div className="rounded-xl bg-neo neo-inset-2 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Специалист</div>
                  <div className="font-medium truncate">{selectedJob?.pro_id ? names[selectedJob.pro_id] || "—" : "—"}</div>
                </div>
              </div>

              {escrow && (
                <div className="rounded-xl bg-neo neo-inset-2 px-3.5 py-2.5 text-sm flex flex-wrap gap-x-5 gap-y-1">
                  <span>В эскроу: <b>{fmt(escrow.amount_cents, escrow.currency)}</b></span>
                  <span className="text-muted-foreground">комиссия {fmt(escrow.fee_cents, escrow.currency)}</span>
                  {escrow.tax_cents > 0 && <span className="text-muted-foreground">налог {fmt(escrow.tax_cents, escrow.currency)}</span>}
                  <span className="text-muted-foreground">статус: {escrow.status}</span>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold mb-2">Доказательства сторон</div>
                {evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет.</p>
                ) : (
                  <div className="space-y-2.5">
                    {evidence.map((ev, i) => {
                      const who = selectedJob && ev.user_id === selectedJob.client_id ? "Клиент" : selectedJob && ev.user_id === selectedJob.pro_id ? "Специалист" : "Админ";
                      return (
                        <div key={i} className="rounded-xl bg-neo neo-inset-2 px-3.5 py-2.5 text-sm">
                          <div className="flex items-baseline justify-between gap-3 mb-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground">{who} · {names[ev.user_id] || ""}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(ev.at).toLocaleString("ru-RU")}</span>
                          </div>
                          {ev.text && <p className="leading-relaxed">{ev.text}</p>}
                          {Array.isArray(ev.files) && ev.files.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {ev.files.map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden neo-2 shrink-0">
                                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selected.status === "resolved" ? (
                <div className="rounded-xl bg-success/10 text-success px-3.5 py-2.5 text-sm">
                  Решение: {selected.resolution || "—"}
                  {selected.refund_cents ? ` · возврат клиенту ${fmt(selected.refund_cents)}` : ""}
                </div>
              ) : canResolve ? (
                <div className="space-y-3 border-t border-foreground/10 pt-4">
                  <div className="text-sm font-semibold">Решение</div>
                  <Textarea
                    rows={2}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Обоснование решения — его получат обе стороны"
                    className="text-sm"
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button size="sm" className="rounded-lg" onClick={() => void resolve("release")} disabled={!!resolving}>
                      {resolving === "release" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <HandCoins className="w-3.5 h-3.5 mr-1" />}
                      Выплатить специалисту
                    </Button>
                    <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => void resolve("refund")} disabled={!!resolving}>
                      {resolving === "refund" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Undo2 className="w-3.5 h-3.5 mr-1" />}
                      Вернуть клиенту
                    </Button>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={refundInput}
                        onChange={(e) => setRefundInput(e.target.value)}
                        placeholder="Возврат, лей"
                        className="w-32 h-9"
                      />
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void resolve("partial")} disabled={!!resolving}>
                        {resolving === "partial" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Percent className="w-3.5 h-3.5 mr-1" />}
                        Частично
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    «Выплатить» — специалист получает сумму за вычетом комиссии. «Вернуть» — клиенту возвращается вся сумма эскроу.
                    «Частично» — указанная сумма клиенту, остаток (минус комиссия) специалисту.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Эскроу по этому заказу не в статусе «held» — решение недоступно.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
