import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { StarRating } from "@/components/ui/star-rating";
import { MediaViewer } from "@/components/media";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const ProPublic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [rating, setRating] = useState<{ avg_score: number; rating_count: number }>({ avg_score: 0, rating_count: 0 });
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Загружаем профиль пользователя (имя, фамилию, аватар)
      const { data: userProf } = await supabase
        .from("profiles").select("first_name,last_name,full_name,avatar_url")
        .eq("id", id).maybeSingle();
      
      if (userProf) {
        setUserProfile(userProf);
      }
      
      // Загружаем профессиональный профиль
      const { data: prof } = await supabase
        .from("pro_profiles").select("user_id,bio,radius_km,hourly_rate_cents,fixed_price_cents")
        .eq("user_id", id).maybeSingle();
      
      if (!prof) { 
        navigate('/catalog'); 
        return; 
      }
      setProfile(prof);

      // Загружаем категории специалиста
      const { data: catsLinks } = await supabase
        .from("pro_services").select("category_id").eq("pro_id", id);
      const catIds = (catsLinks || []).map((x: any) => x.category_id);
      let cats: any[] = [];
      if (catIds.length > 0) {
        const { data: catsData } = await supabase
          .from("service_categories").select("id,name,name_ro")
          .in("id", catIds);
        cats = catsData || [];
      }
      setCategories(cats);

      // Загружаем рейтинг
      const { data: stat } = await supabase
        .from("pro_rating_stats").select("avg_score,rating_count")
        .eq("pro_id", id).maybeSingle();
      if (stat) setRating({ avg_score: Number(stat.avg_score||0), rating_count: stat.rating_count||0 });

      // Загружаем портфолио с медиа
      const { data: items } = await supabase
        .from("portfolio_items")
        .select(`
          id, image_url, title, description,
          portfolio_media (
            id, file_url, file_type, display_order
          )
        `)
        .eq("pro_id", id)
        .order("created_at", { ascending: false })
        .limit(6);
      setPortfolio(items || []);
    })();
  }, [id, navigate]);

  
  // Компонент карусели для портфолио
  const PortfolioCarousel = ({ item }: { item: any }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalIndex, setModalIndex] = useState(0);
    
    // Собираем все изображения (основное + медиа)
    const allMedia = [
      ...(item.portfolio_media || []).sort((a: any, b: any) => a.display_order - b.display_order),
      ...(item.image_url ? [{ file_url: item.image_url, file_type: 'image/jpeg' }] : [])
    ];
    
    if (allMedia.length === 0) return null;
    
    if (allMedia.length === 1) {
      return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <div className="w-full h-40 cursor-zoom-in rounded-md overflow-hidden">
              <OptimizedImage
                src={allMedia[0].file_url}
                alt={item.title || 'Работа специалиста'}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                bucket="portfolio"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full p-2">
            <OptimizedImage
              src={allMedia[0].file_url}
              alt={item.title || 'Работа специалиста'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              bucket="portfolio"
            />
          </DialogContent>
        </Dialog>
      );
    }

    const nextImage = () => {
      setCurrentIndex((prev) => (prev + 1) % allMedia.length);
    };

    const prevImage = () => {
      setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    };

    const nextModalImage = () => {
      setModalIndex((prev) => (prev + 1) % allMedia.length);
    };

    const prevModalImage = () => {
      setModalIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    };

    const openModal = (index: number) => {
      setModalIndex(index);
      setIsModalOpen(true);
    };

    return (
      <>
        <div className="relative w-full h-40 rounded-md overflow-hidden group">
          <div 
            className="w-full h-full cursor-zoom-in"
            onClick={() => openModal(currentIndex)}
          >
            <OptimizedImage
              src={allMedia[currentIndex]?.file_url}
              alt={`${item.title || 'Работа специалиста'} - ${currentIndex + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              bucket="portfolio"
            />
          </div>
          
          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Media Count Badge */}
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
            {currentIndex + 1} / {allMedia.length}
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {allMedia.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        </div>

        {/* Full Size Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-6xl w-full p-2">
            <div className="relative">
              <OptimizedImage
                src={allMedia[modalIndex]?.file_url}
                alt={`${item.title || 'Работа специалиста'} - ${modalIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                bucket="portfolio"
              />
              
              {/* Modal Navigation */}
              {allMedia.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 p-0 backdrop-blur-sm rounded-full"
                    onClick={prevModalImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 p-0 backdrop-blur-sm rounded-full"
                    onClick={nextModalImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  {/* Modal Counter */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {modalIndex + 1} / {allMedia.length}
                  </div>

                  {/* Modal Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {allMedia.map((_, index) => (
                      <button
                        key={index}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === modalIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        onClick={() => setModalIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const catLabels = useMemo(() => categories.map((c:any)=> c.name || c.name_ro).join(', '), [categories]);
  
  // Формируем отображаемое имя
  const displayName = userProfile?.full_name || 
    (userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}` 
      : null) || `Специалист #${String(id).slice(0,8)}`;
  
  const initials = userProfile?.full_name 
    ? userProfile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase();

  if (!profile || !userProfile) return (
    <main className="container mx-auto py-12">
      <section className="max-w-4xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section>
    </main>
  );

  return (
    <main>
      <Seo title={`ServiceHub — ${displayName}`} description={`Профиль специалиста ${displayName}`} canonical={`/pro/${id}`} />
      <section className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto card-surface">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0">
                <img 
                  src={userProfile.avatar_url || ''} 
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover bg-muted"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-20 h-20 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-lg">
                  {initials}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold mb-2">{displayName}</h1>
                <p className="text-sm text-muted-foreground mb-2">Категории: {catLabels || '—'}</p>
                <div className="flex items-center gap-2 mb-2">
                  <StarRating 
                    rating={rating.avg_score} 
                    size="sm" 
                    showValue 
                    showCount 
                    count={rating.rating_count}
                  />
                </div>
                <p className="text-sm mt-2">Ставки: {profile.hourly_rate_cents ? `${formatPrice(profile.hourly_rate_cents)}/ч` : 'по договоренности'}{profile.fixed_price_cents ? ` • фикс. ${formatPrice(profile.fixed_price_cents)}` : ''}</p>
                <p className="text-sm mt-4 whitespace-pre-wrap">{profile.bio || 'Описание отсутствует'}</p>
              </div>
            </div>
            <div className="shrink-0">
              <Link to={`/job/new?${new URLSearchParams({ category_id: categories[0]?.id || '', pro_id: String(id) })}`} className="btn-hero">Забронировать</Link>
            </div>
          </div>

          {portfolio.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-3">Портфолио</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {portfolio.map((item) => (
                  <figure key={item.id} className="border rounded-md overflow-hidden">
                    <PortfolioCarousel item={item} />
                    {item.title && <figcaption className="p-2 text-sm">{item.title}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ProPublic;
