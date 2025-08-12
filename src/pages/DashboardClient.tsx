import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Zap, Crown, PlusCircle, Gift, ClipboardList, MessageSquare, CreditCard } from "lucide-react";

const DashboardClient = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [offersByJob, setOffersByJob] = useState<Record<string, any[]>>({});
  const [ratingsByPro, setRatingsByPro] = useState<Record<string, { avg: number; count: number }>>({});
  const [portfolioByPro, setPortfolioByPro] = useState<Record<string, any[]>>({});

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

      // Загрузить офферы по активным новым заказам
      const jobIds = (data || []).filter((j:any)=>j.status==='new').map((j:any)=>j.id);
      if (jobIds.length) {
        const { data: apps } = await (supabase as any)
          .from('job_applications')
          .select('id, job_id, pro_id, price_cents, eta_slot, warranty_days, note, created_at')
          .in('job_id', jobIds)
          .order('created_at', { ascending: false });
        const grouped: Record<string, any[]> = {};
        const proIdsSet = new Set<string>();
        (apps || []).forEach((a:any)=>{ (grouped[a.job_id] ||= []).push(a); proIdsSet.add(a.pro_id); });
        setOffersByJob(grouped);

        const proIds = Array.from(proIdsSet);
        if (proIds.length) {
          const [{ data: stats }, { data: items }] = await Promise.all([
            (supabase as any).from('pro_rating_stats').select('pro_id, avg_score, rating_count').in('pro_id', proIds),
            (supabase as any).from('portfolio_items').select('id, pro_id, image_url, title, created_at').in('pro_id', proIds).order('created_at', { ascending: false }).limit(60)
          ]);
          const ratingsMap: Record<string, { avg: number; count: number }> = {};
          (stats || []).forEach((s:any)=>{ ratingsMap[s.pro_id] = { avg: Number(s.avg_score||0), count: s.rating_count||0 }; });
          setRatingsByPro(ratingsMap);
          const portfolioMap: Record<string, any[]> = {};
          (items || []).forEach((it:any)=>{ (portfolioMap[it.pro_id] ||= []).length < 3 && portfolioMap[it.pro_id].push(it); });
          setPortfolioByPro(portfolioMap);
        }
      } else {
        setOffersByJob({});
        setRatingsByPro({});
        setPortfolioByPro({});
      }

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
          <button className="btn-hero inline-flex items-center" onClick={() => navigate('/job/new')}><PlusCircle className="h-5 w-5 mr-2" aria-hidden />Новый заказ</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-4 border rounded-md min-w-0 animate-fade-in">
            <h3 className="font-medium mb-2">HomeCare Подписка</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-ghost hover-scale whitespace-nowrap text-sm px-3 py-2 flex items-center gap-2" disabled={subLoading} onClick={() => startSubscribe(990)}>
                <ShieldCheck className="h-4 w-4" aria-hidden />
                <span>Basic $9.90</span>
              </button>
              <button className="btn-ghost hover-scale whitespace-nowrap text-sm px-3 py-2 flex items-center gap-2" disabled={subLoading} onClick={() => startSubscribe(1990)}>
                <Zap className="h-4 w-4" aria-hidden />
                <span>Plus $19.90</span>
              </button>
              <button className="btn-ghost hover-scale whitespace-nowrap text-sm px-3 py-2 flex items-center gap-2" disabled={subLoading} onClick={() => startSubscribe(3990)}>
                <Crown className="h-4 w-4" aria-hidden />
                <span>Max $39.90</span>
              </button>
            </div>
            <div className="mt-2">
              <button className="text-xs underline" onClick={async ()=>{ const { paymentProvider } = await import("@/payments/PaymentProvider"); paymentProvider.openCustomerPortal(); }}>Управлять подпиской</button>
            </div>
          </div>
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2 inline-flex items-center"><Gift className="h-4 w-4 mr-2" aria-hidden />Реферальный код</h3>
            <p className="text-sm break-all">{userId}</p>
            <button className="mt-2 text-xs underline" onClick={() => { navigator.clipboard.writeText(String(userId)); toast({ title: 'Скопировано' }); }}>Копировать</button>
          </div>
        </div>

        <h2 className="text-lg font-medium mb-2 inline-flex items-center"><ClipboardList className="h-5 w-5 mr-2" aria-hidden />Мои заказы</h2>
        <ul className="space-y-3">
          {myJobs.length === 0 && <li className="text-sm text-muted-foreground">Пока нет заказов</li>}
          {myJobs.map((j) => (
            <li key={j.id} className="p-3 rounded-md border flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">{j.description}</p>
                <p className="text-xs text-muted-foreground">Статус: {j.status} • {j.scheduled_at ? new Date(j.scheduled_at).toLocaleString() : 'Без срока'}</p>
              </div>
              <div className="flex gap-2">
                {j.status === 'new' && <button className="btn-ghost inline-flex items-center" onClick={() => payEscrow(j)}><CreditCard className="h-4 w-4 mr-1" aria-hidden />Оплатить эскроу</button>}
                {j.pro_id && <button className="btn-ghost inline-flex items-center" onClick={() => openChatForJob(j)}><MessageSquare className="h-4 w-4 mr-1" aria-hidden />Чат</button>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default DashboardClient;
