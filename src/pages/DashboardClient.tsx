import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { FloatingCard } from "@/components/ui/floating-card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ShieldCheck, Zap, Crown, PlusCircle, Gift, ClipboardList, MessageSquare, 
  CreditCard, Star, Clock, MapPin, Video, Wallet, TrendingUp, Award,
  Home, Calendar, Settings, Bell
} from "lucide-react";
import clientDashboard from "@/assets/client-dashboard.jpg";
import subscriptionPlans from "@/assets/subscription-plans.jpg";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardClient = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [offersByJob, setOffersByJob] = useState<Record<string, any[]>>({});
  const [ratingsByPro, setRatingsByPro] = useState<Record<string, { avg: number; count: number }>>({});
  const [portfolioByPro, setPortfolioByPro] = useState<Record<string, any[]>>({});
  const [ratedByMe, setRatedByMe] = useState<Record<string, boolean>>({});
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { score: string; comment: string }>>({});
  const [addresses, setAddresses] = useState<any[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('none');

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
      
      // Load jobs, offers, ratings, and portfolio data
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

      // Отметим, что уже оценено клиентом (по завершённым заказам)
      const doneIds = (data || []).filter((j:any)=>j.status==='done').map((j:any)=>j.id);
      if (doneIds.length) {
        const { data: myRatings } = await (supabase as any)
          .from('ratings')
          .select('job_id')
          .eq('from_user_id', uid)
          .in('job_id', doneIds);
        const ratedMap: Record<string, boolean> = {};
        (myRatings || []).forEach((r:any)=>{ ratedMap[r.job_id] = true; });
        setRatedByMe(ratedMap);
      } else {
        setRatedByMe({});
      }

      setLoading(false);
      
      // Add delay for smooth content appearance  
      setTimeout(() => {
        setContentLoaded(true);
      }, 100);
    })();
  }, [navigate, toast]);

  // Show loading skeleton on first load
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Seo title="Личный кабинет" description="Управляйте заказами и отслеживайте прогресс" />
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header skeleton */}
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-80 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      if (!job.pro_id) return toast({ title: 'Чат недоступен', description: 'Специалист ещё не назначен' });
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

  const updateRatingDraft = (jobId: string, field: 'score'|'comment', value: string) => {
    setRatingDrafts((prev) => ({ ...prev, [jobId]: { score: '', comment: '', ...(prev[jobId]||{}), [field]: value } }));
  };

  const submitRating = async (jobId: string, toUserId: string) => {
    try {
      if (!userId) return navigate('/auth');
      const draft = ratingDrafts[jobId] || { score: '', comment: '' };
      const score = Number(draft.score);
      if (!score || score < 1 || score > 5) {
        toast({ title: 'Укажите оценку 1-5', variant: 'destructive' });
        return;
      }
      const { supabase } = await import('@\/integrations\/supabase\/client');
      const { error } = await (supabase as any)
        .from('ratings')
        .insert({ job_id: jobId, from_user_id: userId, to_user_id: toUserId, score, comment: draft.comment || null });
      if (error) throw error;
      setRatedByMe((prev)=>({ ...prev, [jobId]: true }));
      toast({ title: 'Спасибо за отзыв!' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${clientDashboard})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      
      <Seo title={`${t('app.name')} — Личный кабинет`} description="Client dashboard" canonical="/dashboard" />
      
      <motion.div 
        className="container mx-auto py-8 px-6 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: contentLoaded ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: contentLoaded ? 1 : 0, y: contentLoaded ? 0 : 20 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: contentLoaded ? 1 : 0, x: contentLoaded ? 0 : -20 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h1 className="text-4xl lg:text-5xl font-display font-bold text-gradient mb-2">
              Добро пожаловать!
            </h1>
            <p className="text-xl text-muted-foreground">
              Управляйте своими заказами и подпиской
            </p>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-4" 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: contentLoaded ? 1 : 0, x: contentLoaded ? 0 : 20 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Link to="/job/new" className="btn-hero flex items-center gap-2 animate-pulse-glow">
              <AnimatedIcon icon={PlusCircle} size={20} />
              Новый заказ
            </Link>
            <button className="btn-ghost flex items-center gap-2">
              <AnimatedIcon icon={Bell} size={20} />
              Уведомления
            </button>
          </motion.div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: contentLoaded ? 1 : 0, y: contentLoaded ? 0 : 30 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <FloatingCard className="p-6 text-center" delay={100} hover glow>
            <AnimatedIcon icon={ClipboardList} size={32} className="text-primary mb-4" />
            <div className="text-2xl font-bold text-primary mb-1">{myJobs.length}</div>
            <div className="text-sm text-muted-foreground">Всего заказов</div>
          </FloatingCard>
          
          <FloatingCard className="p-6 text-center" delay={200} hover glow>
            <AnimatedIcon icon={Clock} size={32} className="text-accent mb-4" />
            <div className="text-2xl font-bold text-accent mb-1">
              {myJobs.filter(j => j.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">В работе</div>
          </FloatingCard>
          
          <FloatingCard className="p-6 text-center" delay={300} hover glow>
            <AnimatedIcon icon={Award} size={32} className="text-success mb-4" />
            <div className="text-2xl font-bold text-success mb-1">
              {myJobs.filter(j => j.status === 'done').length}
            </div>
            <div className="text-sm text-muted-foreground">Завершено</div>
          </FloatingCard>
          
          <FloatingCard className="p-6 text-center" delay={400} hover glow>
            <AnimatedIcon icon={Crown} size={32} className="text-amber-500 mb-4" />
            <div className="text-2xl font-bold text-amber-500 mb-1">{subscriptionStatus}</div>
            <div className="text-sm text-muted-foreground">Подписка</div>
          </FloatingCard>
        </motion.div>

        <motion.div 
          className="grid lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: contentLoaded ? 1 : 0, y: contentLoaded ? 0 : 40 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* HomeCare Subscription */}
            <FloatingCard className="p-8" delay={100} hover>
              <div className="flex items-center gap-3 mb-6">
                <AnimatedIcon icon={Crown} size={28} className="text-primary" />
                <h2 className="text-2xl font-display font-bold">HomeCare Подписка</h2>
              </div>
              
              <div 
                className="relative rounded-2xl p-6 mb-6 overflow-hidden"
                style={{ backgroundImage: `url(${subscriptionPlans})`, backgroundSize: 'cover' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/90" />
                <div className="relative text-white">
                  <h3 className="text-xl font-bold mb-2">Выберите план</h3>
                  <p className="opacity-90">Получите приоритетное обслуживание и гарантии</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FloatingCard className="p-6 text-center hover:scale-105 transition-all" delay={200}>
                  <AnimatedIcon icon={ShieldCheck} size={24} className="text-primary mb-3" />
                  <h4 className="font-semibold mb-2">Basic</h4>
                  <div className="text-2xl font-bold text-primary mb-2">$9.90</div>
                  <div className="text-sm text-muted-foreground mb-4">в месяц</div>
                  <button 
                    className="btn-ghost w-full text-sm" 
                    disabled={subLoading} 
                    onClick={() => startSubscribe(990)}
                  >
                    Выбрать
                  </button>
                </FloatingCard>

                <FloatingCard className="p-6 text-center hover:scale-105 transition-all border-primary" delay={300}>
                  <AnimatedIcon icon={Zap} size={24} className="text-accent mb-3" />
                  <h4 className="font-semibold mb-2">Plus</h4>
                  <div className="text-2xl font-bold text-accent mb-2">$19.90</div>
                  <div className="text-sm text-muted-foreground mb-4">в месяц</div>
                  <button 
                    className="btn-hero w-full text-sm animate-pulse-glow" 
                    disabled={subLoading} 
                    onClick={() => startSubscribe(1990)}
                  >
                    Выбрать
                  </button>
                </FloatingCard>

                <FloatingCard className="p-6 text-center hover:scale-105 transition-all" delay={400}>
                  <AnimatedIcon icon={Crown} size={24} className="text-amber-500 mb-3" />
                  <h4 className="font-semibold mb-2">Max</h4>
                  <div className="text-2xl font-bold text-amber-500 mb-2">$39.90</div>
                  <div className="text-sm text-muted-foreground mb-4">в месяц</div>
                  <button 
                    className="btn-ghost w-full text-sm" 
                    disabled={subLoading} 
                    onClick={() => startSubscribe(3990)}
                  >
                    Выбрать
                  </button>
                </FloatingCard>
              </div>

              <div className="mt-6 text-center">
                <button 
                  className="text-sm underline hover:text-primary transition-colors" 
                  onClick={async ()=>{ 
                    const { paymentProvider } = await import("@/payments/PaymentProvider"); 
                    paymentProvider.openCustomerPortal(); 
                  }}
                >
                  Управлять подпиской
                </button>
              </div>
            </FloatingCard>

            {/* My Jobs */}
            <FloatingCard className="p-8" delay={200} hover>
              <div className="flex items-center gap-3 mb-6">
                <AnimatedIcon icon={ClipboardList} size={28} className="text-primary" />
                <h2 className="text-2xl font-display font-bold">Мои заказы</h2>
              </div>

              <div className="space-y-4">
                {myJobs.length === 0 && (
                  <div className="text-center py-12">
                    <AnimatedIcon icon={ClipboardList} size={48} className="text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Пока нет заказов</h3>
                    <p className="text-muted-foreground mb-6">Создайте свой первый заказ прямо сейчас</p>
                    <Link to="/job/new" className="btn-hero animate-pulse-glow">
                      Создать заказ
                    </Link>
                  </div>
                )}

                {myJobs.map((j, index) => (
                  <FloatingCard key={j.id} className="p-6" delay={index * 50} hover>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{j.description}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <AnimatedIcon icon={Clock} size={14} />
                            {j.status}
                          </div>
                          <div className="flex items-center gap-1">
                            <AnimatedIcon icon={Calendar} size={14} />
                            {j.scheduled_at ? new Date(j.scheduled_at).toLocaleDateString() : 'Без срока'}
                          </div>
                          {j.budget_max_cents && (
                            <div className="flex items-center gap-1">
                              <AnimatedIcon icon={Wallet} size={14} />
                              ${(j.budget_max_cents/100).toFixed(2)}
                            </div>
                          )}
                        </div>
                        
                        {/* Status indicator */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                          j.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          j.status === 'accepted' ? 'bg-amber-100 text-amber-800' :
                          j.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                          j.status === 'done' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            j.status === 'new' ? 'bg-blue-500' :
                            j.status === 'accepted' ? 'bg-amber-500' :
                            j.status === 'in_progress' ? 'bg-purple-500' :
                            j.status === 'done' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`} />
                          {j.status === 'new' ? 'Новый' :
                           j.status === 'accepted' ? 'Принят' :
                           j.status === 'in_progress' ? 'В работе' :
                           j.status === 'done' ? 'Завершен' : j.status}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {j.status === 'new' && (
                          <button 
                            className="btn-hero text-sm flex items-center gap-2" 
                            onClick={() => payEscrow(j)}
                          >
                            <AnimatedIcon icon={CreditCard} size={16} />
                            Оплатить
                          </button>
                        )}
                        {j.pro_id && (
                          <>
                            <button 
                              className="btn-ghost text-sm flex items-center gap-2" 
                              onClick={() => openChatForJob(j)}
                            >
                              <AnimatedIcon icon={MessageSquare} size={16} />
                              Чат
                            </button>
                            <button className="btn-ghost text-sm flex items-center gap-2">
                              <AnimatedIcon icon={Video} size={16} />
                              Видео
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rating section for completed jobs */}
                    {j.status === 'done' && j.pro_id && (
                      <div className="mt-6 pt-6 border-t">
                        {ratedByMe[j.id] ? (
                          <div className="flex items-center gap-2 text-success">
                            <AnimatedIcon icon={Star} size={16} />
                            <span className="text-sm font-medium">Спасибо за ваш отзыв!</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <h5 className="font-medium">Оцените работу специалиста</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                              <select 
                                className="w-full border rounded-xl px-3 py-2 bg-background/80" 
                                value={ratingDrafts[j.id]?.score || ''} 
                                onChange={(e)=>updateRatingDraft(j.id,'score',e.target.value)}
                              >
                                <option value="">Оценка 1-5</option>
                                <option value="5">5 ⭐ Отлично</option>
                                <option value="4">4 ⭐ Хорошо</option>
                                <option value="3">3 ⭐ Средне</option>
                                <option value="2">2 ⭐ Плохо</option>
                                <option value="1">1 ⭐ Ужасно</option>
                              </select>
                              <input 
                                type="text" 
                                placeholder="Ваш комментарий" 
                                className="w-full border rounded-xl px-3 py-2 bg-background/80 sm:col-span-4" 
                                value={ratingDrafts[j.id]?.comment || ''} 
                                onChange={(e)=>updateRatingDraft(j.id,'comment',e.target.value)} 
                              />
                              <button 
                                className="btn-hero" 
                                onClick={()=>submitRating(j.id, j.pro_id)}
                              >
                                Отправить
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </FloatingCard>
                ))}
              </div>
            </FloatingCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Referral Program */}
            <FloatingCard className="p-6" delay={300} hover>
              <div className="flex items-center gap-3 mb-4">
                <AnimatedIcon icon={Gift} size={24} className="text-primary" />
                <h3 className="font-semibold">Реферальная программа</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Приглашайте друзей и получайте бонусы
              </p>
              <div className="p-3 bg-muted/50 rounded-lg mb-4">
                <p className="text-xs text-muted-foreground mb-1">Ваш код:</p>
                <p className="font-mono text-sm break-all">{String(userId).slice(0, 8)}</p>
              </div>
              <button 
                className="btn-ghost w-full text-sm" 
                onClick={() => { 
                  navigator.clipboard.writeText(String(userId)); 
                  toast({ title: 'Код скопирован!' }); 
                }}
              >
                Копировать код
              </button>
            </FloatingCard>

            {/* Quick Actions */}
            <FloatingCard className="p-6" delay={400} hover>
              <h3 className="font-semibold mb-4">Быстрые действия</h3>
              <div className="space-y-3">
                <Link to="/catalog" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <AnimatedIcon icon={Home} size={20} className="text-primary" />
                  <span className="text-sm">Найти специалиста</span>
                </Link>
                <Link to="/messages" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <AnimatedIcon icon={MessageSquare} size={20} className="text-primary" />
                  <span className="text-sm">Сообщения</span>
                </Link>
                <Link to="/tenders" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <AnimatedIcon icon={TrendingUp} size={20} className="text-primary" />
                  <span className="text-sm">Тендеры</span>
                </Link>
                <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors w-full text-left">
                  <AnimatedIcon icon={Settings} size={20} className="text-primary" />
                  <span className="text-sm">Настройки</span>
                </button>
              </div>
            </FloatingCard>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
};

export default DashboardClient;
