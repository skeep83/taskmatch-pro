import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const JobNew = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Array<{ id: string; key: string; label_ru?: string; label_ro?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await (supabase as any).from("categories").select("id,key,label_ru,label_ro").order("key");
        if (error) throw error;
        setCategories(data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category_id = String(fd.get("category_id") || "");
    const description = String(fd.get("description") || "");
    const budget_min = Number(fd.get("budget_min") || 0);
    const budget_max = Number(fd.get("budget_max") || 0);
    const date = String(fd.get("date") || "");
    const time = String(fd.get("time") || "");

    if (!category_id || !description) {
      toast({ title: "Проверьте поля", description: "Категория и описание обязательны", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const userId = s.session?.user?.id;
      if (!userId) {
        toast({ title: "Требуется вход", description: "Пожалуйста, войдите" , variant: "destructive"});
        navigate("/auth");
        return;
      }
      const scheduled_at = date && time ? new Date(`${date}T${time}:00Z`).toISOString() : null;
      const { error } = await (supabase as any)
        .from("jobs")
        .insert({
          client_id: userId,
          category_id,
          title: null,
          description,
          budget_min_cents: isFinite(budget_min) ? Math.round(budget_min * 100) : null,
          budget_max_cents: isFinite(budget_max) ? Math.round(budget_max * 100) : null,
          scheduled_at,
        });
      if (error) throw error;
      toast({ title: "Заказ создан", description: "Мы уведомим специалистов" });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Ошибка", description: err?.message || "Не удалось создать заказ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = useMemo(() => categories.map(c => (
    <option key={c.id} value={c.id}>{c.label_ru || c.key}</option>
  )), [categories]);

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Инстант‑бронирование`} description="Создать заказ" canonical="/job/new" />
      <section className="max-w-3xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-6">Инстант‑бронирование</h1>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1">Категория</label>
            <select name="category_id" className="w-full border rounded-md px-3 py-2 bg-background" required>
              <option value="" disabled selected>Выберите категорию</option>
              {categoryOptions}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Описание</label>
            <textarea name="description" className="w-full border rounded-md px-3 py-2 bg-background" rows={4} placeholder="Кратко опишите задачу" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Бюджет, мин (₽)</label>
              <input name="budget_min" type="number" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm mb-1">Бюджет, макс (₽)</label>
              <input name="budget_max" type="number" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Дата</label>
              <input name="date" type="date" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm mb-1">Время</label>
              <input name="time" type="time" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Отмена</button>
            <button type="submit" className="btn-hero" disabled={loading}>{loading ? 'Создаем…' : 'Создать заказ'}</button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default JobNew;
