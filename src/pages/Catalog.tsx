import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { SignatureGradient } from "@/components/SignatureGradient";
import { Search, Filter, Star, Clock, MapPin, Zap, Briefcase } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import proPlaceholder from "@/assets/pro-placeholder.jpg";
import servicesHero from "@/assets/services-hero.jpg";
import { getCategoryIcon } from "@/utils/categoryIcons";

type Category = {
  id: string;
  key: string;
  label_ru?: string | null;
  label_ro?: string | null;
  popularity: number;
};

type Job = {
  id: string;
  public_id?: string | null;
  title?: string | null;
  description?: string | null;
  status: string;
  created_at: string;
  location_address?: string | null;
  urgency?: string | null;
  category_id: string;
  budget_min_cents?: number | null;
  budget_max_cents?: number | null;
  categories?: {
    label_ru?: string | null;
    key?: string | null;
  } | null;
};

type ProProfile = {
  user_id: string;
  bio?: string | null;
  radius_km?: number | null;
  hourly_rate_cents?: number | null;
  fixed_price_cents?: number | null;
  profiles?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

const ACTIVE_JOB_STATUSES = ["new", "accepted", "in_progress", "done"];
const ROTATION_WINDOW = 6;

const Catalog = () => {
  const { t } = useEnhancedI18n();
  const { formatPrice } = useCurrency();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pros, setPros] = useState<ProProfile[]>([]);
  const [ratingMap, setRatingMap] = useState<Record<string, { avg_score: number; rating_count: number }>>({});
  const [catById, setCatById] = useState<Record<string, Category>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [rotationIndex, setRotationIndex] = useState(0);

  const setCategory = (categoryId: string) => {
    setSelectedCat(categoryId);
    setSearchQuery("");
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    if (categoryId) {
      next.set("category_id", categoryId);
      next.delete("category");
    } else {
      next.delete("category_id");
      next.delete("category");
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const categoryFromParams = searchParams.get("category_id") || searchParams.get("category") || "";
    if (categoryFromParams !== selectedCat) {
      setSelectedCat(categoryFromParams);
    }
  }, [searchParams, selectedCat]);

  useEffect(() => {
    (async () => {
      const [{ data: categoriesData, error: categoriesError }, { data: jobsForCounts, error: jobsError }] = await Promise.all([
        supabase.from("categories").select("id,key,label_ru,label_ro").order("label_ru"),
        supabase.from("jobs").select("category_id,status").in("status", ACTIVE_JOB_STATUSES).limit(1000),
      ]);

      if (categoriesError) {
        console.error("Failed to load categories:", categoriesError);
        return;
      }
      if (jobsError) {
        console.error("Failed to load category popularity:", jobsError);
      }

      const counts = new Map<string, number>();
      (jobsForCounts || []).forEach((row: { category_id: string | null }) => {
        if (!row.category_id) return;
        counts.set(row.category_id, (counts.get(row.category_id) || 0) + 1);
      });

      const merged: Category[] = (categoriesData || []).map((category: any) => ({
        ...category,
        popularity: counts.get(category.id) || 0,
      }));

      merged.sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return (a.label_ru || a.key).localeCompare(b.label_ru || b.key, "ru");
      });

      const byId: Record<string, Category> = {};
      merged.forEach((category) => {
        byId[category.id] = category;
      });

      setCategories(merged);
      setCatById(byId);
    })();
  }, []);

  useEffect(() => {
    const popular = categories.filter((category) => category.popularity > 0);
    if (popular.length <= ROTATION_WINDOW) return;

    const timer = window.setInterval(() => {
      setRotationIndex((current) => (current + 1) % popular.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [categories]);

  useEffect(() => {
    (async () => {
      let query = supabase
        .from("jobs")
        .select("id,public_id,title,description,status,created_at,location_address,urgency,category_id,budget_min_cents,budget_max_cents,categories(label_ru,key)")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(30);

      if (selectedCat) {
        query = query.eq("category_id", selectedCat);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Failed to load catalog jobs:", error);
        setJobs([]);
        return;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      const filtered = (data || []).filter((job: Job) => {
        if (!normalizedQuery) return true;
        const haystack = [
          job.title || "",
          job.description || "",
          job.categories?.label_ru || "",
          job.location_address || "",
          job.public_id || "",
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      });

      setJobs(filtered as Job[]);
    })();
  }, [selectedCat, searchQuery]);

  useEffect(() => {
    (async () => {
      let proIds: string[] | null = null;
      if (selectedCat) {
        const { data: pc } = await supabase
          .from("pro_categories")
          .select("user_id")
          .eq("category_id", selectedCat)
          .limit(500);
        proIds = (pc || []).map((x: any) => x.user_id);
      }

      let query = supabase
        .from("pro_profiles")
        .select("user_id,bio,radius_km,hourly_rate_cents,fixed_price_cents")
        .limit(60);

      if (proIds && proIds.length > 0) query = query.in("user_id", proIds);
      if (proIds && proIds.length === 0) {
        setPros([]);
        setRatingMap({});
        return;
      }

      const { data: proProfiles } = await query;

      if (proProfiles && proProfiles.length > 0) {
        const userIds = proProfiles.map((p: any) => p.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id,first_name,last_name,full_name,avatar_url")
          .in("id", userIds);

        const profileMap: Record<string, any> = {};
        (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });

        const mergedData = proProfiles.map((pp: any) => ({
          ...pp,
          profiles: profileMap[pp.user_id] || null,
        }));

        setPros(mergedData);

        const { data: stats } = await supabase
          .from("pro_rating_stats")
          .select("pro_id,avg_score,rating_count")
          .in("pro_id", userIds);
        const map: Record<string, any> = {};
        (stats || []).forEach((s: any) => {
          map[s.pro_id] = { avg_score: Number(s.avg_score || 0), rating_count: s.rating_count || 0 };
        });
        setRatingMap(map);
      } else {
        setPros([]);
        setRatingMap({});
      }
    })();
  }, [selectedCat]);

  const rotatingPopularCategories = useMemo(() => {
    const popular = categories.filter((category) => category.popularity > 0);
    if (popular.length <= ROTATION_WINDOW) return popular;
    return Array.from({ length: ROTATION_WINDOW }, (_, idx) => popular[(rotationIndex + idx) % popular.length]);
  }, [categories, rotationIndex]);

  const categoryOptions = useMemo(() => categories.map((category) => (
    <option key={category.id} value={category.id}>
      {category.label_ru || category.key}{category.popularity > 0 ? ` · ${category.popularity}` : ""}
    </option>
  )), [categories]);

  const getUrgencyLabel = (urgency?: string | null) => {
    if (urgency === "urgent") return "Срочно";
    if (urgency === "same_day") return "В тот же день";
    return "Обычная";
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <SignatureGradient />
      <Seo title="ServiceHub — каталог заказов и специалистов" description="Открытые заказы и специалисты по категориям услуг" canonical="/catalog" jsonLd={{"@context":"https://schema.org","@type":"CollectionPage","name":"ServiceHub catalog"}} />

      <section className="relative container mx-auto pt-20 pb-16 px-6">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <AnimatedIcon icon={Search} size={48} className="text-primary" />
          </div>
          <h1 className="text-5xl font-display font-bold text-gradient mb-6">
            Каталог заказов и специалистов
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Сначала смотрите живые заказы по категории, затем выбирайте подходящего исполнителя.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto mb-10 animate-scale-in">
          <img src={servicesHero} alt="ServiceHub services" className="w-full h-auto rounded-3xl shadow-2xl hover-scale" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-3xl" />
        </div>

        {rotatingPopularCategories.length > 0 && (
          <div className="max-w-6xl mx-auto mb-8">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <AnimatedIcon icon={Zap} size={18} />
              Часто заказывают сейчас
            </div>
            <div className="flex flex-wrap gap-3">
              {rotatingPopularCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setCategory(category.id)}
                  className={`rounded-full px-4 py-2 text-sm transition-all border ${selectedCat === category.id ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-background/80 border-border/60 hover:border-primary/50 hover:bg-background"}`}
                >
                  <span className="mr-2">{getCategoryIcon(category.label_ru, category.key)}</span>
                  {category.label_ru || category.key}
                  <span className="ml-2 opacity-80">{category.popularity}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="acrylic-surface max-w-6xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="grid lg:grid-cols-4 gap-6 items-end">
            <div className="lg:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <AnimatedIcon icon={Search} size={20} delayMs={250} />
                Поиск по заказам
              </label>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Например: сантехника, прокладка, изоляция"
                className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 backdrop-blur-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <AnimatedIcon icon={Filter} size={20} delayMs={300} />
                Категория
              </label>
              <select
                value={selectedCat}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 backdrop-blur-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Все категории</option>
                {categoryOptions}
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategory("");
                }}
                className="btn-hero w-full flex items-center justify-center gap-2 hover-scale"
              >
                <AnimatedIcon icon={Briefcase} size={20} delayMs={350} />
                Сбросить фильтры
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto pb-12 px-6">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2 className="text-4xl font-display font-bold mb-2">Актуальные заказы</h2>
            <p className="text-muted-foreground">
              {selectedCat ? `Открытые заказы в категории «${catById[selectedCat]?.label_ru || catById[selectedCat]?.key || "выбранная категория"}»` : "Последние открытые заказы клиентов"}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Найдено: <span className="font-semibold text-foreground">{jobs.length}</span>
          </div>
        </div>

        {jobs.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {jobs.map((job) => (
              <article key={job.id} className="rounded-3xl border border-border/50 bg-background/90 shadow-lg p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground mb-2">{job.public_id || job.id}</div>
                    <h3 className="text-xl font-semibold leading-tight">{job.title || "Без названия"}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs border ${job.urgency === "urgent" ? "bg-red-500/10 text-red-700 border-red-300" : job.urgency === "same_day" ? "bg-orange-500/10 text-orange-700 border-orange-300" : "bg-slate-500/10 text-slate-700 border-slate-300"}`}>
                    {getUrgencyLabel(job.urgency)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-primary/10 text-primary px-3 py-1">
                    {job.categories?.label_ru || catById[job.category_id]?.label_ru || "Без категории"}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-4 min-h-[5rem]">
                  {job.description || "Описание не указано"}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{job.location_address || "Адрес не указан"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Создан: {new Date(job.created_at).toLocaleString("ru-RU")}</span>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4">
                  <div className="font-semibold text-lg text-primary">
                    {job.budget_min_cents || job.budget_max_cents ? formatPrice((job.budget_min_cents || job.budget_max_cents || 0) / 100) + (job.budget_min_cents && job.budget_max_cents && job.budget_min_cents !== job.budget_max_cents ? ` – ${formatPrice(job.budget_max_cents / 100)}` : "") : "Бюджет не указан"}
                  </div>
                  <Link to={`/job/${job.id}`} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                    Открыть заказ
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-3xl border border-dashed border-border/60 bg-background/70 max-w-5xl mx-auto">
            <div className="text-6xl opacity-20 mb-4">📭</div>
            <h3 className="text-2xl font-semibold mb-2">Заказы не найдены</h3>
            <p className="text-muted-foreground">Попробуйте другую категорию или очистите поиск.</p>
          </div>
        )}
      </section>

      <section className="container mx-auto pb-20 px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold mb-4">Наши специалисты</h2>
          <p className="text-muted-foreground">Исполнители с профилями и отзывами</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pros.map((pro) => {
            const rating = ratingMap[pro.user_id] || { avg_score: 0, rating_count: 0 };
            const displayName = pro.profiles?.full_name || `${pro.profiles?.first_name || ""} ${pro.profiles?.last_name || ""}`.trim() || `Специалист ${String(pro.user_id).slice(0, 8)}`;
            return (
              <article key={pro.user_id} className="rounded-3xl overflow-hidden border border-border/50 bg-background/90 shadow-lg">
                <div className="h-28 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600" />
                <div className="px-6 pb-6 -mt-14">
                  <div className="w-28 h-28 rounded-full border-4 border-white overflow-hidden shadow-xl mx-auto bg-white">
                    <img src={pro.profiles?.avatar_url || proPlaceholder} alt={displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-center mt-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{displayName}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
                      {selectedCat ? catById[selectedCat]?.label_ru || t("catalog.professional_bio") : t("catalog.professional_bio")}
                    </p>
                    <div className="flex justify-center mb-1">
                      <StarRating rating={rating.avg_score} size="sm" showValue={false} readonly />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {rating.rating_count > 0 ? t("catalog.reviews", { count: rating.rating_count }) : t("catalog.new_specialist")}
                    </p>
                    <div className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem] mb-4">
                      {pro.bio || "Специалист готов обсудить детали заказа и предложить условия выполнения."}
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/pro/${pro.user_id}`} className="flex-1 border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground py-2 px-3 rounded-lg transition-colors text-center text-sm font-medium">
                        {t("catalog.profile")}
                      </Link>
                      <Link to={`/job/new?${new URLSearchParams({ category_id: selectedCat || "", pro_id: pro.user_id })}`} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-3 rounded-lg shadow-sm hover:shadow-md transition-all text-center text-sm font-medium">
                        {t("catalog.order")}
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
            <h3 className="text-2xl font-semibold mb-2">{t("catalog.not_found")}</h3>
            <p className="text-muted-foreground">{t("catalog.try_filters")}</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default Catalog;
