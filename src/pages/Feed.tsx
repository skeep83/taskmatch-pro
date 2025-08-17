import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { MapPin, Clock, Euro, Filter, Search, Video, Star, Shield, Zap } from "lucide-react";
import feedImage from "@/assets/feed-jobs.jpg";

export default function Feed() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("client");

  const loadJobs = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      
      // Load user role
      if (uid) {
        const { data: roles } = await (supabase as any).from("user_roles").select("role").eq("user_id", uid);
        if (roles?.[0]?.role === "pro") setUserRole("pro");
        else if (roles?.[0]?.role === "business") setUserRole("business");
      }
      
      // Load available jobs first
      let query = (supabase as any)
        .from("jobs")
        .select("*")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(20);
        
      if (selectedCategory) query = query.eq("category_id", selectedCategory);
      
      const { data: jobsData, error: jobsError } = await query;
      if (jobsError) throw jobsError;
      
      // Load categories separately
      const { data: categoriesData, error: categoriesError } = await (supabase as any)
        .from("categories")
        .select("*")
        .order("label_ru");
      
      if (categoriesError) {
        console.warn("Categories loading error:", categoriesError);
      }
      
      // Merge category info with jobs
      const jobsWithCategories = (jobsData || []).map((job: any) => {
        const category = (categoriesData || []).find((cat: any) => cat.id === job.category_id);
        return {
          ...job,
          category: category
        };
      });
      
      setJobs(jobsWithCategories);
      setCategories(categoriesData || []);
    } catch (error: any) {
      console.error(error);
      toast({ title: t("notifications.error"), variant: "destructive" });
    }
  };

  useEffect(() => { loadJobs(); }, [selectedCategory]);

  const acceptJob = async (jobId: string) => {
    try {
      setLoading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) { window.location.href = "/auth"; return; }
      
      const { error } = await (supabase as any)
        .from("jobs")
        .update({ pro_id: uid, status: "accepted" })
        .eq("id", jobId);
        
      if (error) throw error;
      toast({ title: t("notifications.job_accepted") });
      loadJobs();
    } catch (e: any) {
      console.error(e);
      toast({ title: t("notifications.error"), description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    searchQuery === "" || 
    job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.category?.label_ru?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen">
      <Seo title="ServiceHub — Лента заказов" description="Доступные заказы для специалистов" canonical="/feed" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={feedImage} alt="Jobs Feed" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-600/80" />
        </div>
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              {userRole === "pro" ? t("feed.title") : t("feed.title")}
            </h1>
            <p className="text-xl text-white/90 mb-8">
              {userRole === "pro" ? t("feed.search") : t("dashboard.welcome")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <AnimatedIcon icon={Zap} className="text-yellow-300" />
                  <span>Мгновенные выплаты</span>
                </div>
              </FloatingCard>
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <AnimatedIcon icon={Shield} className="text-green-300" />
                  <span>Защита эскроу</span>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-8">
        <GlassMorphism className="p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder={t("feed.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{t("feed.category.all")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label_ru || cat.key}</option>
                ))}
              </select>
            </div>
          </div>
        </GlassMorphism>

        {/* Jobs Grid */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <FloatingCard key={job.id} className="job-card group hover:scale-[1.02] transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="secondary" className="mb-2">
                    {job.category?.label_ru || "Услуга"}
                  </Badge>
                  {job.scheduled_at && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {new Date(job.scheduled_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg mb-3 line-clamp-2">{job.description}</h3>
                
                <div className="space-y-3 mb-4">
                  {job.budget_min_cents && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        {(job.budget_min_cents / 100).toFixed(0)}-{(job.budget_max_cents / 100).toFixed(0)} ₽
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">В радиусе 5км</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Срочность: обычная</span>
                  </div>
                </div>

                {userRole === "pro" && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => acceptJob(job.id)}
                      disabled={loading}
                      className="btn-hero flex-1 group-hover:shadow-lg transition-all"
                    >
                      {loading ? t("common.loading") : t("feed.accept_job")}
                    </button>
                    <button className="btn-ghost p-3">
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  Создан {new Date(job.created_at).toLocaleString()}
                </div>
              </div>
            </FloatingCard>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">{t("feed.no_jobs")}</h2>
            <p className="text-muted-foreground">Попробуйте изменить фильтры или создать новый заказ</p>
          </div>
        )}
      </section>
    </main>
  );
}
