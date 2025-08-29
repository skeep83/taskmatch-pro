import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Link } from "react-router-dom";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { Clock, Euro, Users, Eye, Gavel, Trophy, Timer } from "lucide-react";
import tendersImage from "@/assets/tenders-auction.jpg";

const TendersList = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <main className="min-h-screen">
      <Seo title={`${t('app.name')} — Тендеры`} description="Открытые тендеры с аукционной системой" canonical="/tenders" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={tendersImage} alt="Tenders" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 to-pink-600/80" />
        </div>
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Открытые тендеры
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Участвуйте в аукционах Vickrey и выигрывайте проекты по справедливой цене
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <AnimatedIcon icon={Gavel} className="text-yellow-300" />
                  <span>Аукцион Vickrey</span>
                </div>
              </FloatingCard>
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <AnimatedIcon icon={Trophy} className="text-gold" />
                  <span>BAFO система</span>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </section>

      {/* Tenders List */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <GlassMorphism className="p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Активные тендеры</h2>
                <p className="text-muted-foreground">Подавайте заявки на интересные проекты</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{items.length}</div>
                <div className="text-sm text-muted-foreground">открытых тендеров</div>
              </div>
            </div>
          </GlassMorphism>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-muted-foreground">Загружаем тендеры...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {items.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-xl font-semibold mb-2">Нет открытых тендеров</h2>
                  <p className="text-muted-foreground">Новые тендеры появятся в ближайшее время</p>
                </div>
              ) : (
                items.map((tender) => (
                  <FloatingCard key={tender.id} className="tender-card group hover:scale-[1.02] transition-all duration-300">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2 bg-purple-500/10 text-purple-700 border-purple-200">
                            {tender.categories?.label_ru || "Тендер"}
                          </Badge>
                          <h3 className="font-semibold text-lg mb-2">
                            {tender.title || `Тендер #${String(tender.id).slice(0, 8)}`}
                          </h3>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                            {tender.status === 'open' ? 'Открыт' : tender.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {tender.description}
                      </p>
                      
                      <div className="space-y-3 mb-6">
                        {tender.budget_max_cents && (
                          <div className="flex items-center gap-2">
                            <Euro className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              Бюджет до {formatPrice(tender.budget_max_cents)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">
                            {tender.bids?.length || 0} заявок подано
                          </span>
                        </div>
                        
                        {tender.window_to && (
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-orange-500" />
                            <span className="text-sm">
                              Осталось: {getTimeRemaining(tender.window_to)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="text-xs text-muted-foreground">
                          Создан {new Date(tender.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/tenders/${tender.id}`} className="btn-ghost p-2">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link to={`/tenders/${tender.id}`} className="btn-hero">
                            Подать заявку
                          </Link>
                        </div>
                      </div>
                    </div>
                  </FloatingCard>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default TendersList;
