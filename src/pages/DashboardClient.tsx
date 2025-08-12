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

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const userId = s.session?.user?.id;
      if (!userId) {
        toast({ title: "Требуется вход", description: "Пожалуйста, войдите" });
        navigate("/auth");
        return;
      }
      // Client dashboard is available to all authenticated users
      setLoading(false);
    })();
  }, [navigate, toast]);

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-5xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Личный кабинет`} description="Client dashboard" canonical="/dashboard" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Личный кабинет</h1>
        <p className="text-muted-foreground mb-6">Здесь будут ваши заказы, подписки и сообщения.</p>
      </section>
    </main>
  );
};

export default DashboardClient;
