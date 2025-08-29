import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { StarRating } from "@/components/ui/star-rating";
import { MediaViewer } from "@/components/media";
import { useCurrency } from "@/hooks/useCurrency";

const ProPublic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [rating, setRating] = useState<{ avg_score: number; rating_count: number }>({ avg_score: 0, rating_count: 0 });
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Загружаем профиль пользователя (имя, фамилию, аватар)
      const { data: userProf } = await supabase
        .from("profiles").select("first_name,last_name,full_name,avatar_url")
        .eq("id", id).maybeSingle();
      
      if (userProf) {
        setUserProfile(userProf);
      }
      
      // Загружаем профессиональный профиль
      const { data: prof } = await supabase
        .from("pro_profiles").select("user_id,bio,radius_km,hourly_rate_cents,fixed_price_cents")
        .eq("user_id", id).maybeSingle();
      
      if (!prof) { 
        navigate('/catalog'); 
        return; 
      }
      setProfile(prof);

      // Загружаем категории специалиста
      const { data: catsLinks } = await supabase
        .from("pro_services").select("category_id").eq("pro_id", id);
      const catIds = (catsLinks || []).map((x: any) => x.category_id);
      let cats: any[] = [];
      if (catIds.length > 0) {
        const { data: catsData } = await supabase
          .from("service_categories").select("id,name,name_ro")
          .in("id", catIds);
        cats = catsData || [];
      }
      setCategories(cats);

      // Загружаем рейтинг
      const { data: stat } = await supabase
        .from("pro_rating_stats").select("avg_score,rating_count")
        .eq("pro_id", id).maybeSingle();
      if (stat) setRating({ avg_score: Number(stat.avg_score||0), rating_count: stat.rating_count||0 });

      // Загружаем портфолио
      const { data: items } = await supabase
        .from("portfolio_items").select("id,image_url,title,description")
        .eq("pro_id", id).order("created_at", { ascending: false }).limit(6);
      setPortfolio(items || []);
    })();
  }, [id, navigate]);

  const catLabels = useMemo(() => categories.map((c:any)=> c.name || c.name_ro).join(', '), [categories]);
  
  // Формируем отображаемое имя
  const displayName = userProfile?.full_name || 
    (userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}` 
      : null) || `Специалист #${String(id).slice(0,8)}`;
  
  const initials = userProfile?.full_name 
    ? userProfile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase();

  if (!profile || !userProfile) return (
    <main className="container mx-auto py-12">
      <section className="max-w-4xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section>
    </main>
  );

  return (
    <main>
      <Seo title={`ServiceHub — ${displayName}`} description={`Профиль специалиста ${displayName}`} canonical={`/pro/${id}`} />
      <section className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto card-surface">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0">
                <img 
                  src={userProfile.avatar_url || ''} 
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover bg-muted"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-20 h-20 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-lg">
                  {initials}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold mb-2">{displayName}</h1>
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
                <p className="text-sm mt-2">Ставки: {profile.hourly_rate_cents ? `${formatPrice(profile.hourly_rate_cents)}/ч` : 'по договоренности'}{profile.fixed_price_cents ? ` • фикс. ${formatPrice(profile.fixed_price_cents)}` : ''}</p>
                <p className="text-sm mt-4 whitespace-pre-wrap">{profile.bio || 'Описание отсутствует'}</p>
              </div>
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
                    <MediaViewer 
                      src={item.image_url} 
                      alt={`Работа специалиста ${String(id).slice(0,8)}`} 
                      className="w-full h-40" 
                      enableZoom 
                    />
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
