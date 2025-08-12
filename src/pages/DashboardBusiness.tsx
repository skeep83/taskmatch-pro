import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DashboardBusiness = () => {
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
      const hasBiz = (roles || []).some((r: any) => r.role === "business");
      if (!hasBiz) {
        toast({ title: "Нет доступа", description: "Для доступа нужен бизнес-аккаунт", variant: "destructive" });
        navigate("/");
        return;
      }
      setLoading(false);
    })();
  }, [navigate, toast]);

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-5xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Бизнес-кабинет`} description="Business dashboard" canonical="/business/dashboard" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Бизнес-кабинет</h1>
        <p className="text-muted-foreground mb-6">Здесь будут сотрудники, лимиты, счета и отчеты.</p>
      </section>
    </main>
  );
};

export default DashboardBusiness;
