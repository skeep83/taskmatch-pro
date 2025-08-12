import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const TendersList = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase as any)
        .from('tenders')
        .select('id, title, description, status, created_at, window_to')
        .eq('status','open')
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data || []);
    })();
  }, []);

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Тендеры`} description="Список открытых тендеров" canonical="/tenders" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Открытые тендеры</h1>
        <ul className="space-y-3">
          {items.length===0 && <li className="text-sm text-muted-foreground">Нет открытых тендеров</li>}
          {items.map((it)=> (
            <li key={it.id} className="p-3 border rounded-md flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{it.title || `Тендер #${String(it.id).slice(0,8)}`}</div>
                <div className="text-xs text-muted-foreground">{it.description}</div>
              </div>
              <Link className="btn-ghost" to={`/tenders/${it.id}`}>Открыть</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default TendersList;
