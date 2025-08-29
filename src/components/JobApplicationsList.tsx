
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { Clock, Shield, MessageSquare, CheckCircle, User, ExternalLink } from 'lucide-react';
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
  rating?: {
    avg_score: number;
    rating_count: number;
  };
  portfolio?: Array<{
    id: string;
    image_url: string;
    title?: string;
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
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name, avatar_url')
            .eq('id', proposal.pro_id)
            .single();
          
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
        // Загружаем рейтинг
        const { data: ratingData } = await supabase
          .from('pro_rating_stats')
          .select('avg_score, rating_count')
          .eq('pro_id', app.pro_id)
          .maybeSingle();

        // Загружаем портфолио (первые 3 работы)
        const { data: portfolioData } = await supabase
          .from('portfolio_items')
          .select('id, image_url, title')
          .eq('pro_id', app.pro_id)
          .order('created_at', { ascending: false })
          .limit(3);

        enhancedApplications.push({
          ...app,
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
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={application.profiles?.avatar_url || ''} alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold flex items-center gap-2 truncate">
                      <span className="truncate">{displayName}</span>
                      {isSelected && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Специалист</Badge>
                      {application.rating && application.rating.rating_count > 0 && (
                        <StarRating 
                          rating={application.rating.avg_score} 
                          size="sm" 
                          showValue 
                          showCount 
                          count={application.rating.rating_count}
                          className="text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(application.price_cents / 100)} ₽
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(application.created_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {application.note && (
                  <div>
                    <p className="text-sm font-medium mb-1">Комментарий:</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {application.note}
                    </p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm">
                  {application.eta_slot && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>Время: {application.eta_slot}</span>
                    </div>
                  )}
                  {application.warranty_days && application.warranty_days > 0 && (
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>Гарантия: {application.warranty_days} дн.</span>
                    </div>
                  )}
                </div>

                {application.portfolio && application.portfolio.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Портфолио:</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {application.portfolio.map((item) => (
                        <div key={item.id} className="flex-shrink-0">
                          <OptimizedImage
                            src={item.image_url}
                            alt={item.title || 'Работа специалиста'}
                            className="w-16 h-16 rounded object-cover"
                            bucket="portfolio"
                            enableZoom
                          />
                        </div>
                      ))}
                    </div>
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
                        {application.portfolio && application.portfolio.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Портфолио</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {application.portfolio.map((item) => (
                                <div key={item.id} className="aspect-square">
                                  <OptimizedImage
                                    src={item.image_url}
                                    alt={item.title || 'Работа специалиста'}
                                    className="w-full h-full rounded object-cover"
                                    bucket="portfolio"
                                    enableZoom
                                  />
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
