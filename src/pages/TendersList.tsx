import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { Link } from "react-router-dom";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Euro, Users, Eye, Gavel, Trophy, Timer, RefreshCw, Filter, Grid, List } from "lucide-react";
import tendersImage from "@/assets/tenders-auction.jpg";
import MobileTenders from "@/mobile/pages/MobileTenders";
import { supabase } from "@/integrations/supabase/client";

const TendersList = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { isMobile } = useDeviceDetection();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { formatPrice } = useCurrency();

  // Mobile version
  if (isMobile) {
    return <MobileTenders />;
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await (supabase as any)
          .from('tenders')
          .select(`
            id, title, description, status, created_at, deadline, budget_max_cents,
            bids(id, price_cents, created_at),
            categories(label_ru, key)
          `)
          .eq('status','open')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setItems(data || []);
      } catch (error) {
        console.error('Error loading tenders:', error);
        toast({ title: "Ошибка загрузки тендеров", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const getTimeRemaining = (windowTo: string) => {
    const now = new Date();
    const end = new Date(windowTo);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Завершен";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}д ${hours % 24}ч`;
    }

    return `${hours}ч ${minutes}м`;
  };

  return (
    <main className="min-h-screen">
      <Seo title={`${t('app.name')} — Бизнес-заказы`} description="Корпоративные заказы и закупки для компаний" canonical="/tenders" />

      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Бизнес-заказы
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Отдельный контур для корпоративных заказов и крупных закупок
          </p>

          <div className="flex flex-wrap gap-6 justify-center mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                <Gavel className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Корпоративные закупки</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">BAFO система</span>
            </motion.div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="p-2 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]">
              <TabsList className="grid w-full grid-cols-4 bg-transparent">
                <TabsTrigger value="active" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Gavel className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Активные</span>
                  {activeTab === "active" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Trophy className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Завершенные</span>
                  {activeTab === "completed" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="my-bids" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Users className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Мои предложения</span>
                  {activeTab === "my-bids" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="stats" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Euro className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">Статистика</span>
                  {activeTab === "stats" && (
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

            {/* Active Tenders Tab */}
            <TabsContent value="active" className="space-y-8 mt-8">
              {/* Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Gavel} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{items.length}</div>
                      <div className="text-sm text-muted-foreground">Открытых бизнес-заказов</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Users} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {items.reduce((sum, tender) => sum + (tender.bids?.length || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Всего предложений</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Euro} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {formatPrice(
                          items.reduce((sum, tender) => sum + (tender.budget_max_cents || 0), 0)
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">Общий бюджет</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Timer} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">24ч</div>
                      <div className="text-sm text-muted-foreground">Среднее время</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold">Активные бизнес-заказы</h2>
                <div className="flex gap-2 p-1 rounded-xl bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      viewMode === "grid"
                        ? "bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      viewMode === "list"
                        ? "bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tenders List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <p className="text-muted-foreground">Загружаем тендеры...</p>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid lg:grid-cols-2 gap-8" : "space-y-6"}>
                  {items.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] flex items-center justify-center">
                        <Trophy className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Нет открытых тендеров</h2>
                      <p className="text-muted-foreground">Новые тендеры появятся в ближайшее время</p>
                    </div>
                  ) : (
                    items.map((tender, index) => (
                      <motion.div
                        key={tender.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-8 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] transition-all duration-300 group"
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <Badge
                              variant="outline"
                              className="mb-3 bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] border-0 text-primary"
                            >
                              {tender.categories?.label_ru || "Тендер"}
                            </Badge>
                            <h3 className="font-display font-bold text-xl mb-2">
                              {tender.title || `Тендер #${String(tender.id).slice(0, 8)}`}
                            </h3>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="default"
                              className="bg-green-500/20 text-green-700 border-0 shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]"
                            >
                              {tender.status === 'open' ? 'Открыт' : tender.status}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-6 line-clamp-2">
                          {tender.description}
                        </p>

                        <div className="space-y-4 mb-8">
                          {tender.budget_max_cents && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                                <Euro className="w-4 h-4 text-green-500" />
                              </div>
                              <span className="text-sm font-medium">
                                Бюджет до {formatPrice(tender.budget_max_cents)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium">
                              {tender.bids?.length || 0} откликов подано
                            </span>
                          </div>

                          {tender.deadline && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                                <Timer className="w-4 h-4 text-orange-500" />
                              </div>
                              <span className="text-sm font-medium">
                                Осталось: {getTimeRemaining(tender.deadline)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-white/20">
                          <div className="text-xs text-muted-foreground font-medium">
                            Создан {new Date(tender.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex gap-3">
                            <Link
                              to={`/tenders/${tender.id}`}
                              className="w-12 h-12 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] hover:shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-primary"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/tenders/${tender.id}`}
                              className="px-6 py-3 rounded-xl bg-primary shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] hover:shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] transition-all duration-300 text-white font-medium"
                            >
                              Откликнуться
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Other Tabs Content (Placeholder) */}
            <TabsContent value="completed" className="space-y-8 mt-8">
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Завершенные тендеры</h2>
                <p className="text-muted-foreground">Здесь будут отображаться завершенные тендеры</p>
              </div>
            </TabsContent>

            <TabsContent value="my-bids" className="space-y-8 mt-8">
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] flex items-center justify-center">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Мои предложения</h2>
                <p className="text-muted-foreground">Здесь будут отображаться ваши предложения по бизнес-заказам</p>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-8 mt-8">
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] flex items-center justify-center">
                  <Euro className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Статистика</h2>
                <p className="text-muted-foreground">Здесь будет отображаться статистика по тендерам</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
};

export default TendersList;
