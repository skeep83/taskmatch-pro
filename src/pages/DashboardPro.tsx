import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DashboardPro = () => {
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
      setLoading(false);
    })();
  }, [navigate, toast]);

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-5xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Кабинет исполнителя`} description="Pro dashboard" canonical="/pro/dashboard" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Кабинет исполнителя</h1>
        <p className="text-muted-foreground mb-6">Здесь будут заказы поблизости, активные работы, кошелек и заявки на тендеры.</p>
      </section>
    </main>
  );
};

export default DashboardPro;
