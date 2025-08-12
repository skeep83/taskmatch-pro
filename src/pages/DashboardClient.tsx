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
        .select("id, description, status, scheduled_at, created_at")
        .eq("client_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);
      setMyJobs(data || []);
      setLoading(false);
    })();
  }, [navigate, toast]);

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-5xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Личный кабинет`} description="Client dashboard" canonical="/dashboard" />
      <section className="max-w-5xl mx-auto card-surface">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Личный кабинет</h1>
          <button className="btn-hero" onClick={() => navigate('/job/new')}>Новый заказ</button>
        </div>
        <h2 className="text-lg font-medium mb-2">Мои заказы</h2>
        <ul className="space-y-3">
          {myJobs.length === 0 && <li className="text-sm text-muted-foreground">Пока нет заказов</li>}
          {myJobs.map((j) => (
            <li key={j.id} className="p-3 rounded-md border">
              <p className="text-sm">{j.description}</p>
              <p className="text-xs text-muted-foreground">Статус: {j.status} • {j.scheduled_at ? new Date(j.scheduled_at).toLocaleString() : 'Без срока'}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default DashboardClient;
