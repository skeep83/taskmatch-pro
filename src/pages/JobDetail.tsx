import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Seo } from '@/components/Seo';
import { JobApplicationsList } from '@/components/JobApplicationsList';
import { JobResponseForm } from '@/components/JobResponseForm';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Euro, 
  User, 
  Calendar,
  MessageSquare,
  Star,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  location_address?: string;
  scheduled_at?: string;
  created_at: string;
  client_id: string;
  pro_id?: string;
  category_id: string;
  categories: {
    key: string;
    label_ru: string;
    label_ro: string;
  };
}

const JobDetail = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [jobPhotos, setJobPhotos] = useState<any[]>([]);
  const [hasPayment, setHasPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      fetchJob();
      fetchJobPhotos();
      checkPaymentStatus();
      getCurrentUser();
    }
  }, [jobId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (roles && roles.length > 0) {
          const rolesList = roles.map(r => r.role);
          if (rolesList.includes('pro')) setUserRole('pro');
          else if (rolesList.includes('client')) setUserRole('client');
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          categories!inner(key, label_ru, label_ro)
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      setJob(data);
    } catch (error: any) {
      console.error('Error fetching job:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось загрузить заказ: ${error.message}`,
        variant: 'destructive'
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('job_photos')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setJobPhotos(data || []);
    } catch (error) {
      console.error('Error fetching job photos:', error);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('escrows')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();

      if (error) throw error;
      setHasPayment(!!data);
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const handleEditJob = () => {
    navigate(`/job/${jobId}/edit`);
  };

  const handleDeleteJob = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Заказ удален',
        description: 'Заказ был успешно удален'
      });
      navigate('/dashboard/client');
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить заказ: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      new: { label: 'Новый', variant: 'default' as const },
      accepted: { label: 'Принят', variant: 'secondary' as const },
      in_progress: { label: 'В работе', variant: 'default' as const },
      done: { label: 'Выполнен', variant: 'secondary' as const },
      cancelled: { label: 'Отменен', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const isJobOwner = currentUser && job && currentUser.id === job.client_id;
  const canEdit = isJobOwner && !hasPayment && job?.status === 'new';
  const isProfessional = userRole === 'pro' && job?.status === 'new';
  const canApply = isProfessional && !job?.pro_id && currentUser?.id !== job?.client_id;

  if (loading) {
    return <div className="container mx-auto py-8">Загрузка...</div>;
  }

  if (!job) {
    return <div className="container mx-auto py-8">Заказ не найден</div>;
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Seo 
        title={`Заказ: ${job.title}`} 
        description={job.description} 
        canonical={`/job/${job.id}`} 
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold flex-1">Детали заказа</h1>
        
        {/* Edit and Delete buttons for job owner */}
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEditJob}>
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
            <Button variant="destructive" onClick={handleDeleteJob}>
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{job.categories.label_ru}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ru })}</span>
                  </div>
                </div>
                {getStatusBadge(job.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Описание</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {(job.budget_min_cents || job.budget_max_cents) && (
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Бюджет:</span>
                    <span>
                      {job.budget_min_cents ? `от ${Math.round(job.budget_min_cents / 100)}₽` : ''}
                      {job.budget_max_cents ? ` до ${Math.round(job.budget_max_cents / 100)}₽` : ''}
                    </span>
                  </div>
                )}

                {job.location_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Адрес:</span>
                    <span>{job.location_address}</span>
                  </div>
                )}

                {job.scheduled_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Запланировано:</span>
                    <span>{new Date(job.scheduled_at).toLocaleString('ru-RU')}</span>
                  </div>
                )}

                {job.pro_id && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">Специалист:</span>
                    <span>Назначен специалист</span>
                  </div>
                )}
              </div>

              {/* Job Photos */}
              {jobPhotos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Фотографии заказа</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {jobPhotos.map((photo, index) => (
                      <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                        <OptimizedImage
                          src={photo.file_url}
                          alt={`Фото заказа ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applications List for Job Owner */}
          {isJobOwner && (
            <JobApplicationsList 
              jobId={job.id}
              jobStatus={job.status}
              selectedProId={job.pro_id}
              onApplicationSelect={() => fetchJob()}
            />
          )}

          {/* Response Form for Professionals */}
          {canApply && (
            <JobResponseForm
              jobId={job.id}
              jobTitle={job.title}
              budgetMinCents={job.budget_min_cents}
              budgetMaxCents={job.budget_max_cents}
              onApplicationSubmit={() => {
                toast({
                  title: 'Отклик отправлен',
                  description: 'Клиент увидит ваше предложение'
                });
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Статус:</span>
                {getStatusBadge(job.status)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Создан:</span>
                <span className="text-sm">{new Date(job.created_at).toLocaleDateString('ru-RU')}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Категория:</span>
                <span className="text-sm">{job.categories.label_ru}</span>
              </div>
            </CardContent>
          </Card>

          {isProfessional && !canApply && job.status === 'new' && (
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {job.pro_id ? 'Заказ уже принят другим специалистом' : 'Вы уже откликнулись на этот заказ'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
};

export default JobDetail;