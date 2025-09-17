import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { SignatureGradient } from "@/components/SignatureGradient";
import { Search, Filter, Star, Clock, MapPin, Zap } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { useEnhancedI18n } from "@/i18n/enhanced";
import proPlaceholder from "@/assets/pro-placeholder.jpg";
import servicesHero from "@/assets/services-hero.jpg";
import cardBgPattern from "@/assets/card-bg-pattern.jpg";

const Catalog = () => {
  const { t } = useEnhancedI18n();
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

      // Simplified query without foreign key reference
      let query = (supabase as any)
        .from("pro_profiles")
        .select("user_id,bio,radius_km,hourly_rate_cents,fixed_price_cents")
        .limit(60);
      
      if (proIds && proIds.length > 0) query = query.in("user_id", proIds);
      const { data: proProfiles, error: proError } = await query;
      console.log('Pro profiles data:', proProfiles, 'error:', proError);
      
      if (proProfiles && proProfiles.length > 0) {
        // Get corresponding profiles
        const userIds = proProfiles.map((p: any) => p.user_id);
        const { data: profilesData, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("id,first_name,last_name,full_name,avatar_url")
          .in("id", userIds);
        
        console.log('Profiles data:', profilesData, 'error:', profilesError);
        console.log('User IDs to fetch:', userIds);
        
        // Merge data
        const profileMap: Record<string, any> = {};
        (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });
        
        const mergedData = proProfiles.map((pp: any) => ({
          ...pp,
          profiles: profileMap[pp.user_id] || null
        }));
        
        console.log('Merged data:', mergedData);
        setPros(mergedData);

        // Get ratings
        const { data: stats } = await (supabase as any)
          .from("pro_rating_stats")
          .select("pro_id,avg_score,rating_count")
          .in("pro_id", userIds);
        const map: Record<string, any> = {};
        (stats || []).forEach((s: any) => { map[s.pro_id] = { avg_score: Number(s.avg_score || 0), rating_count: s.rating_count || 0 }; });
        setRatingMap(map);
      } else {
        console.log('No pro profiles found');
        setPros([]);
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
      <Seo title={t("catalog.title")} description={t("catalog.description")} canonical="/catalog" jsonLd={{"@context":"https://schema.org","@type":"CollectionPage","name":t("catalog.title")}} />
      
      {/* Hero Section */}
      <section className="relative container mx-auto pt-20 pb-16">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <AnimatedIcon icon={Search} size={48} className="text-primary" />
          </div>
          <h1 className="text-6xl font-display font-bold text-gradient mb-6">
            {t("catalog.hero_title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("catalog.hero_subtitle")}
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
                {t("catalog.category_filter")}
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
                <option value="">{t("catalog.all_categories")}</option>
                {categoryOptions}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <AnimatedIcon icon={MapPin} size={20} delayMs={400} />
                {t("catalog.distance")}
              </label>
              <select className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 backdrop-blur-sm transition-all hover:border-primary/50">
                <option>{t("catalog.distance_5km")}</option>
                <option>{t("catalog.distance_10km")}</option>
                <option>{t("catalog.distance_25km")}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn-hero w-full flex items-center justify-center gap-2 hover-scale">
                <AnimatedIcon icon={Search} size={20} delayMs={500} />
                {t("catalog.search")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Specialists Grid */}
      <section className="container mx-auto pb-20">
        <div className="text-center mb-12 max-w-4xl mx-auto">
          <h2 className="text-4xl font-display font-bold mb-4 max-w-[60ch] mx-auto [text-wrap:balance]">{t("catalog.our_specialists")}</h2>
          <p className="text-muted-foreground max-w-[65ch] mx-auto [text-wrap:balance] break-words hyphens-auto">{t("catalog.verified_professionals")}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto justify-items-center" style={{ perspective: '1000px' }}>
          {pros.map((p, index) => {
            const r = ratingMap[p.user_id] || { avg_score: 0, rating_count: 0 };
            return (
              <article 
                key={p.user_id} 
                className="group relative h-96 w-full max-w-sm rounded-3xl overflow-hidden transition-all duration-500 animate-fade-in hover-scale"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                }}
              >
                {/* Gradient Header with enhanced depth */}
                <div className="relative h-32 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600" 
                     style={{ 
                       background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%)',
                       boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)'
                     }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/15 to-white/25" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                </div>

                {/* Avatar with enhanced 3D effect */}
                <div className="absolute left-1/2 transform -translate-x-1/2 top-12 z-10">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                         style={{ 
                           boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.9)',
                           filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2))'
                         }}>
                      <img 
                        src={p.profiles?.avatar_url || proPlaceholder} 
                        alt={p.profiles?.full_name || p.profiles?.first_name || "Specialist"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Enhanced status indicator */}
                    {r.rating_count > 0 && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
                           style={{ 
                             boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.8)',
                             background: 'linear-gradient(135deg, #10b981, #059669)'
                           }}>
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Section with glass morphism effect */}
                <div className="pt-16 px-6 pb-6 h-full flex flex-col" 
                     style={{ 
                       background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
                       backdropFilter: 'blur(10px)',
                       borderTop: '1px solid rgba(255,255,255,0.5)',
                       boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)'
                     }}>
                  {/* Content */}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {p.profiles?.full_name || `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim() || t("catalog.specialist_id", { id: String(p.user_id).slice(0,8) })}
                    </h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      {selectedCat ? catById[selectedCat]?.label_ru || t("catalog.professional_bio") : t("catalog.professional_bio")}
                    </p>
                    
                    <div className="mt-2 flex justify-center">
                      <StarRating 
                        rating={r.avg_score} 
                        size="sm" 
                        showValue={false}
                        readonly
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.rating_count > 0 ? t("catalog.reviews", { count: r.rating_count }) : t("catalog.new_specialist")}
                    </p>
                  </div>

                  {/* Buttons positioned higher with fixed container */}
                  <div className="space-y-2 mt-auto px-2">
                    <Link 
                      to={`/pro/${p.user_id}`}
                      className="block w-full border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground py-1.5 px-3 rounded-lg transition-colors text-center text-sm font-medium"
                    >
                      {t("catalog.profile")}
                    </Link>
                    <Link 
                      to={`/job/new?${new URLSearchParams({ category_id: selectedCat || '', pro_id: p.user_id })}`} 
                      className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 px-3 rounded-lg shadow-sm hover:shadow-md transition-all text-center text-sm font-medium"
                    >
                      {t("catalog.order")}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {pros.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-6xl opacity-20 mb-4">🔍</div>
            <h3 className="text-2xl font-semibold mb-2">{t("catalog.not_found")}</h3>
            <p className="text-muted-foreground">{t("catalog.try_filters")}</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default Catalog;
