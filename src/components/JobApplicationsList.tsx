
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { Clock, Shield, MessageSquare, CheckCircle, User, ExternalLink, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

interface JobApplication {
  id: string;
  price_cents: number;
  eta_slot?: string;
  note?: string;
  warranty_days?: number;
  created_at: string;
  pro_id: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  proProfile?: {
    bio?: string;
    hourly_rate_cents?: number;
    fixed_price_cents?: number;
    radius_km?: number;
  };
  rating?: {
    avg_score: number;
    rating_count: number;
  };
  portfolio?: Array<{
    id: string;
    image_url: string;
    title?: string;
    portfolio_media?: Array<{
      id: string;
      file_url: string;
      file_type: string;
      display_order: number;
    }>;
  }>;
}

interface JobApplicationsListProps {
  jobId: string;
  jobStatus: string;
  selectedProId?: string;
  onApplicationSelect?: (applicationId: string) => void;
}

export const JobApplicationsList = ({ 
  jobId, 
  jobStatus, 
  selectedProId,
  onApplicationSelect 
}: JobApplicationsListProps) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    fetchApplications();
  }, [jobId]);

  const fetchApplications = async () => {
    try {
      // Получаем обычные отклики
      const { data: regularApplications, error: appError } = await supabase
        .from('job_applications')
        .select(`
          *,
          profiles!inner(first_name, last_name, full_name, avatar_url)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (appError) throw appError;

      // Получаем предложения цены отдельно
      const { data: priceProposals, error: priceError } = await supabase
        .from('job_price_proposals')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (priceError) throw priceError;

      // Для каждого предложения цены загружаем профиль, рейтинг и портфолио
      const priceProposalsWithProfiles = [];
      if (priceProposals && priceProposals.length > 0) {
        for (const proposal of priceProposals) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name, avatar_url')
            .eq('id', proposal.pro_id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error loading profile for', proposal.pro_id, profileError);
          }
          
          priceProposalsWithProfiles.push({
            ...proposal,
            profiles: profile
          });
        }
      }

      // Дополняем данные рейтингом и портфолио для всех откликов
      const allApplications = [
        ...(regularApplications || []),
        ...priceProposalsWithProfiles
      ];

      // Загружаем рейтинг и портфолио для каждого специалиста
      const enhancedApplications = [];
      for (const app of allApplications) {
        // Загружаем данные профиля если они не загружены
        let profileData = app.profiles;
        if (!profileData) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name, avatar_url')
            .eq('id', app.pro_id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error loading profile for', app.pro_id, profileError);
          }
          profileData = profile;
        }

        // Загружаем дополнительные данные профиля (био и другие детали)
        const { data: proProfile, error: proProfileError } = await supabase
          .from('pro_profiles')
          .select('bio, hourly_rate_cents, fixed_price_cents, radius_km')
          .eq('user_id', app.pro_id)
          .maybeSingle();
        
        if (proProfileError) {
          console.error('Error loading pro profile for', app.pro_id, proProfileError);
        }

        // Загружаем рейтинг
        const { data: ratingData, error: ratingError } = await supabase
          .from('pro_rating_stats')
          .select('avg_score, rating_count')
          .eq('pro_id', app.pro_id)
          .maybeSingle();

        if (ratingError) {
          console.error('Error loading rating for', app.pro_id, ratingError);
        }

        // Загружаем портфолио (первые 3 работы) с медиа
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolio_items')
          .select(`
            id, image_url, title,
            portfolio_media (
              id, file_url, file_type, display_order
            )
          `)
          .eq('pro_id', app.pro_id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (portfolioError) {
          console.error('Error loading portfolio for', app.pro_id, portfolioError);
        }

        enhancedApplications.push({
          ...app,
          profiles: profileData,
          proProfile: proProfile,
          rating: ratingData ? {
            avg_score: Number(ratingData.avg_score || 0),
            rating_count: ratingData.rating_count || 0
          } : { avg_score: 0, rating_count: 0 },
          portfolio: portfolioData || []
        });
      }

      setApplications(enhancedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить отклики',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApplication = async (applicationId: string) => {
    setSelecting(applicationId);
    try {
      const { error } = await supabase.functions.invoke('job-application-select', {
        body: { applicationId, jobId }
      });

      if (error) throw error;

      toast({
        title: 'Специалист выбран',
        description: 'Мы уведомили специалиста о выборе'
      });

      if (onApplicationSelect) {
        onApplicationSelect(applicationId);
      }
    } catch (error: any) {
      console.error('Error selecting application:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось выбрать специалиста',
        variant: 'destructive'
      });
    } finally {
      setSelecting(null);
    }
  };

  // Portfolio Carousel for Modal
  const PortfolioCarousel = ({ media, title }: { media: any[], title: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalIndex, setModalIndex] = useState(0);
    
    if (!media || media.length === 0) {
      return (
        <div className="w-full h-24 bg-muted flex items-center justify-center rounded-lg">
          <Image className="h-6 w-6 text-muted-foreground" />
        </div>
      );
    }

    if (media.length === 1) {
      return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <div className="w-full h-24 cursor-zoom-in rounded-lg overflow-hidden">
              <OptimizedImage
                src={media[0].file_url || media[0].image_url}
                alt={title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                bucket="portfolio"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full p-2">
            <OptimizedImage
              src={media[0].file_url || media[0].image_url}
              alt={title}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              bucket="portfolio"
            />
          </DialogContent>
        </Dialog>
      );
    }

    const nextImage = () => {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    };

    const prevImage = () => {
      setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const nextModalImage = () => {
      setModalIndex((prev) => (prev + 1) % media.length);
    };

    const prevModalImage = () => {
      setModalIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const openModal = (index: number) => {
      setModalIndex(index);
      setIsModalOpen(true);
    };

    return (
      <>
        <div className="relative w-full h-24 rounded-lg overflow-hidden group">
          <div 
            className="w-full h-full cursor-zoom-in"
            onClick={() => openModal(currentIndex)}
          >
            <OptimizedImage
              src={media[currentIndex]?.file_url || media[currentIndex]?.image_url}
              alt={`${title} - ${currentIndex + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              bucket="portfolio"
            />
          </div>
          
          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-5 w-5 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-5 w-5 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>

          {/* Media Count Badge */}
          <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
            <Image className="h-2 w-2" />
            {media.length}
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {media.map((_, index) => (
              <button
                key={index}
                className={`w-1 h-1 rounded-full transition-colors ${
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
                src={media[modalIndex]?.file_url || media[modalIndex]?.image_url}
                alt={`${title} - ${modalIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                bucket="portfolio"
              />
              
              {/* Modal Navigation */}
              {media.length > 1 && (
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
                    {modalIndex + 1} / {media.length}
                  </div>

                  {/* Modal Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {media.map((_, index) => (
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

  if (loading) {
    return <div className="text-center py-8">Загрузка откликов...</div>;
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Пока нет откликов</h3>
          <p className="text-muted-foreground">
            Специалисты скоро увидят ваш заказ и начнут откликаться
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">
        Отклики специалистов ({applications.length})
      </h3>
      
      {applications.map((application) => {
        const isSelected = selectedProId === application.pro_id;
        const canSelect = jobStatus === 'new' && !selectedProId;
        
        // Формируем имя специалиста
        const profileName = application.profiles?.full_name || 
          (application.profiles?.first_name && application.profiles?.last_name 
            ? `${application.profiles.first_name} ${application.profiles.last_name}` 
            : null);
        const displayName = profileName || 'Новый специалист';
        const initials = profileName 
          ? profileName.split(' ').map(n => n[0]).join('').toUpperCase()
          : 'НС';
        
        return (
          <Card key={application.id} className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage src={application.profiles?.avatar_url || ''} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold flex items-center gap-2 mb-1">
                        <span className="truncate">{displayName}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      </h4>
                       <div className="flex items-center gap-2">
                         <Badge variant="secondary" className="text-xs">Специалист</Badge>
                         {application.rating && application.rating.rating_count > 0 ? (
                           <StarRating 
                             rating={application.rating.avg_score} 
                             size="sm" 
                             showValue={false}
                             readonly 
                           />
                         ) : (
                           <span className="text-xs text-muted-foreground">Новый специалист</span>
                         )}
                       </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-primary whitespace-nowrap">
                        {formatPrice(application.price_cents)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(application.created_at), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm">
                    {application.eta_slot && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate">Время: {application.eta_slot}</span>
                      </div>
                    )}
                    {application.warranty_days && application.warranty_days > 0 && (
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="whitespace-nowrap">Гарантия: {application.warranty_days} дн.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
                {application.note && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Комментарий к отклику:</p>
                    <p className="text-sm">{application.note}</p>
                  </div>
                )}

                {application.portfolio && application.portfolio.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Портфолио:</p>
                    <PortfolioCarousel 
                      media={application.portfolio.flatMap(item => [
                        ...(item.portfolio_media || []).sort((a, b) => a.display_order - b.display_order),
                        ...(item.image_url ? [{ file_url: item.image_url, file_type: 'image/jpeg' }] : [])
                      ])}
                      title={`Работы ${displayName}`}
                    />
                  </div>
                )}

                {application.proProfile?.bio && (
                  <div>
                    <p className="text-sm font-medium mb-1">О специалисте:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {application.proProfile.bio}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <User className="w-4 h-4 mr-1" />
                        Профиль
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={application.profiles?.avatar_url || ''} alt={displayName} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {displayName}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {application.rating && (
                          <div className="flex items-center gap-2">
                            <StarRating 
                              rating={application.rating.avg_score} 
                              size="md" 
                              showValue 
                              showCount 
                              count={application.rating.rating_count}
                            />
                          </div>
                        )}
                        {application.proProfile?.bio && (
                          <div>
                            <h4 className="font-medium mb-1">О специалисте</h4>
                            <p className="text-sm text-muted-foreground">{application.proProfile.bio}</p>
                          </div>
                        )}
                        {application.proProfile && (application.proProfile.hourly_rate_cents || application.proProfile.fixed_price_cents) && (
                          <div>
                            <h4 className="font-medium mb-1">Тарифы</h4>
                            <div className="text-sm text-muted-foreground">
                               {application.proProfile.hourly_rate_cents && (
                                 <span>Почасовая: {formatPrice(application.proProfile.hourly_rate_cents)}/час</span>
                               )}
                              {application.proProfile.hourly_rate_cents && application.proProfile.fixed_price_cents && ' • '}
                               {application.proProfile.fixed_price_cents && (
                                 <span>Фиксированная: {formatPrice(application.proProfile.fixed_price_cents)}</span>
                               )}
                            </div>
                          </div>
                        )}
                        
                        {application.proProfile && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {application.proProfile.hourly_rate_cents && (
                                <div>
                                  <span className="text-muted-foreground">Почасовая ставка:</span>
                                  <div className="font-medium">${(application.proProfile.hourly_rate_cents / 100).toFixed(2)}/час</div>
                                </div>
                              )}
                              {application.proProfile.fixed_price_cents && (
                                <div>
                                  <span className="text-muted-foreground">Фиксированная ставка:</span>
                                  <div className="font-medium">${(application.proProfile.fixed_price_cents / 100).toFixed(2)}</div>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Радиус работы:</span>
                                <div className="font-medium">{application.proProfile.radius_km || 10} км</div>
                              </div>
                            </div>
                            {application.proProfile.bio && (
                              <div>
                                <span className="text-sm text-muted-foreground">О себе:</span>
                                <p className="text-sm mt-1 p-2 bg-muted/50 rounded">{application.proProfile.bio}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {application.portfolio && application.portfolio.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Портфолио</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {application.portfolio.map((item) => (
                                <div key={item.id}>
                                  <PortfolioCarousel 
                                    media={item.portfolio_media || (item.image_url ? [{ image_url: item.image_url, file_type: 'image' }] : [])}
                                    title={item.title || 'Работа'}
                                  />
                                  {item.title && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {item.title}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-center">
                          <Link to={`/pro/${application.pro_id}`} target="_blank">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Полный профиль
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {canSelect && (
                    <Button
                      onClick={() => handleSelectApplication(application.id)}
                      disabled={selecting === application.id}
                      className="flex-1"
                    >
                      {selecting === application.id ? 'Выбираю...' : 'Выбрать'}
                    </Button>
                  )}
                </div>

                 {isSelected && (
                   <div className="pt-2">
                     <Badge variant="default" className="w-full justify-center">
                       ✓ Выбранный специалист
                     </Badge>
                   </div>
                 )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
