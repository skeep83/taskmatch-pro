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
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await (supabase as any)
          .from('tenders')
          .select(`
            id, title, description, status, created_at, window_to, budget_max_cents,
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

  const tabItems = [
    { id: "active", label: "Активные", icon: Gavel },
    { id: "completed", label: "Завершенные", icon: Trophy },
    { id: "my-bids", label: "Мои заявки", icon: Users },
    { id: "stats", label: "Статистика", icon: Euro }
  ];

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
      <Seo title={`${t('app.name')} — Тендеры`} description="Открытые тендеры с аукционной системой" canonical="/tenders" />
      
      <MobileHeader 
        title="Тендеры"
        showBack={true}
        showNotifications={true}
      />
      
      <div 
        className="pt-20 pb-24 px-4 space-y-6"
        style={{ paddingTop: `${80 + safeAreaInsets.top}px` }}
      >
        {/* Hero Section */}
        <MobileCard className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] flex items-center justify-center">
            <Gavel className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Открытые тендеры
          </h1>
          <p className="text-muted-foreground text-sm">
            Участвуйте в аукционах Vickrey и выигрывайте проекты
          </p>
        </MobileCard>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <MobileCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">{items.length}</div>
                <div className="text-xs text-muted-foreground">Открытых</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
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
                <div className="text-xs text-muted-foreground">Заявок</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
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
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 min-h-[70px] ${
                  activeTab === tab.id 
                    ? "bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-primary" 
                    : "bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] text-muted-foreground hover:text-primary hover:shadow-[1px_1px_2px_#D1D5DB,-1px_-1px_2px_#F9FAFB]"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  activeTab === tab.id 
                    ? "bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB]" 
                    : "bg-transparent"
                }`}>
                  <tab.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-center leading-tight max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-1">
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary shadow-[1px_1px_2px_#D1D5DB]"
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
              <h2 className="text-lg font-bold">Активные тендеры</h2>
              <div className="flex gap-1 p-1 rounded-lg bg-[#E5E7EB] shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB]">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === "list" 
                      ? "bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] text-primary" 
                      : "text-muted-foreground"
                  }`}
                >
                  <List className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === "grid" 
                      ? "bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] text-primary" 
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
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">Загружаем тендеры...</p>
              </MobileCard>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4" : "space-y-4"}>
                {items.length === 0 ? (
                  <MobileCard className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Trophy className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Нет открытых тендеров</h3>
                    <p className="text-muted-foreground text-sm">Новые тендеры появятся в ближайшее время</p>
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
                                className="mb-2 bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] border-0 text-primary text-xs"
                              >
                                {tender.categories?.label_ru || "Тендер"}
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
                                <div className="w-6 h-6 rounded-lg bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] flex items-center justify-center">
                                  <Euro className="w-3 h-3 text-green-500" />
                                </div>
                                <span className="font-medium">
                                  до {formatPrice(tender.budget_max_cents)}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] flex items-center justify-center">
                                <Users className="w-3 h-3 text-blue-500" />
                              </div>
                              <span className="font-medium">
                                {tender.bids?.length || 0} заявок
                              </span>
                            </div>
                            
                            {tender.window_to && (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] flex items-center justify-center">
                                  <Timer className="w-3 h-3 text-orange-500" />
                                </div>
                                <span className="font-medium">
                                  {getTimeRemaining(tender.window_to)}
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
                                className="w-8 h-8 rounded-lg bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] hover:shadow-[1px_1px_2px_#D1D5DB,-1px_-1px_2px_#F9FAFB] transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-primary"
                              >
                                <Eye className="w-3 h-3" />
                              </Link>
                              <Link 
                                to={`/tenders/${tender.id}`} 
                                className="px-3 py-1.5 rounded-lg bg-primary shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] hover:shadow-[1px_1px_2px_#D1D5DB,-1px_-1px_2px_#F9FAFB] transition-all duration-300 text-white text-xs font-medium"
                              >
                                Подать заявку
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              {activeTab === "completed" && <Trophy className="h-8 w-8 text-muted-foreground" />}
              {activeTab === "my-bids" && <Users className="h-8 w-8 text-muted-foreground" />}
              {activeTab === "stats" && <Euro className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="font-semibold mb-2">
              {activeTab === "completed" && "Завершенные тендеры"}
              {activeTab === "my-bids" && "Мои заявки"}
              {activeTab === "stats" && "Статистика"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {activeTab === "completed" && "Здесь будут отображаться завершенные тендеры"}
              {activeTab === "my-bids" && "Здесь будут отображаться ваши заявки на тендеры"}
              {activeTab === "stats" && "Здесь будет отображаться статистика по тендерам"}
            </p>
          </MobileCard>
        )}

        {/* Floating Action Button */}
        <Link 
          to="/tenders/new"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-primary shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] transition-all duration-300 flex items-center justify-center text-white z-10"
          style={{ bottom: `${80 + safeAreaInsets.bottom}px` }}
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
};

export default MobileTenders;
