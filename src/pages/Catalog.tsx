import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { SignatureGradient } from "@/components/SignatureGradient";
import { Search, Filter, Star, Clock, MapPin, Zap } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import proPlaceholder from "@/assets/pro-placeholder.jpg";
import servicesHero from "@/assets/services-hero.jpg";
import cardBgPattern from "@/assets/card-bg-pattern.jpg";

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
    <main className="relative min-h-screen overflow-hidden">
      <SignatureGradient />
      <Seo title="ServiceHub — Каталог специалистов" description="Поиск специалистов по категориям" canonical="/catalog" jsonLd={{"@context":"https://schema.org","@type":"CollectionPage","name":"Каталог специалистов"}} />
      
      {/* Hero Section */}
      <section className="relative container mx-auto pt-20 pb-16">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <AnimatedIcon icon={Search} size={48} className="text-primary" />
          </div>
          <h1 className="text-6xl font-display font-bold text-gradient mb-6">
            Найдите идеального специалиста
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Подключайтесь к проверенным профессионалам в вашем городе. Быстро, безопасно, с гарантией качества.
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative max-w-4xl mx-auto mb-16 animate-scale-in">
          <img 
            src={servicesHero} 
            alt="ServiceHub services" 
            className="w-full h-auto rounded-3xl shadow-2xl hover-scale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-3xl" />
        </div>

        {/* Search and Filters */}
        <div className="acrylic-surface max-w-4xl mx-auto mb-16 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="grid md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <AnimatedIcon icon={Filter} size={20} delayMs={300} />
                Категория услуг
              </label>
              <select 
                value={selectedCat} 
                onChange={(e)=>{ 
                  setSelectedCat(e.target.value); 
                  const v=e.target.value; 
                  const next = new URLSearchParams(searchParams); 
                  if (v) next.set('category_id', v); 
                  else next.delete('category_id'); 
                  setSearchParams(next, { replace:true }); 
                }} 
                className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 backdrop-blur-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Все категории</option>
                {categoryOptions}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <AnimatedIcon icon={MapPin} size={20} delayMs={400} />
                Расстояние
              </label>
              <select className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 backdrop-blur-sm transition-all hover:border-primary/50">
                <option>В пределах 5 км</option>
                <option>В пределах 10 км</option>
                <option>В пределах 25 км</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn-hero w-full flex items-center justify-center gap-2 hover-scale">
                <AnimatedIcon icon={Search} size={20} delayMs={500} />
                Найти
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Specialists Grid */}
      <section className="container mx-auto pb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold mb-4">Наши специалисты</h2>
          <p className="text-muted-foreground">Проверенные профессионалы готовы выполнить вашу задачу</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pros.map((p, index) => {
            const r = ratingMap[p.user_id] || { avg_score: 0, rating_count: 0 };
            return (
              <article 
                key={p.user_id} 
                className="group relative overflow-hidden rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300 animate-fade-in hover-scale"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  backgroundImage: `url(${cardBgPattern})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-sm" />
                
                <div className="relative p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                      <img 
                        src={proPlaceholder} 
                        alt="Specialist" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <StarRating 
                      rating={r.avg_score} 
                      size="sm" 
                      showValue={false}
                      className="px-3 py-1 rounded-full bg-primary/10"
                    />
                  </div>

                  <div className="flex-1 mb-6">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      Специалист #{String(p.user_id).slice(0,8)}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                      {p.bio || 'Профессиональный специалист с многолетним опытом работы'}
                    </p>
                    
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <AnimatedIcon icon={Clock} size={14} />
                        Быстрый отклик
                      </div>
                      <div className="flex items-center gap-1 text-success">
                        <AnimatedIcon icon={Zap} size={14} />
                        {r.rating_count} отзывов
                      </div>
                      <div className="flex items-center">
                        <StarRating 
                          rating={r.avg_score} 
                          size="sm" 
                          showValue
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Стоимость:</span>
                      <span className="text-lg font-semibold text-primary">
                        {p.hourly_rate_cents ? `$${(p.hourly_rate_cents/100).toFixed(0)}/ч` : 'Договорная'}
                      </span>
                    </div>
                    
                    <div className="flex gap-3">
                      <Link 
                        to={`/pro/${p.user_id}`} 
                        className="flex-1 btn-ghost text-center py-3 hover-scale"
                      >
                        Профиль
                      </Link>
                      <Link 
                        to={`/job/new?${new URLSearchParams({ category_id: selectedCat || '', pro_id: p.user_id })}`} 
                        className="flex-1 btn-hero text-center py-3 hover-scale"
                      >
                        Заказать
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {pros.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-6xl opacity-20 mb-4">🔍</div>
            <h3 className="text-2xl font-semibold mb-2">Специалисты не найдены</h3>
            <p className="text-muted-foreground">Попробуйте изменить фильтры поиска</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default Catalog;
