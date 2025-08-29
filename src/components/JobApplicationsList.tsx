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
import { Clock, Shield, MessageSquare, CheckCircle, User, ExternalLink, Image, ChevronLeft, ChevronRight, RotateCcw, Star, FileText, Eye, Users, Phone, CreditCard, HelpCircle, TrendingUp, Award, BookOpen, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { JobStatusProgress } from '@/components/JobStatusProgress';

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
      file_name?: string;
    }>;
  }>;
}

interface JobApplicationsListProps {
  jobId: string;
  jobStatus: string;
  selectedProId?: string;
  onApplicationSelect: () => void;
}

export function JobApplicationsList({ 
  jobId, 
  jobStatus, 
  selectedProId, 
  onApplicationSelect 
}: JobApplicationsListProps) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  useEffect(() => {
    if (jobId) {
      fetchApplications();
    }
  }, [jobId]);

  // Real-time subscription for job applications
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job-applications-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_applications',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          console.log('New job application received:', payload);
          fetchApplications(); // Refresh applications list
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_price_proposals',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          console.log('New price proposal received:', payload);
          fetchApplications(); // Refresh applications list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      // Fetch both job applications and price proposals
      const [applicationsResponse, proposalsResponse] = await Promise.all([
        supabase
          .from('job_applications')
          .select(`
            *,
            profiles:pro_id (
              first_name,
              last_name,
              full_name,
              avatar_url
            )
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('job_price_proposals')
          .select(`
            id,
            job_id,
            pro_id,
            price_cents,
            warranty_days,
            eta_slot,
            note,
            status,
            created_at,
            updated_at
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
      ]);

      if (applicationsResponse.error) {
        console.error('Error fetching applications:', applicationsResponse.error);
      }
      
      if (proposalsResponse.error) {
        console.error('Error fetching proposals:', proposalsResponse.error);
      }

      // Combine and normalize data from both sources
      const allApplications = [
        ...(applicationsResponse.data || []),
        ...(proposalsResponse.data || [])
      ];

      if (!allApplications || allApplications.length === 0) {
        setApplications([]);
        return;
      }

      // Fetch additional data for each professional
      const enhancedApplications = await Promise.all(
        allApplications.map(async (app) => {
          try {
            // Fetch profiles data (since proposals don't include it)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name, full_name, avatar_url')
              .eq('id', app.pro_id)
              .maybeSingle();

            // Fetch pro profile
            const { data: proProfile } = await supabase
              .from('pro_profiles')
              .select('*')
              .eq('user_id', app.pro_id)
              .maybeSingle();

            // Fetch ratings
            const { data: ratings } = await supabase
              .from('ratings')
              .select('score')
              .eq('to_user_id', app.pro_id);

            let rating = null;
            if (ratings && ratings.length > 0) {
              const avg_score = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
              rating = { avg_score, rating_count: ratings.length };
            }

            // Fetch portfolio
            const { data: portfolioData } = await supabase
              .from('portfolio_items')
              .select(`
                id,
                title,
                image_url,
                portfolio_media (
                  id,
                  file_url,
                  file_type,
                  display_order,
                  file_name
                )
              `)
              .eq('pro_id', app.pro_id)
              .order('created_at', { ascending: false })
              .limit(3);

            return {
              ...app,
              profiles: profileData,
              proProfile,
              rating,
              portfolio: portfolioData || []
            };
          } catch (error) {
            console.error('Error fetching pro data:', error);
            return app;
          }
        })
      );

      setApplications(enhancedApplications);
    } catch (error) {
      console.error('Error in fetchApplications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfessional = async (proId: string) => {
    try {
      setSelecting(proId);
      
      const { error } = await supabase
        .from('jobs')
        .update({ pro_id: proId, status: 'accepted' })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Специалист выбран',
        description: 'Специалист был успешно назначен на заказ'
      });
      
      onApplicationSelect();
    } catch (error: any) {
      console.error('Error selecting professional:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось выбрать специалиста',
        variant: 'destructive'
      });
    } finally {
      setSelecting(null);
    }
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

  // Если специалист назначен, показываем статус выполнения
  if (selectedProId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">
            Специалист назначен
          </h3>
        </div>
        
        {/* Job Status Progress */}
        <div className="card-surface p-6">
          <JobStatusProgress 
            status={jobStatus as any}
            startConfirmed={false}
            endConfirmed={false}
          />
        </div>
        
        {/* Tips for working with professional */}
        <div className="card-surface p-6">
          <h4 className="text-lg font-semibold mb-4">Советы по работе со специалистом</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                Обсудите все детали работы в чате перед началом выполнения
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                Проверяйте прогресс работ через статус выполнения
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                Подтверждайте каждый этап только после проверки качества
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                Оставьте отзыв после завершения работ
              </p>
            </div>
          </div>
        </div>
      </div>
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
      
      {/* Applications List - 3D Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {applications.map((application, index) => {
            const isSelected = selectedProId === application.pro_id;
            const canSelect = jobStatus === 'new' && !selectedProId;
            
            // Формируем имя специалиста
            const profileName = application.profiles?.full_name || 
              (application.profiles?.first_name && application.profiles?.last_name 
                ? `${application.profiles.first_name} ${application.profiles.last_name}` 
                : 'Специалист');

            return (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: 15 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, y: -30, scale: 0.9, rotateX: -15 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.15,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ 
                  y: -8,
                  rotateX: 3,
                  rotateY: 1,
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                style={{ perspective: "1200px" }}
                className="card-3d"
              >
                <Card className={`
                  relative overflow-hidden rounded-2xl border-0
                  ${isSelected 
                    ? 'bg-gradient-to-br from-primary/10 via-white to-accent/5 ring-2 ring-primary/50 shadow-primary/20' 
                    : 'bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30'
                  }
                  shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.1)]
                  hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.2)]
                  backdrop-blur-sm transition-all duration-300
                `}>
                  
                  {/* Gradient Overlay for 3D effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5 pointer-events-none" />
                  
                  {/* Inner glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-60 pointer-events-none" />
                  
                  <CardContent className="relative z-10 p-8">
                    <div className="flex items-start gap-6">
                      
                      {/* Avatar with 3D effect */}
                      <motion.div
                        whileHover={{ 
                          scale: 1.1,
                          rotateY: 5,
                          transition: { duration: 0.2 }
                        }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl opacity-60" />
                        <Avatar className="relative w-20 h-20 ring-4 ring-white/80 shadow-2xl">
                          <AvatarImage 
                            src={application.profiles?.avatar_url || ''} 
                            alt={profileName}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-xl shadow-inner">
                            {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Status indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white"
                          >
                            <CheckCircle className="w-5 h-5 text-white" />
                          </motion.div>
                        )}
                      </motion.div>
                      
                      <div className="flex-1 space-y-4">
                        
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-xl text-gray-900 mb-2">{profileName}</h4>
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant="secondary" 
                                className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-0 shadow-sm"
                              >
                                Специалист
                              </Badge>
                              {isSelected && (
                                <Badge 
                                  variant="default" 
                                  className="bg-gradient-to-r from-primary to-accent text-white animate-pulse shadow-lg"
                                >
                                  ✓ Выбран
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Price with 3D effect */}
                          {application.price_cents && (
                            <motion.div 
                              className="text-right"
                              whileHover={{ scale: 1.05, rotateY: 2 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-lg blur-lg" />
                                <div className="relative bg-gradient-to-br from-white to-green-50 p-4 rounded-lg border border-green-200/50 shadow-lg">
                                  <div className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    {formatPrice(application.price_cents)}
                                  </div>
                                  <div className="text-sm text-gray-600 font-medium">
                                    Предложенная цена
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Rating */}
                        {application.rating && application.rating.rating_count > 0 && (
                          <motion.div 
                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200/50"
                            whileHover={{ scale: 1.02 }}
                          >
                            <StarRating 
                              rating={application.rating.avg_score} 
                              size="sm" 
                              showValue={false}
                              readonly 
                              className="[&>svg]:drop-shadow-sm"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {application.rating.avg_score.toFixed(1)} ({application.rating.rating_count} отзыв{application.rating.rating_count === 1 ? '' : application.rating.rating_count < 5 ? 'а' : 'ов'})
                            </span>
                          </motion.div>
                        )}

                        {/* Note */}
                        {application.note && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 rounded-lg blur-sm" />
                            <p className="relative text-gray-700 text-sm bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-blue-200/50 shadow-sm italic">
                              "{application.note}"
                            </p>
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center gap-6 text-sm text-gray-600 pt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Откликнулся: {new Date(application.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                          {application.eta_slot && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>ETA: {application.eta_slot}</span>
                            </div>
                          )}
                          {application.warranty_days && (
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span>Гарантия: {application.warranty_days} дней</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                          <div className="flex gap-3">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(`/pro/${application.pro_id}`, '_blank')}
                                className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200"
                              >
                                <User className="w-4 h-4 mr-2" />
                                Профиль
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(`/messages?user=${application.pro_id}`, '_blank')}
                                className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200"
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Написать
                              </Button>
                            </motion.div>
                          </div>
                          
                          {canSelect && (
                            <motion.div 
                              whileHover={{ scale: 1.05, y: -2 }} 
                              whileTap={{ scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Button
                                onClick={() => handleSelectProfessional(application.pro_id)}
                                disabled={selecting === application.pro_id}
                                className="relative overflow-hidden bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[140px]"
                              >
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                                
                                {selecting === application.pro_id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Выбираем...
                                  </div>
                                ) : (
                                  <>
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Выбрать
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}