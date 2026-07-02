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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await (supabase as any)
          .from('tenders')
          .select(`
            id, title, description, status, created_at, deadline:window_to, budget_max_cents:budget_hint_cents,
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
        toast({ title: t("ui.oshibka_zagruzki_tenderov"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const getTimeRemaining = (windowTo: string) => {
    const now = new Date();
    const end = new Date(windowTo);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return t("biz.tenders.status_done");

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}д ${hours % 24}ч`;
    }

    return `${hours}ч ${minutes}м`;
  };

  // Mobile version (after all hooks — hooks must run unconditionally)
  if (isMobile) {
    return <MobileTenders />;
  }

  return (
    <main className="min-h-screen">
      <Seo title={`${t('app.name')} — Бизнес-заказы`} description={t("ui.korporativnye_zakazy_i_zakupki")} canonical="/tenders" />

      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("ui.biznes_zakazy")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("ui.otdelnyi_kontur_dlia_korporativnyh")}
          </p>

          <div className="flex flex-wrap gap-6 justify-center mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-neo neo-8"
            >
              <div className="w-10 h-10 rounded-xl bg-neo neo-4 flex items-center justify-center">
                <Gavel className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">{t("ui.korporativnye_zakupki")}</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-neo neo-8"
            >
              <div className="w-10 h-10 rounded-xl bg-neo neo-4 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">{t("ui.bafo_sistema")}</span>
            </motion.div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="p-2 rounded-2xl bg-neo neo-inset-8">
              <TabsList className="grid w-full grid-cols-4 bg-transparent">
                <TabsTrigger value="active" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Gavel className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("ui.aktivnye")}</span>
                  {activeTab === "active" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Trophy className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("ui.zavershennye")}</span>
                  {activeTab === "completed" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="my-bids" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Users className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("ui.moi_predlozheniia")}</span>
                  {activeTab === "my-bids" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="stats" className="relative flex items-center gap-2 bg-neo neo-8 data-[state=active]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                  <Euro className="h-5 w-5 text-black" />
                  <span className="hidden sm:inline">{t("dash.client.stats")}</span>
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
                  className="p-6 rounded-3xl bg-neo neo-8"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Gavel} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{items.length}</div>
                      <div className="text-sm text-muted-foreground">{t("ui.otkrytyh_biznes_zakazov")}</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-3xl bg-neo neo-8"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Users} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {items.reduce((sum, tender) => sum + (tender.bids?.length || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("ui.vsego_predlozhenii")}</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-3xl bg-neo neo-8"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Euro} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {formatPrice(
                          items.reduce((sum, tender) => sum + (tender.budget_max_cents || 0), 0)
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("ui.obschii_biudzhet")}</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-3xl bg-neo neo-8"
                >
                  <div className="flex items-center gap-4">
                    <NeumorphicIcon icon={Timer} size={48} variant="behance" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{t("ui.24ch")}</div>
                      <div className="text-sm text-muted-foreground">{t("ui.srednee_vremia")}</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold">{t("ui.aktivnye_biznes_zakazy")}</h2>
                <div className="flex gap-2 p-1 rounded-xl bg-neo neo-inset-4">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      viewMode === "grid"
                        ? "bg-neo neo-4 text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      viewMode === "list"
                        ? "bg-neo neo-4 text-primary"
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
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-neo neo-8 flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <p className="text-muted-foreground">{t("ui.zagruzhaem_tendery")}</p>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid lg:grid-cols-2 gap-8" : "space-y-6"}>
                  {items.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-neo neo-8 flex items-center justify-center">
                        <Trophy className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">{t("ui.net_otkrytyh_tenderov")}</h2>
                      <p className="text-muted-foreground">{t("ui.novye_tendery_poiaviatsia_v")}</p>
                    </div>
                  ) : (
                    items.map((tender, index) => (
                      <motion.div
                        key={tender.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-8 rounded-3xl bg-neo neo-8 hover:neo-4 transition-all duration-300 group"
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <Badge
                              variant="outline"
                              className="mb-3 bg-neo neo-4 border-0 text-primary"
                            >
                              {tender.categories?.label_ru || t("dash.pro.tender_fallback")}
                            </Badge>
                            <h3 className="font-display font-bold text-xl mb-2">
                              {tender.title || `Тендер #${String(tender.id).slice(0, 8)}`}
                            </h3>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="default"
                              className="bg-green-500/20 text-green-700 border-0 neo-4"
                            >
                              {tender.status === 'open' ? t("biz.tenders.status_open") : tender.status}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-6 line-clamp-2">
                          {tender.description}
                        </p>

                        <div className="space-y-4 mb-8">
                          {tender.budget_max_cents && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-neo neo-4 flex items-center justify-center">
                                <Euro className="w-4 h-4 text-green-500" />
                              </div>
                              <span className="text-sm font-medium">
                                Бюджет до {formatPrice(tender.budget_max_cents)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neo neo-4 flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium">
                              {tender.bids?.length || 0} откликов подано
                            </span>
                          </div>

                          {tender.deadline && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-neo neo-4 flex items-center justify-center">
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
                              className="w-12 h-12 rounded-xl bg-neo neo-4 hover:neo-2 transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-primary"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/tenders/${tender.id}`}
                              className="px-6 py-3 rounded-xl bg-primary neo-4 hover:neo-2 transition-all duration-300 text-white font-medium"
                            >
                              {t("dash.pro.respond")}
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
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-neo neo-8 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{t("ui.zavershennye_tendery")}</h2>
                <p className="text-muted-foreground">{t("ui.zdes_budut_otobrazhatsia_zavershennye")}</p>
              </div>
            </TabsContent>

            <TabsContent value="my-bids" className="space-y-8 mt-8">
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-neo neo-8 flex items-center justify-center">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{t("ui.moi_predlozheniia")}</h2>
                <p className="text-muted-foreground">{t("ui.zdes_budut_otobrazhatsia_vashi")}</p>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-8 mt-8">
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-neo neo-8 flex items-center justify-center">
                  <Euro className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{t("dash.client.stats")}</h2>
                <p className="text-muted-foreground">{t("ui.zdes_budet_otobrazhatsia_statistika")}</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
};

export default TendersList;
