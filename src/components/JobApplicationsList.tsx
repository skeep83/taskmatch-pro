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
import { Clock, Shield, MessageSquare, CheckCircle, User, ExternalLink, Image, ChevronLeft, ChevronRight, RotateCcw, Star, FileText, Eye, Users, Phone, CreditCard, HelpCircle, TrendingUp, Award, BookOpen } from 'lucide-react';
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
            *,
            profiles:pro_id (
              first_name,
              last_name,
              full_name,
              avatar_url
            )
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
      
      {/* Applications List */}
      <div className="space-y-4">
        {applications.map((application, index) => {
          const isSelected = selectedProId === application.pro_id;
          const canSelect = jobStatus === 'new' && !selectedProId;
          
          // Формируем имя специалиста
          const profileName = application.profiles?.full_name || 
            (application.profiles?.first_name && application.profiles?.last_name 
              ? `${application.profiles.first_name} ${application.profiles.last_name}` 
              : 'Специалист');

          return (
            <Card key={application.id} className={`transition-all duration-300 hover:shadow-lg ${
              isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage 
                      src={application.profiles?.avatar_url || ''} 
                      alt={profileName} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">{profileName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">Специалист</Badge>
                          {isSelected && (
                            <Badge variant="default" className="bg-primary text-white">
                              Выбран
                            </Badge>
                          )}
                        </div>
                      </div>
                      {application.price_cents && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {formatPrice(application.price_cents)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Предложенная цена
                          </div>
                        </div>
                      )}
                    </div>

                    {application.note && (
                      <p className="text-muted-foreground text-sm">
                        {application.note}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Откликнулся: {new Date(application.created_at).toLocaleDateString('ru-RU')}
                      </span>
                      {application.eta_slot && (
                        <span>ETA: {application.eta_slot}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/pro/${application.pro_id}`, '_blank')}
                        >
                          <User className="w-4 h-4 mr-1" />
                          Профиль
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/messages?user=${application.pro_id}`, '_blank')}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Написать
                        </Button>
                      </div>
                      
                      {canSelect && (
                        <Button
                          onClick={() => handleSelectProfessional(application.pro_id)}
                          disabled={selecting === application.pro_id}
                          className="min-w-[120px]"
                        >
                          {selecting === application.pro_id ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Выбираем...
                            </div>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Выбрать
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}