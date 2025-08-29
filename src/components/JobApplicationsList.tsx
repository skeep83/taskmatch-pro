import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { Clock, Shield, MessageSquare, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  };
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
          profiles!inner(first_name, last_name, full_name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (appError) throw appError;

      // Получаем предложения цены
      const { data: priceProposals, error: priceError } = await supabase
        .from('job_price_proposals')
        .select(`
          *,
          profiles!inner(first_name, last_name, full_name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (priceError) throw priceError;

      // Объединяем оба типа откликов
      const allApplications = [
        ...(regularApplications || []),
        ...(priceProposals || [])
      ];

      setApplications(allApplications);
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
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      {displayName}
                      {isSelected && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Специалист</Badge>
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

                {canSelect && (
                  <div className="pt-2">
                    <Button
                      onClick={() => handleSelectApplication(application.id)}
                      disabled={selecting === application.id}
                      className="w-full"
                    >
                      {selecting === application.id ? 'Выбираю...' : 'Выбрать специалиста'}
                    </Button>
                  </div>
                )}

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