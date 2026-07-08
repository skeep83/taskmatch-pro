import React, { useCallback, useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel } from '@/lib/categoryLabel';
import { StaticMapThumb } from '@/components/maps/StaticMapThumb';
import {
  MapPin,
  Clock,
  Euro,
  Filter,
  Search,
  Video,
  Star,
  Shield,
  Zap,
  Briefcase,
  User,
  Calendar,
  Settings,
  Eye,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from "lucide-react";

interface Category {
  id: string;
  key: string;
  label_ru?: string | null;
}

interface Job {
  id: string;
  title?: string | null;
  description?: string | null;
  status: string;
  created_at: string;
  scheduled_at?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  urgency?: string | null;
  client_id: string;
  category_id: string;
  budget_min_cents?: number | null;
  budget_max_cents?: number | null;
  category?: Category;
}

export default function Feed() {
  const { t, language } = useEnhancedI18n();

  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("client");
  const [activeTab, setActiveTab] = useState("all");

  const loadJobs = useCallback(async () => {
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      let nextUserRole = userRole;

      if (uid) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        if (roles?.some((role) => role.role === "pro")) nextUserRole = "pro";
        else if (roles?.some((role) => role.role === "business")) nextUserRole = "business";
        else nextUserRole = "client";
        setUserRole(nextUserRole);
      }

      let query = supabase
        .from("jobs")
        .select("*, profiles!jobs_client_id_fkey(full_name, first_name, last_name, avatar_url)")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(20);

      if (uid) {
        query = query.neq("client_id", uid);
      }

      if (selectedCategory) query = query.eq("category_id", selectedCategory);

      const { data: jobsData, error: jobsError } = await query;
      if (jobsError) throw jobsError;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("label_ru");

      if (categoriesError) {
        console.warn("Categories loading error:", categoriesError);
      }

      let respondedJobIds = new Set<string>();

      if (uid && nextUserRole === "pro") {
        const [{ data: applications }, { data: proposals }] = await Promise.all([
          supabase.from("job_applications").select("job_id").eq("pro_id", uid),
          supabase.from("job_price_proposals").select("job_id").eq("pro_id", uid),
        ]);

        respondedJobIds = new Set([
          ...(applications || []).map((item) => item.job_id),
          ...(proposals || []).map((item) => item.job_id),
        ]);
      }

      const jobsWithCategories = (jobsData || []).map((job) => {
        const category = (categoriesData || []).find((cat) => cat.id === job.category_id);
        return {
          ...job,
          category,
        };
      });

      const visibleJobs = jobsWithCategories.filter((job) => {
        if (nextUserRole !== "pro") return true;
        return !respondedJobIds.has(job.id);
      });

      setJobs(visibleJobs);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error(error);
      toast({
        title: t("dash.pro.load_error_title"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive"
      });
    }
  }, [selectedCategory, toast, userRole]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadJobs();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const jobsChannel = supabase
      .channel('desktop-feed-jobs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
      }, () => {
        void loadJobs();
      })
      .subscribe();

    const applicationsChannel = supabase
      .channel('desktop-feed-applications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'job_applications',
      }, () => {
        void loadJobs();
      })
      .subscribe();

    const proposalsChannel = supabase
      .channel('desktop-feed-proposals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'job_price_proposals',
      }, () => {
        void loadJobs();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(jobsChannel);
      void supabase.removeChannel(applicationsChannel);
      void supabase.removeChannel(proposalsChannel);
    };
  }, [loadJobs]);

  const filteredJobs = jobs.filter(job =>
    searchQuery === "" ||
    job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    categoryLabel(job.category, language)?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen">
      <Seo title={t("ui.servicehub_lenta_zakazov")} description={t("ui.zakazy_dlia_otpravki_predlozhenii")} canonical="/feed" />

      {/* Header Section */}
      <section className="container mx-auto py-6 md:py-10 px-4 md:px-6">
        <div className="max-w-7xl mx-auto mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            {userRole === "pro" ? t("dash.pro.jobs_for_offers") : t("footer.feed")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole === "pro" ? t("ui.pokazyvaem_tolko_novye_zakazy") : t("ui.smotrite_novye_zakazy_na")}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <AnimatedIcon icon={Zap} className="text-primary" />
              <span className="text-sm font-medium">{t("ui.novye_zakazy")}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <AnimatedIcon icon={Shield} className="text-green-500" />
              <span className="text-sm font-medium">{t("ui.otkliki_i_soobscheniia")}</span>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="p-2 rounded-2xl bg-neo neo-inset-8">
              <TabsList className="grid w-full grid-cols-4 bg-transparent">
                <TabsTrigger value="all" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Briefcase className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("ui.vse_zakazy")}</span>
                  {activeTab === "all" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="new" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <AlertCircle className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("ui.novye")}</span>
                  {activeTab === "new" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="urgent" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Clock className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("ui.srochnye")}</span>
                  {activeTab === "urgent" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="filters" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Filter className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("ui.filtry")}</span>
                  {activeTab === "filters" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-6">
              {/* Search and Filters */}
              <Card className="bg-neo neo-8 border-none">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[300px] relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        placeholder={t("ui.poisk_zakazov")}
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
                          <option key={cat.id} value={cat.id}>{categoryLabel(cat, language) || cat.key}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Jobs Grid */}
              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className="bg-neo neo-8 border-none group hover:neo-12 transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="mb-2">
                          {categoryLabel(job.category, language) || t("ui.usluga")}
                        </Badge>
                        {job.scheduled_at && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(job.scheduled_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg line-clamp-2">{job.description}</CardTitle>
                      {(() => {
                        const p = (job as { profiles?: { full_name?: string | null; first_name?: string | null; last_name?: string | null; avatar_url?: string | null } }).profiles;
                        const clientName = p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(" ") || t("menu.role_client");
                        const initials = clientName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "К";
                        return (
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <div className="neo-icon-well w-7 h-7 text-[10px] font-bold text-primary shrink-0 overflow-hidden">
                              {p?.avatar_url
                                ? <img src={p.avatar_url} alt={clientName} className="w-full h-full object-cover rounded-full" />
                                : initials}
                            </div>
                            <span className="truncate">{clientName}</span>
                          </div>
                        );
                      })()}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {job.budget_min_cents && (
                          <div className="flex items-center gap-2">
                            <Euro className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              {job.budget_min_cents && job.budget_max_cents
                                ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                                : job.budget_min_cents
                                ? `от ${formatPrice(job.budget_min_cents)}`
                                : job.budget_max_cents
                                ? `до ${formatPrice(job.budget_max_cents)}`
                                : t("dash.pro.negotiable")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm text-muted-foreground truncate">
                            {job.location_address || t("ui.v_radiuse_5km")}
                          </span>
                        </div>
                        {job.location_lat != null && job.location_lng != null && (
                          <StaticMapThumb
                            latitude={Number(job.location_lat)}
                            longitude={Number(job.location_lng)}
                            alt={job.location_address || ""}
                            className="h-24 w-full"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-muted-foreground">{t("ui.srochnost_obychnaia")}</span>
                        </div>
                      </div>

                      {userRole === "pro" && (
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            onClick={() => navigate(`/job/${job.id}/respond`)}
                            className="bg-neo neo-8 hover:neo-inset-4 text-black border-none flex-1"
                          >
                            {t("dash.pro.send_offer")}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-neo neo-8 hover:neo-inset-4 text-black border-none"
                          >
                            <Video className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground pt-3 border-t">
                        Создан {new Date(job.created_at).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <Card className="bg-neo neo-8 border-none">
                  <CardContent className="text-center py-12">
                    <div className="neo-icon-well w-16 h-16 mx-auto mb-4"><Search className="w-7 h-7 text-muted-foreground" /></div>
                    <h2 className="text-xl font-semibold mb-2">{t("ui.zakazy_ne_naideny")}</h2>
                    <p className="text-muted-foreground">{t("ui.poprobuite_izmenit_filtry_ili")}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="new" className="space-y-6">
              <Card className="bg-neo neo-8 border-none">
                <CardContent className="text-center py-12">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h2 className="text-xl font-semibold mb-2">{t("ui.novye_zakazy")}</h2>
                  <p className="text-muted-foreground">{t("ui.zdes_budut_otobrazhatsia_tolko")}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="urgent" className="space-y-6">
              <Card className="bg-neo neo-8 border-none">
                <CardContent className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                  <h2 className="text-xl font-semibold mb-2">{t("ui.srochnye_zakazy")}</h2>
                  <p className="text-muted-foreground">{t("ui.zdes_budut_otobrazhatsia_srochnye")}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filters" className="space-y-6">
              <Card className="bg-neo neo-8 border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    {t("ui.rasshirennye_filtry")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t("job.new.budget_from")}</label>
                      <input type="number" className="w-full p-3 bg-white/50 border border-white/20 rounded-xl" placeholder={t("ui.minimalnaia_summa")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t("ui.biudzhet_do")}</label>
                      <input type="number" className="w-full p-3 bg-white/50 border border-white/20 rounded-xl" placeholder={t("ui.maksimalnaia_summa")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t("ui.radius_km")}</label>
                      <select className="w-full p-3 bg-white/50 border border-white/20 rounded-xl">
                        <option value="5">5 км</option>
                        <option value="10">10 км</option>
                        <option value="25">25 км</option>
                        <option value="50">50 км</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t("ui.srochnost")}</label>
                      <select className="w-full p-3 bg-white/50 border border-white/20 rounded-xl">
                        <option value="">{t("ui.liubaia")}</option>
                        <option value="normal">{t("ui.obychnaia")}</option>
                        <option value="urgent">{t("dash.client.urg_urgent")}</option>
                        <option value="same_day">{t("dash.client.urg_same_day")}</option>
                      </select>
                    </div>
                  </div>
                  <Button className="bg-neo neo-8 hover:neo-inset-4 text-black border-none">
                    {t("ui.primenit_filtry")}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}