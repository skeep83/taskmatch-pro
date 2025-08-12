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
      // Load jobs available (no pro assigned) — allowed by RLS policy jobs_select_open_for_auth
      const { data: openJobs } = await (supabase as any)
        .from("jobs")
        .select("id, description, budget_min_cents, budget_max_cents, scheduled_at, created_at")
        .eq("status", "new")
        .is("pro_id", null)
        .order("created_at", { ascending: false })
        .limit(20);
      setNearbyJobs(openJobs || []);

      // Load my active jobs
      const { data: active } = await (supabase as any)
        .from("jobs")
        .select("id, description, status, scheduled_at, created_at")
        .eq("pro_id", uid)
        .in("status", ["accepted", "in_progress"]) // @ts-ignore
        .order("created_at", { ascending: false })
        .limit(20);
      setMyActiveJobs(active || []);
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

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Кабинет исполнителя`} description="Pro dashboard" canonical="/pro/dashboard" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Кабинет исполнителя</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium mb-2">Доступные заказы</h2>
            <ul className="space-y-3">
              {nearbyJobs.length === 0 && <li className="text-sm text-muted-foreground">Нет доступных заказов</li>}
              {nearbyJobs.map((j) => (
                <li key={j.id} className="p-3 rounded-md border flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">{j.description}</p>
                    <p className="text-xs text-muted-foreground">{j.scheduled_at ? new Date(j.scheduled_at).toLocaleString() : 'Без срока'}</p>
                  </div>
                  <button className="btn-ghost" onClick={() => acceptJob(j.id)}>Принять</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-2">Мои активные</h2>
            <ul className="space-y-3">
              {myActiveJobs.length === 0 && <li className="text-sm text-muted-foreground">Пока пусто</li>}
              {myActiveJobs.map((j) => (
                <li key={j.id} className="p-3 rounded-md border flex items-center justify_between gap-3">
                  <div>
                    <p className="text-sm">{j.description}</p>
                    <p className="text-xs text-muted-foreground">Статус: {j.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => openChatForJob(j.id)}>Чат</button>
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
