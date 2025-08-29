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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">
          Отклики специалистов ({applications.length})
        </h3>
      </div>
      
      {/* Carousel Container */}
      <div className="relative">
        {/* Cards Container */}
        <div className="overflow-hidden rounded-3xl">
          <motion.div 
            className="flex transition-transform duration-500 ease-out"
            animate={{
              transform: `translateX(-${currentIndex * 100}%)`
            }}
          >
            {applications.map((application, index) => {
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
                <div key={application.id} className="w-full flex-shrink-0 px-2">
                  <motion.div
                    initial={{ opacity: 0, y: 50, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full perspective-1000"
                  >
                    <div 
                      className={`group relative overflow-hidden rounded-3xl card-3d bg-white ${
                        isSelected ? 'ring-4 ring-primary ring-opacity-50' : ''
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        boxShadow: `
                          0 25px 50px -12px rgba(0, 0, 0, 0.25),
                          0 15px 35px -5px rgba(0, 0, 0, 0.15),
                          0 0 0 1px rgba(255, 255, 255, 0.08),
                          inset 0 1px 0 rgba(255, 255, 255, 0.15),
                          inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                        `
                      }}
                    >
                      {/* Gradient Header with enhanced 3D effect */}
                      <div className="relative h-40 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 overflow-hidden">
                        {/* Additional depth layer */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                        
                        {/* Avatar with enhanced shadow */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-white/20 rounded-full blur-sm scale-110"></div>
                            <Avatar className="relative w-20 h-20 ring-4 ring-white shadow-2xl z-10">
                              <AvatarImage 
                                src={application.profiles?.avatar_url || ''} 
                                alt={displayName}
                              />
                              <AvatarFallback className="text-xl font-bold bg-white text-gray-800 shadow-inner">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        
                        {/* Profile link icon */}
                        <Link
                          to={`/pro/${application.pro_id}`}
                          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </Link>
                        
                        {/* Selected badge */}
                        {isSelected && (
                          <div className="absolute top-4 left-4">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    
                      {/* White content area */}
                      <div className="p-6 space-y-4">
                        {/* Name and bio */}
                        <div className="text-center space-y-2">
                          <h3 className="text-xl font-bold text-gray-900">{displayName}</h3>
                          <p className="text-sm text-gray-500 uppercase tracking-wide">
                            {application.proProfile?.bio ? application.proProfile.bio.substring(0, 50) + '...' : 'Специалист'}
                          </p>
                        </div>
                        
                        {/* Rating */}
                        <div className="flex items-center justify-center gap-2">
                          {application.rating && application.rating.rating_count > 0 ? (
                            <>
                              <StarRating
                                rating={application.rating.avg_score}
                                readonly
                                size="sm"
                              />
                              <span className="text-sm text-gray-500">
                                ({application.rating.rating_count})
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">Новый специалист</span>
                          )}
                        </div>
                        
                        {/* Price - prominent display */}
                        <div className="text-center">
                          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {formatPrice(application.price_cents)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(application.created_at), { 
                              addSuffix: true, 
                              locale: ru 
                            })}
                          </div>
                        </div>
                        
                        {/* ETA and warranty */}
                        <div className="flex justify-center gap-6 text-sm">
                          {application.eta_slot && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span>{application.eta_slot}</span>
                            </div>
                          )}
                          {application.warranty_days && application.warranty_days > 0 && (
                            <div className="flex items-center gap-1">
                              <Shield className="w-4 h-4 text-green-500" />
                              <span>{application.warranty_days} дн.</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
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
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>
        
        {/* Navigation Controls */}
        {applications.length > 1 && (
          <>
            {/* Arrow Navigation */}
            <Button
              variant="outline"
              size="icon"
              onClick={prevCard}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={nextCard}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
              disabled={currentIndex === applications.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      
      {/* Bottom Navigation */}
      {applications.length > 1 && (
        <div className="flex flex-col items-center gap-4">
          {/* Dots Navigation */}
          <div className="flex gap-2">
            {applications.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-primary scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
          
          {/* Counter */}
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} из {applications.length}
          </div>
        </div>
      )}
    </div>
  );
};