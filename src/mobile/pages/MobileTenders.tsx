import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useMobile } from "@/mobile/providers/MobileProvider";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MobileCard } from "@/mobile/components/ui/MobileCard";
import { MobileHeader } from "@/mobile/components/navigation/MobileHeader";
import { Button } from "@/components/ui/button";
import { Clock, Euro, Users, Eye, Gavel, Trophy, Timer, RefreshCw, Grid, List, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MobileTenders = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const { safeAreaInsets } = useMobile();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { formatPrice } = useCurrency();

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

  const tabItems = [
    { id: "active", label: t("ui.aktivnye"), icon: Gavel },
    { id: "completed", label: t("ui.zavershennye"), icon: Trophy },
    { id: "my-bids", label: t("ui.moi_predlozheniia"), icon: Users },
    { id: "stats", label: t("dash.client.stats"), icon: Euro }
  ];

  return (
    <div className="min-h-screen bg-neo">
      <Seo title={`${t('app.name')} — Бизнес-тендеры`} description={t("ui.tendery_dlia_kompanii_i")} canonical="/tenders" />

      <MobileHeader
        title={t("dash.pro.biz_tenders")}
        showBack={true}
        showNotifications={true}
      />

      <div
        className="pt-20 pb-24 px-4 space-y-6"
        style={{ paddingTop: `${80 + safeAreaInsets.top}px` }}
      >
        {/* Hero Section */}
        <MobileCard className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neo neo-8 flex items-center justify-center">
            <Gavel className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Бизнес-тендеры
          </h1>
          <p className="text-muted-foreground text-sm">
            Отдельный контур для компаний и крупных закупок
          </p>
        </MobileCard>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <MobileCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">{items.length}</div>
                <div className="text-xs text-muted-foreground">{t("ui.otkrytyh")}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-neo neo-4 flex items-center justify-center">
                <Gavel className="w-5 h-5 text-primary" />
              </div>
            </div>
          </MobileCard>

          <MobileCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {items.reduce((sum, tender) => sum + (tender.bids?.length || 0), 0)}
                </div>
                <div className="text-xs text-muted-foreground">{t("ui.otklikov")}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-neo neo-4 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </MobileCard>
        </div>

        {/* Mobile Tabs */}
        <MobileCard className="p-2">
          <div className="grid grid-cols-4 gap-2">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center p-4 rounded-xl transition-all duration-300 w-full aspect-square ${
                  activeTab === tab.id
                    ? "bg-neo neo-inset-4 text-primary"
                    : "bg-neo neo-2 text-muted-foreground hover:text-primary hover:neo-1"
                }`}
              >
                <tab.icon className="h-8 w-8" />
                {activeTab === tab.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary neo-1"
                  />
                )}
              </button>
            ))}
          </div>
        </MobileCard>

        {/* Active Tab Content */}
        {activeTab === "active" && (
          <>
            {/* View Toggle */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t("ui.aktivnye_biznes_tendery")}</h2>
              <div className="flex gap-1 p-1 rounded-lg bg-neo neo-inset-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === "list"
                      ? "bg-neo neo-2 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <List className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === "grid"
                      ? "bg-neo neo-2 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Grid className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Tenders List */}
            {loading ? (
              <MobileCard className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neo neo-4 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">{t("ui.zagruzhaem_biznes_zakazy")}</p>
              </MobileCard>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4" : "space-y-4"}>
                {items.length === 0 ? (
                  <MobileCard className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neo neo-4 flex items-center justify-center">
                      <Trophy className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">{t("ui.net_otkrytyh_biznes_tenderov")}</h3>
                    <p className="text-muted-foreground text-sm">{t("ui.kogda_poiaviatsia_novye_korporativnye")}</p>
                  </MobileCard>
                ) : (
                  items.map((tender, index) => (
                    <motion.div
                      key={tender.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <MobileCard pressable>
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Badge
                                variant="outline"
                                className="mb-2 bg-neo neo-2 border-0 text-primary text-xs"
                              >
                                {tender.categories?.label_ru || t("dash.pro.tender_fallback")}
                              </Badge>
                              <h3 className="font-bold text-base leading-tight">
                                {tender.title || `Тендер #${String(tender.id).slice(0, 8)}`}
                              </h3>
                            </div>
                            <Badge
                              variant="default"
                              className="bg-green-500/20 text-green-700 border-0 text-xs"
                            >
                              Открыт
                            </Badge>
                          </div>

                          {/* Description */}
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {tender.description}
                          </p>

                          {/* Stats Row */}
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            {tender.budget_max_cents && (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-neo neo-2 flex items-center justify-center">
                                  <Euro className="w-3 h-3 text-green-500" />
                                </div>
                                <span className="font-medium">
                                  до {formatPrice(tender.budget_max_cents)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-neo neo-2 flex items-center justify-center">
                                <Users className="w-3 h-3 text-blue-500" />
                              </div>
                              <span className="font-medium">
                                {tender.bids?.length || 0} откликов
                              </span>
                            </div>

                            {tender.deadline && (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-neo neo-2 flex items-center justify-center">
                                  <Timer className="w-3 h-3 text-orange-500" />
                                </div>
                                <span className="font-medium">
                                  {getTimeRemaining(tender.deadline)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/20">
                            <div className="text-xs text-muted-foreground">
                              {new Date(tender.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                              <Link
                                to={`/tenders/${tender.id}`}
                                className="w-8 h-8 rounded-lg bg-neo neo-2 hover:neo-1 transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-primary"
                              >
                                <Eye className="w-3 h-3" />
                              </Link>
                              <Link
                                to={`/tenders/${tender.id}`}
                                className="px-3 py-1.5 rounded-lg bg-primary neo-2 hover:neo-1 transition-all duration-300 text-white text-xs font-medium"
                              >
                                Откликнуться
                              </Link>
                            </div>
                          </div>
                        </div>
                      </MobileCard>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Other Tabs Placeholder */}
        {activeTab !== "active" && (
          <MobileCard className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neo neo-4 flex items-center justify-center">
              {activeTab === "completed" && <Trophy className="h-8 w-8 text-muted-foreground" />}
              {activeTab === "my-bids" && <Users className="h-8 w-8 text-muted-foreground" />}
              {activeTab === "stats" && <Euro className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="font-semibold mb-2">
              {activeTab === "completed" && t("ui.zavershennye_biznes_tendery")}
              {activeTab === "my-bids" && t("ui.moi_predlozheniia")}
              {activeTab === "stats" && t("dash.client.stats")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {activeTab === "completed" && t("ui.zdes_budut_otobrazhatsia_zavershennye_2")}
              {activeTab === "my-bids" && t("ui.zdes_budut_otobrazhatsia_vashi_2")}
              {activeTab === "stats" && t("ui.zdes_budet_otobrazhatsia_statistika_2")}
            </p>
          </MobileCard>
        )}

        {/* Floating Action Button */}
        <Link
          to="/tenders/new"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-primary neo-8 hover:neo-4 transition-all duration-300 flex items-center justify-center text-white z-10"
          style={{ bottom: `${80 + safeAreaInsets.bottom}px` }}
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
};

export default MobileTenders;
