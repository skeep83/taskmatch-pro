import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { StarRating } from "@/components/ui/star-rating";

const ProPublic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [rating, setRating] = useState<{ avg_score: number; rating_count: number }>({ avg_score: 0, rating_count: 0 });
  const [portfolio, setPortfolio] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: prof } = await (supabase as any)
        .from("pro_profiles").select("user_id,bio,radius_km,hourly_rate_cents,fixed_price_cents").eq("user_id", id).maybeSingle();
      if (!prof) { navigate('/catalog'); return; }
      setProfile(prof);

      const { data: catsLinks } = await (supabase as any)
        .from("pro_categories").select("category_id").eq("user_id", id);
      const catIds = (catsLinks || []).map((x: any) => x.category_id);
      let cats: any[] = [];
      if (catIds.length > 0) {
        const { data: catsData } = await (supabase as any).from("categories").select("id,label_ru,key").in("id", catIds);
        cats = catsData || [];
      }
      setCategories(cats);

      const { data: stat } = await (supabase as any).from("pro_rating_stats").select("avg_score,rating_count").eq("pro_id", id).maybeSingle();
      if (stat) setRating({ avg_score: Number(stat.avg_score||0), rating_count: stat.rating_count||0 });

      const { data: items } = await (supabase as any)
        .from("portfolio_items").select("id,image_url,title,description").eq("pro_id", id).order("created_at", { ascending: false }).limit(6);
      setPortfolio(items || []);
    })();
  }, [id, navigate]);

  const catLabels = useMemo(() => categories.map((c:any)=> c.label_ru || c.key).join(', '), [categories]);

  if (!profile) return (
    <main className="container mx-auto py-12">
      <section className="max-w-4xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section>
    </main>
  );

  return (
    <main>
      <Seo title={`ServiceHub — Профиль специалиста`} description="Публичный профиль специалиста" canonical={`/pro/${id}`} />
      <section className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto card-surface">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2">Специалист #{String(id).slice(0,8)}</h1>
              <p className="text-sm text-muted-foreground mb-2">Категории: {catLabels || '—'}</p>
              <div className="flex items-center gap-2 mb-2">
                <StarRating 
                  rating={rating.avg_score} 
                  size="sm" 
                  showValue 
                  showCount 
                  count={rating.rating_count}
                />
              </div>
              <p className="text-sm mt-2">Ставки: {profile.hourly_rate_cents ? `$${(profile.hourly_rate_cents/100).toFixed(2)}/ч` : 'по договоренности'}{profile.fixed_price_cents ? ` • фикс. $${(profile.fixed_price_cents/100).toFixed(2)}` : ''}</p>
              <p className="text-sm mt-4 whitespace-pre-wrap">{profile.bio || 'Описание отсутствует'}</p>
            </div>
            <div className="shrink-0">
              <Link to={`/job/new?${new URLSearchParams({ category_id: categories[0]?.id || '', pro_id: String(id) })}`} className="btn-hero">Забронировать</Link>
            </div>
          </div>

          {portfolio.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-3">Портфолио</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {portfolio.map((item) => (
                  <figure key={item.id} className="border rounded-md overflow-hidden">
                    <img src={item.image_url} alt={`Работа специалиста ${String(id).slice(0,8)}`} className="w-full h-40 object-cover" loading="lazy" />
                    {item.title && <figcaption className="p-2 text-sm">{item.title}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ProPublic;
