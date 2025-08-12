import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const Catalog = () => {
  const [categories, setCategories] = useState<Array<{ id: string; key: string; label_ru?: string; label_ro?: string }>>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [pros, setPros] = useState<Array<any>>([]);
  const [ratingMap, setRatingMap] = useState<Record<string, { avg_score: number; rating_count: number }>>({});
  const [catById, setCatById] = useState<Record<string, { id: string; label_ru?: string; key: string }>>({});
  const [searchParams, setSearchParams] = useSearchParams();

  // Load categories
  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase as any).from("categories").select("id,key,label_ru,label_ro").order("key");
      setCategories(data || []);
      const map: Record<string, any> = {};
      (data || []).forEach((c: any) => { map[c.id] = c; });
      setCatById(map);
      const cat = searchParams.get("category_id") || "";
      if (cat) setSelectedCat(cat);
    })();
  }, []);

  // Load pros (optionally filtered by category)
  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      let proIds: string[] | null = null;
      if (selectedCat) {
        const { data: pc } = await (supabase as any)
          .from("pro_categories")
          .select("user_id")
          .eq("category_id", selectedCat)
          .limit(500);
        proIds = (pc || []).map((x: any) => x.user_id);
      }

      let query = (supabase as any).from("pro_profiles").select("user_id,bio,radius_km,hourly_rate_cents,fixed_price_cents").limit(60);
      if (proIds && proIds.length > 0) query = query.in("user_id", proIds);
      const { data: profiles } = await query;
      setPros(profiles || []);

      const ids = (profiles || []).map((p: any) => p.user_id);
      if (ids.length > 0) {
        const { data: stats } = await (supabase as any)
          .from("pro_rating_stats")
          .select("pro_id,avg_score,rating_count")
          .in("pro_id", ids);
        const map: Record<string, any> = {};
        (stats || []).forEach((s: any) => { map[s.pro_id] = { avg_score: Number(s.avg_score || 0), rating_count: s.rating_count || 0 }; });
        setRatingMap(map);
      } else {
        setRatingMap({});
      }
    })();
  }, [selectedCat]);

  const categoryOptions = useMemo(() => categories.map(c => (
    <option key={c.id} value={c.id}>{c.label_ru || c.key}</option>
  )), [categories]);

  return (
    <main>
      <Seo title="ServiceHub — Каталог специалистов" description="Поиск специалистов по категориям" canonical="/catalog" jsonLd={{"@context":"https://schema.org","@type":"CollectionPage","name":"Каталог специалистов"}} />
      <section className="container mx-auto py-10">
        <h1 className="text-3xl font-semibold mb-6">Найти специалиста</h1>
        <div className="card-surface mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Категория</label>
              <select value={selectedCat} onChange={(e)=>{ setSelectedCat(e.target.value); const v=e.target.value; const next = new URLSearchParams(searchParams); if (v) next.set('category_id', v); else next.delete('category_id'); setSearchParams(next, { replace:true }); }} className="w-full border rounded-md px-3 py-2 bg-background">
                <option value="">Все категории</option>
                {categoryOptions}
              </select>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pros.map((p) => {
            const r = ratingMap[p.user_id] || { avg_score: 0, rating_count: 0 };
            return (
              <article key={p.user_id} className="card-surface flex flex-col">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Специалист #{String(p.user_id).slice(0,8)}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{p.bio || 'Описание отсутствует'}</p>
                  <p className="text-sm mt-2">Рейтинг: {r.avg_score.toFixed(1)} ({r.rating_count})</p>
                  <p className="text-sm text-muted-foreground">Ставка: {p.hourly_rate_cents ? `$${(p.hourly_rate_cents/100).toFixed(2)}/ч` : 'по договоренности'}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/pro/${p.user_id}`} className="btn-ghost">Профиль</Link>
                  <Link to={`/job/new?${new URLSearchParams({ category_id: selectedCat || '', pro_id: p.user_id })}`} className="btn-hero">Забронировать</Link>
                </div>
              </article>
            );
          })}
          {pros.length === 0 && (
            <div className="text-sm text-muted-foreground">Не найдено специалистов по выбранным фильтрам</div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Catalog;
