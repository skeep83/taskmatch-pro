
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { Clock, Shield, MessageSquare, CheckCircle, User, ExternalLink, Image, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
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
  const [currentIndex, setCurrentIndex] = useState(0);
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

  // Carousel navigation functions
  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % applications.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + applications.length) % applications.length);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            Отклики специалистов
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {applications.length} {applications.length === 1 ? 'специалист откликнулся' : 'специалистов откликнулись'} на ваш заказ
          </p>
        </div>
        {applications.length > 1 && (
          <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevCard}
              className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">
                {currentIndex + 1}
              </span>
              <div className="w-8 h-0.5 bg-border relative">
                <div 
                  className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / applications.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {applications.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextCard}
              className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 transition-all duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {applications.length === 1 ? (
        // Для одного отклика показываем как обычно
        applications.map((application) => {
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
        })
      ) : (
        // Для нескольких откликов используем вертикальную круговую карусель
        <div className="relative w-full h-[700px] perspective-1000">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/50 pointer-events-none rounded-3xl" />
          
          <AnimatePresence mode="wait">
            {applications.map((application, index) => {
              const isActive = index === currentIndex;
              const isNext = index === (currentIndex + 1) % applications.length;
              const isPrev = index === (currentIndex - 1 + applications.length) % applications.length;
              
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

              // Определяем позицию и анимацию для каждой карты
              let y = 0;
              let scale = 0.85;
              let opacity = 0.4;
              let zIndex = 1;
              let rotateX = 0;
              let blur = 4;
              let brightness = 0.7;

              if (isActive) {
                y = 0;
                scale = 1;
                opacity = 1;
                zIndex = 20;
                rotateX = 0;
                blur = 0;
                brightness = 1;
              } else if (isNext) {
                y = 80;
                scale = 0.92;
                opacity = 0.8;
                zIndex = 15;
                rotateX = -8;
                blur = 1;
                brightness = 0.9;
              } else if (isPrev) {
                y = -80;
                scale = 0.92;
                opacity = 0.8;
                zIndex = 15;
                rotateX = 8;
                blur = 1;
                brightness = 0.9;
              } else {
                y = index < currentIndex ? -150 : 150;
                scale = 0.85;
                opacity = 0.4;
                zIndex = 5;
                rotateX = index < currentIndex ? 15 : -15;
                blur = 4;
                brightness = 0.7;
              }
               
              return (
                <motion.div
                  key={application.id}
                  className={`absolute inset-x-0 flex items-center justify-center ${!isActive ? 'cursor-pointer' : ''}`}
                  initial={{ y: 200, scale: 0.8, opacity: 0, rotateX: -20 }}
                  animate={{ 
                    y, 
                    scale, 
                    opacity,
                    rotateX,
                    filter: `blur(${blur}px) brightness(${brightness})`,
                    transition: { 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 35,
                      duration: 0.6
                    }
                  }}
                  exit={{ 
                    y: -200, 
                    scale: 0.8, 
                    opacity: 0,
                    rotateX: 20,
                    transition: { duration: 0.4 }
                  }}
                  style={{ zIndex }}
                  onClick={isActive ? undefined : nextCard}
                >
                  <Card className={`w-full max-w-2xl mx-auto transition-all duration-300 ${
                    isSelected ? 'ring-2 ring-primary shadow-xl shadow-primary/20' : 
                    isActive ? 'shadow-2xl shadow-black/10' : 'shadow-lg'
                  } ${isActive ? 'bg-gradient-to-br from-card to-card/95' : 'bg-card/90'} backdrop-blur-sm border-0`}>
                    <CardHeader className="pb-4 bg-gradient-to-r from-muted/30 to-transparent">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 flex-shrink-0 ring-2 ring-primary/20 ring-offset-2">
                          <AvatarImage src={application.profiles?.avatar_url || ''} alt={displayName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-lg font-bold flex items-center gap-2 mb-2">
                                <span className="truncate bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                                  {displayName}
                                </span>
                                {isSelected && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                              </h4>
                               <div className="flex items-center gap-3">
                                 <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                   Специалист
                                 </Badge>
                                 {application.rating && application.rating.rating_count > 0 ? (
                                   <StarRating 
                                     rating={application.rating.avg_score} 
                                     size="sm" 
                                     readonly 
                                     className="flex-shrink-0" 
                                   />
                                 ) : (
                                   <span className="text-xs text-muted-foreground">Новый специалист</span>
                                 )}
                               </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent whitespace-nowrap">
                                {formatPrice(application.price_cents)}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium">
                                {formatDistanceToNow(new Date(application.created_at), { 
                                  addSuffix: true, 
                                  locale: ru 
                                })}
                              </div>
                            </div>
                          </div>

                          {/* ETA и гарантия */}
                          <div className="flex flex-wrap gap-4 text-sm">
                            {application.eta_slot && (
                              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate font-medium">Время: {application.eta_slot}</span>
                              </div>
                            )}
                            {application.warranty_days && (
                              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
                                <Shield className="w-4 h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap font-medium">Гарантия: {application.warranty_days} дн.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {isActive && (
                      <CardContent className="pt-0 space-y-4 px-6 pb-6">
                        {/* Note */}
                        {application.note && (
                          <div className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
                            <p className="text-sm font-semibold mb-2 text-primary">Комментарий к отклику:</p>
                            <p className="text-sm leading-relaxed">{application.note}</p>
                          </div>
                        )}

                        {/* Portfolio */}
                        {application.portfolio && application.portfolio.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-3 text-primary">Портфолио:</p>
                            {application.portfolio.map((item) => {
                              const mediaItems = item.portfolio_media && item.portfolio_media.length > 0 
                                ? item.portfolio_media.sort((a, b) => a.display_order - b.display_order)
                                : [{ file_url: item.image_url, file_type: 'image', display_order: 0 }];
                              
                              return (
                                <PortfolioCarousel 
                                  key={item.id}
                                  media={mediaItems}
                                  title={item.title || `Работы ${displayName}`}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Bio */}
                        {application.proProfile?.bio && (
                          <div>
                            <p className="text-sm font-semibold mb-2 text-primary">О специалисте:</p>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {application.proProfile.bio}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-border/50">
                          {/* Profile Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="flex-1 h-11 font-medium hover:bg-primary/5 hover:border-primary/30 transition-all duration-200">
                                <User className="w-4 h-4 mr-2" />
                                Профиль
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Профиль специалиста</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-16 h-16">
                                    <AvatarImage src={application.profiles?.avatar_url || ''} alt={displayName} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="text-lg font-semibold">{displayName}</h3>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary">Специалист</Badge>
                                      {application.rating && application.rating.rating_count > 0 ? (
                                        <div className="flex items-center gap-1">
                                          <StarRating rating={application.rating.avg_score} size="sm" readonly />
                                          <span className="text-sm text-muted-foreground">
                                            ({application.rating.rating_count} отзывов)
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">Новый специалист</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {application.proProfile?.bio && (
                                  <div>
                                    <h4 className="font-medium mb-2">О специалисте</h4>
                                    <p className="text-sm text-muted-foreground">{application.proProfile.bio}</p>
                                  </div>
                                )}
                                
                                {/* Service Info */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {application.proProfile?.radius_km && (
                                    <div>
                                      <span className="font-medium">Радиус работы:</span>
                                      <span className="ml-1">{application.proProfile.radius_km} км</span>
                                    </div>
                                  )}
                                  {application.proProfile?.hourly_rate_cents && (
                                    <div>
                                      <span className="font-medium">Почасовая ставка:</span>
                                      <span className="ml-1">{formatPrice(application.proProfile.hourly_rate_cents)}/час</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button asChild variant="outline" className="flex-1">
                                    <Link to={`/pro/${application.pro_id}`}>
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      Полный профиль
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Select Button */}
                          {canSelect && (
                            <Button 
                              onClick={() => handleSelectApplication(application.id)}
                              disabled={selecting === application.id}
                              className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary font-semibold transition-all duration-200"
                            >
                              {selecting === application.id ? 'Выбираем...' : 'Выбрать специалиста'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Центральная кнопка для переключения */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
            <Button
              variant="outline"
              size="sm"
              onClick={nextCard}
              className="rounded-full bg-background/90 backdrop-blur-md border-2 border-primary/20 h-12 w-12 p-0 shadow-lg hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 hover:scale-110"
            >
              <RotateCcw className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
