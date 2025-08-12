import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DashboardClient = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) {
        toast({ title: "Требуется вход", description: "Пожалуйста, войдите" });
        navigate("/auth");
        return;
      }
      setUserId(uid);
      const { data } = await (supabase as any)
        .from("jobs")
        .select("id, description, status, scheduled_at, created_at, budget_min_cents, budget_max_cents, pro_id, client_id")
        .eq("client_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);
      setMyJobs(data || []);
      setLoading(false);
    })();
  }, [navigate, toast]);

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-5xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  const payEscrow = async (job: any) => {
    try {
      const { paymentProvider } = await import("@/payments/PaymentProvider");
      const amount = job.budget_max_cents || job.budget_min_cents || 5000;
      await paymentProvider.startOneOffPayment({ amountCents: amount, currency: 'usd', name: `Escrow for job ${String(job.id).slice(0,8)}` });
    } catch (e: any) {
      console.error(e);
    }
  };

  const startSubscribe = async (priceCents: number) => {
    try {
      setSubLoading(true);
      const { paymentProvider } = await import("@/payments/PaymentProvider");
      await paymentProvider.startSubscription({ priceCents, interval: 'month' });
    } finally {
      setSubLoading(false);
    }
  };

  const openChatForJob = async (job: any) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) return navigate('/auth');
      if (!job.pro_id) return toast({ title: 'Чат недоступен', description: 'Исполнитель ещё не назначен' });
      const { data: existing } = await (supabase as any)
        .from("chats")
        .select("id").eq("job_id", job.id).eq("client_id", job.client_id).eq("professional_id", job.pro_id).maybeSingle();
      let chatId = existing?.id;
      if (!chatId) {
        const { data: created, error: cerr } = await (supabase as any)
          .from("chats")
          .insert({ job_id: job.id, client_id: job.client_id, professional_id: job.pro_id })
          .select("id").single();
        if (cerr) throw cerr;
        chatId = created.id;
      }
      navigate(`/messages/${chatId}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Личный кабинет`} description="Client dashboard" canonical="/dashboard" />
      <section className="max-w-5xl mx-auto card-surface">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Личный кабинет</h1>
          <button className="btn-hero" onClick={() => navigate('/job/new')}>Новый заказ</button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2">HomeCare Подписка</h3>
            <div className="flex gap-2">
              <button className="btn-ghost" disabled={subLoading} onClick={() => startSubscribe(990)}>
                Basic $9.90
              </button>
              <button className="btn-ghost" disabled={subLoading} onClick={() => startSubscribe(1990)}>
                Plus $19.90
              </button>
              <button className="btn-ghost" disabled={subLoading} onClick={() => startSubscribe(3990)}>
                Max $39.90
              </button>
            </div>
            <div className="mt-2">
              <button className="text-xs underline" onClick={async ()=>{ const { paymentProvider } = await import("@/payments/PaymentProvider"); paymentProvider.openCustomerPortal(); }}>Управлять подпиской</button>
            </div>
          </div>
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2">Реферальный код</h3>
            <p className="text-sm break-all">{userId}</p>
            <button className="mt-2 text-xs underline" onClick={() => { navigator.clipboard.writeText(String(userId)); toast({ title: 'Скопировано' }); }}>Копировать</button>
          </div>
        </div>

        <h2 className="text-lg font-medium mb-2">Мои заказы</h2>
        <ul className="space-y-3">
          {myJobs.length === 0 && <li className="text-sm text-muted-foreground">Пока нет заказов</li>}
          {myJobs.map((j) => (
            <li key={j.id} className="p-3 rounded-md border flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">{j.description}</p>
                <p className="text-xs text-muted-foreground">Статус: {j.status} • {j.scheduled_at ? new Date(j.scheduled_at).toLocaleString() : 'Без срока'}</p>
              </div>
              <div className="flex gap-2">
                {j.status === 'new' && <button className="btn-ghost" onClick={() => payEscrow(j)}>Оплатить эскроу</button>}
                {j.pro_id && <button className="btn-ghost" onClick={() => openChatForJob(j)}>Чат</button>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default DashboardClient;
