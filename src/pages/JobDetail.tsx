import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Seo } from '@/components/Seo';
import { JobApplicationsList } from '@/components/JobApplicationsList';
import { JobResponseForm } from '@/components/JobResponseForm';
import { PriceProposalForm } from '@/components/PriceProposalForm';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
  Trash2,
  ZoomIn
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
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showPriceProposal, setShowPriceProposal] = useState(false);
  const [clientRating, setClientRating] = useState<{average: number, count: number} | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [jobApplications, setJobApplications] = useState<any[]>([]);

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
          setUserRoles(rolesList);
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
      await loadJobData();
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

  const loadJobData = async () => {
    if (!jobId) return;

    try {
      // Load job applications
      const { data: applicationsData } = await supabase
        .from('job_applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      setJobApplications(applicationsData || []);

      // Load client rating if user is a pro and we have job data
      if (userRoles.includes('pro') && job?.client_id) {
        const { data: clientRatings } = await supabase
          .from('ratings')
          .select('score')
          .eq('to_user_id', job.client_id);
        
        if (clientRatings && clientRatings.length > 0) {
          const average = clientRatings.reduce((sum, r) => sum + r.score, 0) / clientRatings.length;
          setClientRating({ average, count: clientRatings.length });
        }
      }
    } catch (error) {
      console.error('Error loading job data:', error);
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
    <main className="min-h-screen bg-gradient-subtle">
      <Seo 
        title={`Заказ: ${job.title}`} 
        description={job.description} 
        canonical={`/job/${job.id}`} 
      />

      <div className="container mx-auto py-8 px-4">
        {/* Header with glass morphism */}
        <div className="glass-morphism rounded-2xl p-6 mb-8 border border-white/20 backdrop-blur-lg">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="bg-white/10 border-white/20 hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Детали заказа
              </h1>
              <p className="text-muted-foreground mt-1">Полная информация о заказе</p>
            </div>
            
            {/* Edit and Delete buttons for job owner */}
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleEditJob} className="bg-white/10 border-white/20 hover:bg-white/20">
                  <Edit className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
                <Button variant="destructive" onClick={handleDeleteJob} className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Main Job Info Card */}
            <div className="glass-morphism rounded-2xl border border-white/20 backdrop-blur-lg overflow-hidden">
              <div className="relative p-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full"></div>
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-3">{job.title}</h2>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                          {job.categories.label_ru}
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ru })}</span>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary-glow rounded-full"></div>
                      Описание заказа
                    </h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 p-4 rounded-xl">
                      {job.description}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {(job.budget_min_cents || job.budget_max_cents) && (
                      <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <Euro className="w-5 h-5 text-green-600" />
                          </div>
                          <span className="font-semibold text-green-700">Бюджет</span>
                        </div>
                        <div className="text-xl font-bold text-green-600">
                          {job.budget_min_cents ? `от ${Math.round(job.budget_min_cents / 100)}₽` : ''}
                          {job.budget_max_cents ? ` до ${Math.round(job.budget_max_cents / 100)}₽` : ''}
                        </div>
                      </div>
                    )}

                    {job.location_address && (
                      <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-semibold text-blue-700">Адрес</span>
                        </div>
                        <div className="text-blue-600 font-medium">
                          {job.location_address}
                        </div>
                      </div>
                    )}

                    {job.scheduled_at && (
                      <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Calendar className="w-5 h-5 text-purple-600" />
                          </div>
                          <span className="font-semibold text-purple-700">Дата и время</span>
                        </div>
                        <div className="text-purple-600 font-medium">
                          {new Date(job.scheduled_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    )}

                    {job.pro_id && (
                      <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-orange-500/20 rounded-lg">
                            <User className="w-5 h-5 text-orange-600" />
                          </div>
                          <span className="font-semibold text-orange-700">Специалист</span>
                        </div>
                        <div className="text-orange-600 font-medium">
                          Назначен специалист
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Photos */}
              {jobPhotos.length > 0 && (
                <div className="border-t border-white/10 p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary-glow rounded-full"></div>
                    Фотографии заказа
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {jobPhotos.length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {jobPhotos.map((photo, index) => {
                      const imageUrl = supabase.storage.from('evidence').getPublicUrl(photo.file_url).data.publicUrl;
                      return (
                        <Dialog key={photo.id}>
                          <DialogTrigger asChild>
                            <div className="relative group cursor-pointer">
                              <div className="aspect-square bg-muted/30 rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25">
                                <img
                                  src={imageUrl}
                                  alt={`Фото заказа ${index + 1}`}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
                                    <ZoomIn className="w-5 h-5 text-gray-700" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl w-full p-2">
                            <img
                              src={imageUrl}
                              alt={`Фото заказа ${index + 1}`}
                              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                            />
                          </DialogContent>
                        </Dialog>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Applications List for Job Owner */}
            {isJobOwner && (
              <div className="glass-morphism rounded-2xl border border-white/20 backdrop-blur-lg p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary-glow rounded-full"></div>
                  Отклики специалистов
                </h3>
                <JobApplicationsList 
                  jobId={job.id}
                  jobStatus={job.status}
                  selectedProId={job.pro_id}
                  onApplicationSelect={() => fetchJob()}
                />
              </div>
            )}

            {/* Professional Action Buttons */}
            {canApply && (
              <div className="glass-morphism rounded-2xl border border-white/20 backdrop-blur-lg p-8">
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Заинтересованы в заказе?</h3>
                    <p className="text-muted-foreground">
                      Предложите свою цену или сразу откликнитесь на заказ
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button 
                      onClick={() => setShowPriceProposal(true)}
                      className="btn-hero px-8 py-3 text-lg"
                      size="lg"
                    >
                      Предложить цену
                    </Button>
                    <Button 
                      onClick={() => setShowApplicationForm(true)}
                      variant="outline"
                      className="border-primary/30 bg-white/10 hover:bg-primary/10 px-8 py-3 text-lg"
                      size="lg"
                    >
                      Откликнуться
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Application Form Modal */}
            {showApplicationForm && (
              <div className="glass-morphism rounded-2xl border border-white/20 backdrop-blur-lg p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary-glow rounded-full"></div>
                  Отклик на заказ
                </h3>
                <JobResponseForm
                  jobId={job.id}
                  jobTitle={job.title}
                  budgetMinCents={job.budget_min_cents}
                  budgetMaxCents={job.budget_max_cents}
                  onApplicationSubmit={() => {
                    setShowApplicationForm(false);
                    loadJobData();
                  }}
                />
              </div>
            )}

            {/* Price Proposal Modal */}
            {showPriceProposal && (
              <div className="glass-morphism rounded-2xl border border-white/20 backdrop-blur-lg p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary-glow rounded-full"></div>
                  Предложение цены
                </h3>
                <PriceProposalForm
                  jobId={job.id}
                  jobTitle={job.title}
                  budgetMinCents={job.budget_min_cents}
                  budgetMaxCents={job.budget_max_cents}
                  clientRating={clientRating}
                  onProposalSubmit={() => {
                    setShowPriceProposal(false);
                    loadJobData();
                  }}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Statistics */}
            <div className="glass-morphism rounded-2xl border border-white/20 backdrop-blur-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary-glow rounded-full"></div>
                Статистика заказа
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Статус:</span>
                  {getStatusBadge(job.status)}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Создан:</span>
                  <span className="text-sm font-medium">{new Date(job.created_at).toLocaleDateString('ru-RU')}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Категория:</span>
                  <span className="text-sm font-medium">{job.categories.label_ru}</span>
                </div>
              </div>
            </div>

            {/* Professional Status */}
            {isProfessional && !canApply && job.status === 'new' && (
              <div className="glass-morphism rounded-2xl border border-white/20 backdrop-blur-lg p-6">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {job.pro_id ? 'Заказ уже принят другим специалистом' : 'Вы уже откликнулись на этот заказ'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default JobDetail;