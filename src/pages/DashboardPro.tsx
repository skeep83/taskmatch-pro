import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DashboardPro = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nearbyJobs, setNearbyJobs] = useState<any[]>([]);
  const [myActiveJobs, setMyActiveJobs] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [proCatIds, setProCatIds] = useState<string[]>([]);
  const [showOfferFor, setShowOfferFor] = useState<Record<string, boolean>>({});
  const [offerDrafts, setOfferDrafts] = useState<Record<string, { price: string; eta: string; warranty: string; note: string }>>({});
  const [existingApps, setExistingApps] = useState<Record<string, any>>({});

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
      const { data: roles, error } = await supabase.from("user_roles").select("role");
      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
        navigate("/");
        return;
      }
      const hasPro = (roles || []).some((r: any) => r.role === "pro");
      if (!hasPro) {
        toast({ title: "Нет доступа", description: "Активируйте роль PRO на странице 'Стать специалистом'", variant: "destructive" });
        navigate("/pro");
        return;
      }
      // Загрузить категории специалиста
      const { data: proCats } = await (supabase as any)
        .from('pro_categories')
        .select('category_id')
        .eq('user_id', uid);
      const catIds = (proCats || []).map((c: any) => c.category_id);
      setProCatIds(catIds);

      // Заказы по подходящим категориям (без назначенного исполнителя)
      let openJobs: any[] = [];
      if (catIds.length > 0) {
        const { data } = await (supabase as any)
          .from("jobs")
          .select("id, description, budget_min_cents, budget_max_cents, scheduled_at, created_at, category_id")
          .eq("status", "new")
          .is("pro_id", null)
          .in('category_id', catIds)
          .order("created_at", { ascending: false })
          .limit(30);
        openJobs = data || [];
      }
      setNearbyJobs(openJobs);

      // Оферты, уже отправленные этим исполнителем по видимым заказам
      const jobIds = openJobs.map(j => j.id);
      if (jobIds.length) {
        const { data: apps } = await (supabase as any)
          .from('job_applications')
          .select('id, job_id, price_cents, eta_slot, warranty_days, note, created_at')
          .eq('pro_id', uid)
          .in('job_id', jobIds);
        const map: Record<string, any> = {};
        (apps || []).forEach((a: any) => { map[a.job_id] = a; });
        setExistingApps(map);
      } else {
        setExistingApps({});
      }

      // Load my active jobs
      const { data: active } = await (supabase as any)
        .from("jobs")
        .select("id, description, status, scheduled_at, created_at")
        .eq("pro_id", uid)
        .in("status", ["accepted", "in_progress"]) // @ts-ignore
        .order("created_at", { ascending: false })
        .limit(20);
      setMyActiveJobs(active || []);

      // Wallet balance
      const { data: wallet } = await (supabase as any)
        .from('wallets')
        .select('balance_cents')
        .eq('pro_id', uid)
        .maybeSingle();
      setWalletBalance(wallet?.balance_cents || 0);

      // Ratings
      const { data: ratings } = await (supabase as any)
        .from('ratings')
        .select('score')
        .eq('to_user_id', uid)
        .limit(200);
      const scores = (ratings || []).map((r: any) => r.score as number);
      const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
      setRatingAvg(avg);
      setRatingCount(scores.length);
      setLoading(false);
    })();
  }, [navigate, toast]);

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-5xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  const openChatForJob = async (jobId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      if (!userId) return;
      const { data: job, error: jerr } = await (supabase as any)
        .from("jobs").select("id, client_id").eq("id", jobId).maybeSingle();
      if (jerr) throw jerr;
      const clientId = job?.client_id;
      if (!clientId) throw new Error("Клиент не найден");
      const { data: existing } = await (supabase as any)
        .from("chats")
        .select("id").eq("job_id", jobId).eq("professional_id", userId).eq("client_id", clientId).maybeSingle();
      let chatId = existing?.id;
      if (!chatId) {
        const { data: created, error: cerr } = await (supabase as any)
          .from("chats")
          .insert({ job_id: jobId, client_id: clientId, professional_id: userId })
          .select("id").single();
        if (cerr) throw cerr;
        chatId = created.id;
      }
      window.location.href = `/messages/${chatId}`;
    } catch (e: any) {
      console.error(e);
      toast({ title: "Не удалось открыть чат", description: e?.message, variant: "destructive" });
    }
  };

  const acceptJob = async (jobId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      if (!userId) return;
      const { error } = await (supabase as any)
        .from("jobs")
        .update({ pro_id: userId, status: "accepted" })
        .eq("id", jobId)
        .eq("status", "new")
        .is("pro_id", null);
      if (error) throw error;
      toast({ title: "Заказ принят" });
      // Refresh lists
      const { data: openJobs } = await (supabase as any)
        .from("jobs")
        .select("id, description, budget_min_cents, budget_max_cents, scheduled_at, created_at")
        .eq("status", "new").is("pro_id", null).order("created_at", { ascending: false }).limit(20);
      setNearbyJobs(openJobs || []);
      const { data: active } = await (supabase as any)
        .from("jobs")
        .select("id, description, status, scheduled_at, created_at")
        .eq("pro_id", userId)
        .in("status", ["accepted", "in_progress"]).order("created_at", { ascending: false }).limit(20);
      setMyActiveJobs(active || []);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Не удалось принять", description: e?.message, variant: "destructive" });
    }
  };


  const toggleOffer = (jobId: string) => {
    setShowOfferFor((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const sendOffer = async (jobId: string) => {
    try {
      if (!userId) return;
      const draft = offerDrafts[jobId] || { price: '', eta: '', warranty: '', note: '' };
      const priceNum = Math.round(Number(draft.price) * 100);
      if (!priceNum || priceNum <= 0) {
        toast({ title: 'Укажите цену', variant: 'destructive' });
        return;
      }
      const { supabase } = await import('@/integrations/supabase/client');
      const payload: any = {
        job_id: jobId,
        pro_id: userId,
        price_cents: priceNum,
      };
      if (draft.eta) payload.eta_slot = draft.eta;
      if (draft.warranty) payload.warranty_days = Number(draft.warranty) || null;
      if (draft.note) payload.note = draft.note;
      const { data, error } = await (supabase as any)
        .from('job_applications')
        .upsert(payload, { onConflict: 'job_id,pro_id' })
        .select('id, job_id, price_cents, eta_slot, warranty_days, note, created_at')
        .maybeSingle();
      if (error) throw error;
      setExistingApps((prev) => ({ ...prev, [jobId]: data }));
      setShowOfferFor((p) => ({ ...p, [jobId]: false }));
      toast({ title: 'Оффер отправлен' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const updateDraft = (jobId: string, field: 'price'|'eta'|'warranty'|'note', value: string) => {
    setOfferDrafts((prev) => ({
      ...prev,
      [jobId]: { price: '', eta: '', warranty: '', note: '', ...(prev[jobId] || {}), [field]: value }
    }));
  };

  const startJob = async (jobId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any)
        .from('jobs')
        .update({ status: 'in_progress', start_confirmed: true })
        .eq('id', jobId)
        .eq('status', 'accepted');
      if (error) throw error;
      toast({ title: 'Старт подтвержден' });
      setMyActiveJobs((prev) => prev.map(j => j.id===jobId ? { ...j, status: 'in_progress' } : j));
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  // 
  const finishJob = async (jobId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any)
        .from('jobs')
        .update({ status: 'done', end_confirmed: true })
        .eq('id', jobId)
        .eq('status', 'in_progress');
      if (error) throw error;
      toast({ title: 'Завершение подтверждено' });
      setMyActiveJobs((prev) => prev.map(j => j.id===jobId ? { ...j, status: 'done' } : j));
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const requestPayout = async () => {
    try {
      if (!userId) return;
      const amountStr = prompt('Сумма к выплате, $') || '';
      const amount = Math.round(Number(amountStr) * 100);
      if (!amount || amount <= 0) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from('payout_requests').insert({ pro_id: userId, amount_cents: amount });
      if (error) throw error;
      toast({ title: 'Запрос на выплату создан' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Кабинет исполнителя`} description="Pro dashboard" canonical="/pro/dashboard" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Кабинет исполнителя</h1>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
          <div className="text-sm flex flex-wrap items-center gap-3">
            <span className="text-success text-lg font-semibold">Баланс: ${(walletBalance/100).toFixed(2)} $</span>
            <span className="text-success text-lg font-semibold">Рейтинг: {ratingAvg ? ratingAvg.toFixed(1) : '—'}{ratingCount ? ` (${ratingCount})` : ''}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-ghost text-sm" onClick={()=>navigate('/pro/profile')}>Профиль</button>
            <button className="btn-ghost text-sm" onClick={()=>navigate('/pro/schedule')}>Расписание</button>
            <button className="btn-ghost text-sm" onClick={()=>navigate('/portfolio')}>Портфолио</button>
            <button className="btn-ghost text-sm" onClick={()=>navigate('/tenders')}>Тендеры</button>
            <button className="btn-ghost text-sm" onClick={requestPayout}>Запросить выплату</button>
            <button className="btn-ghost text-sm" onClick={()=>navigate('/kyc')}>KYC</button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium mb-2">Доступные заказы</h2>
            <ul className="space-y-3">
              {nearbyJobs.length === 0 && <li className="text-sm text-muted-foreground">Нет доступных заказов</li>}
              {nearbyJobs.map((j) => (
                <li key={j.id} className="p-3 rounded-md border">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm">{j.description}</p>
                      <p className="text-xs text-muted-foreground">{j.scheduled_at ? new Date(j.scheduled_at).toLocaleString() : 'Без срока'}</p>
                      {existingApps[j.id] && (
                        <p className="text-xs text-success mt-1">Ваш оффер: ${(existingApps[j.id].price_cents/100).toFixed(2)} $</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => toggleOffer(j.id)}>{showOfferFor[j.id] ? 'Скрыть' : 'Офер'}</button>
                      <button className="btn-ghost" onClick={() => acceptJob(j.id)}>Принять</button>
                    </div>
                  </div>
                  {showOfferFor[j.id] && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <input
                        type="number"
                        placeholder="Цена, $"
                        className="input"
                        value={offerDrafts[j.id]?.price || ''}
                        onChange={(e)=>updateDraft(j.id,'price',e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Когда (ETA)"
                        className="input"
                        value={offerDrafts[j.id]?.eta || ''}
                        onChange={(e)=>updateDraft(j.id,'eta',e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Гарантия, дни"
                        className="input"
                        value={offerDrafts[j.id]?.warranty || ''}
                        onChange={(e)=>updateDraft(j.id,'warranty',e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Комментарий"
                        className="input sm:col-span-2"
                        value={offerDrafts[j.id]?.note || ''}
                        onChange={(e)=>updateDraft(j.id,'note',e.target.value)}
                      />
                      <div className="sm:col-span-5">
                        <button className="btn-hero" onClick={()=>sendOffer(j.id)}>Отправить оффер</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-2">Мои активные</h2>
            <ul className="space-y-3">
              {myActiveJobs.length === 0 && <li className="text-sm text-muted-foreground">Пока пусто</li>}
              {myActiveJobs.map((j) => (
                <li key={j.id} className="p-3 rounded-md border flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">{j.description}</p>
                    <p className="text-xs text-muted-foreground">Статус: {j.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => openChatForJob(j.id)}>Чат</button>
                    {j.status === 'accepted' && <button className="btn-ghost" onClick={() => startJob(j.id)}>Старт</button>}
                    {j.status === 'in_progress' && <button className="btn-ghost" onClick={() => finishJob(j.id)}>Завершить</button>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

export default DashboardPro;
