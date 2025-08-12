import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Pro = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleBecomePro = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        toast({ title: "Требуется вход", description: "Войдите, чтобы продолжить", variant: "destructive" });
        navigate("/auth");
        return;
      }
      // Check if role already exists
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (rolesErr) throw rolesErr;
      const hasPro = (roles || []).some((r: any) => r.role === "pro");
      if (!hasPro) {
        const { error: insertErr } = await supabase.from("user_roles").insert({ user_id: userId, role: "pro" });
        if (insertErr) throw insertErr;
      }
      toast({ title: "Готово", description: "Роль PRO активирована" });
      navigate("/pro/dashboard");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка", description: e?.message || "Не удалось назначить роль", variant: "destructive" });
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Pro`} description="Become a professional" canonical="/pro" />
      <section className="max-w-3xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Стать специалистом</h1>
        <p className="text-muted-foreground mb-6">Присоединяйтесь к ServiceHub и получайте стабильный поток заказов, мгновенные выплаты и рост рейтинга.</p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>Подтвердите профиль и пройдите KYC</li>
          <li>Укажите категории, радиус работы и прайсинг</li>
          <li>Получайте заявки и мгновенные выплаты</li>
        </ul>
        <div className="mt-6">
          <button className="btn-hero" onClick={handleBecomePro}>Начать</button>
        </div>
      </section>
    </main>
  );
};

export default Pro;
