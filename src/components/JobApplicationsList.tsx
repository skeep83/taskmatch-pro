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
      <div className="flex flex-wrap gap-8 justify-center">
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
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: [0.4, 0, 0.2, 1]
                }}
                whileHover={{ 
                  y: -12,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                className="perspective-1000"
              >
                {/* 3D Card with gradient background like reference */}
                <div className="card-3d group relative w-full max-w-xs mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden transform-gpu">
                  {/* Top gradient section */}
                  <div className="relative h-32 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/20" />
                  </div>
                  
                  {/* Avatar positioned to overlap sections - with higher z-index */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-24 z-10">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <Avatar className="w-16 h-16 ring-4 ring-white shadow-xl">
                        <AvatarImage 
                          src={application.profiles?.avatar_url || ''} 
                          alt={profileName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white font-bold text-lg">
                          {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Status indicator */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white z-20"
                        >
                          <CheckCircle className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Bottom white section */}
                  <div className="relative bg-white px-6 pt-12 pb-8">
                    {/* Name and title */}
                    <div className="text-center mb-6">
                      <h4 className="font-bold text-xl text-gray-900 mb-1">{profileName}</h4>
                      <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                        СПЕЦИАЛИСТ
                      </p>
                    </div>
                    
                    {/* Professional info instead of social icons */}
                    <div className="space-y-4 mb-6">
                      {/* Experience/Bio */}
                      <div className="text-center">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {application.proProfile?.bio || 'Опытный специалист готов выполнить вашу задачу качественно и в срок'}
                        </p>
                      </div>
                      
                      {/* Hourly rate if available */}
                      {application.proProfile?.hourly_rate_cents && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Почасовая ставка: {formatPrice(application.proProfile.hourly_rate_cents)}/час</span>
                        </div>
                      )}
                      
                      {/* Coverage radius */}
                      {application.proProfile?.radius_km && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <span>🗺️</span>
                          <span>Радиус работы: {application.proProfile.radius_km} км</span>
                        </div>
                      )}
                      
                      {/* Response time if available */}
                      {application.eta_slot && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Готов приступить: {application.eta_slot}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Price section */}
                    {application.price_cents && (
                      <div className="text-center mb-6">
                        <div className="text-3xl font-bold text-gray-900">
                          {formatPrice(application.price_cents)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Цена работы
                        </div>
                      </div>
                    )}
                    
                    {/* Rating */}
                    {application.rating && (
                      <div className="flex justify-center items-center gap-2 mb-6">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-5 h-5 ${star <= application.rating!.avg_score ? 'text-purple-500 fill-purple-500' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          ({application.rating.rating_count})
                        </span>
                      </div>
                    )}
                    
                    {/* Action button */}
                    <div className="mt-6">
                      {canSelect && (
                        <Button
                          onClick={() => handleSelectProfessional(application.pro_id)}
                          disabled={selecting === application.pro_id}
                          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {selecting === application.pro_id ? 'Выбираем...' : 'Выбрать специалиста'}
                        </Button>
                      )}
                      
                      {isSelected && (
                        <div className="w-full bg-green-100 text-green-800 font-semibold py-3 rounded-xl text-center">
                          ✓ Выбран
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}