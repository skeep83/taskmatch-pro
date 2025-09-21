import React, { useEffect, useState } from "react";
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

export default function Feed() {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("client");
  const [activeTab, setActiveTab] = useState("all");

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
      if (!uid) { navigate("/auth"); return; }
      
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="h-3 w-3 flex-shrink-0" />;
      case 'accepted': return <CheckCircle className="h-3 w-3 flex-shrink-0" />;
      case 'in_progress': return <PlayCircle className="h-3 w-3 flex-shrink-0" />;
      default: return <Clock className="h-3 w-3 flex-shrink-0" />;
    }
  };

  return (
    <main className="min-h-screen">
      <Seo title="ServiceHub — Лента заказов" description="Доступные заказы для специалистов" canonical="/feed" />
      
      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {userRole === "pro" ? "Лента заказов" : "Доступные заказы"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {userRole === "pro" ? "Найдите подходящие заказы и начните зарабатывать" : "Просматривайте доступные услуги"}
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <AnimatedIcon icon={Zap} className="text-primary" />
              <span className="text-sm font-medium">Мгновенные выплаты</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <AnimatedIcon icon={Shield} className="text-green-500" />
              <span className="text-sm font-medium">Защита эскроу</span>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="p-2 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]">
              <TabsList className="grid w-full grid-cols-4 bg-transparent">
                <TabsTrigger value="all" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Briefcase className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Все заказы</span>
                  {activeTab === "all" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="new" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <AlertCircle className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Новые</span>
                  {activeTab === "new" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="urgent" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Clock className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Срочные</span>
                  {activeTab === "urgent" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="filters" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Filter className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Фильтры</span>
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
              <Card className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] border-none">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[300px] relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Поиск заказов..."
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
                        <option value="">Все категории</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.label_ru || cat.key}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Jobs Grid */}
              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] border-none group hover:shadow-[12px_12px_24px_#D1D5DB,-12px_-12px_24px_#F9FAFB] transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
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
                      <CardTitle className="text-lg line-clamp-2">{job.description}</CardTitle>
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
                                : 'Договорная'}
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
                          <Button
                            onClick={() => acceptJob(job.id)}
                            disabled={loading}
                            className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-black border-none flex-1"
                          >
                            {loading ? "Загрузка..." : "Принять заказ"}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-black border-none"
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
                <Card className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] border-none">
                  <CardContent className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold mb-2">Заказы не найдены</h2>
                    <p className="text-muted-foreground">Попробуйте изменить фильтры или создать новый заказ</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="new" className="space-y-6">
              <Card className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] border-none">
                <CardContent className="text-center py-12">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h2 className="text-xl font-semibold mb-2">Новые заказы</h2>
                  <p className="text-muted-foreground">Здесь будут отображаться только новые заказы</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="urgent" className="space-y-6">
              <Card className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] border-none">
                <CardContent className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                  <h2 className="text-xl font-semibold mb-2">Срочные заказы</h2>
                  <p className="text-muted-foreground">Здесь будут отображаться срочные заказы</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filters" className="space-y-6">
              <Card className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Расширенные фильтры
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Бюджет от</label>
                      <input type="number" className="w-full p-3 bg-white/50 border border-white/20 rounded-xl" placeholder="Минимальная сумма" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Бюджет до</label>
                      <input type="number" className="w-full p-3 bg-white/50 border border-white/20 rounded-xl" placeholder="Максимальная сумма" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Радиус (км)</label>
                      <select className="w-full p-3 bg-white/50 border border-white/20 rounded-xl">
                        <option>5 км</option>
                        <option>10 км</option>
                        <option>25 км</option>
                        <option>50 км</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Срочность</label>
                      <select className="w-full p-3 bg-white/50 border border-white/20 rounded-xl">
                        <option>Любая</option>
                        <option>Обычная</option>
                        <option>Срочно</option>
                        <option>В тот же день</option>
                      </select>
                    </div>
                  </div>
                  <Button className="bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-black border-none">
                    Применить фильтры
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
