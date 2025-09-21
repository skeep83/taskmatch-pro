import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Link } from "react-router-dom";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { Badge } from "@/components/ui/badge";
import { Clock, Euro, Users, Eye, Gavel, Trophy, Timer, RefreshCw } from "lucide-react";
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
    <main className="min-h-screen bg-[#E5E7EB]">
      <Seo title={`${t('app.name')} — Тендеры`} description="Открытые тендеры с аукционной системой" canonical="/tenders" />
      
      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6">
            Открытые тендеры
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Участвуйте в аукционах Vickrey и выигрывайте проекты по справедливой цене
          </p>
          
          <div className="flex flex-wrap gap-6 justify-center mt-8">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
              <NeumorphicIcon icon={Gavel} size={32} variant="square" />
              <span className="font-medium">Аукцион Vickrey</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
              <NeumorphicIcon icon={Trophy} size={32} variant="square" />
              <span className="font-medium">BAFO система</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-4xl mx-auto mb-12 p-8 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold mb-2">Активные тендеры</h2>
              <p className="text-muted-foreground">Подавайте заявки на интересные проекты</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{items.length}</div>
              <div className="text-sm text-muted-foreground">открытых тендеров</div>
            </div>
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
          <div className="grid lg:grid-cols-2 gap-8">
            {items.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Нет открытых тендеров</h2>
                <p className="text-muted-foreground">Новые тендеры появятся в ближайшее время</p>
              </div>
            ) : (
              items.map((tender) => (
                <div 
                  key={tender.id} 
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
                        {tender.bids?.length || 0} заявок подано
                      </span>
                    </div>
                    
                    {tender.window_to && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                          <Timer className="w-4 h-4 text-orange-500" />
                        </div>
                        <span className="text-sm font-medium">
                          Осталось: {getTimeRemaining(tender.window_to)}
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
                        Подать заявку
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default TendersList;
