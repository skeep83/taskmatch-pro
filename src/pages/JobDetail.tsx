import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { Seo } from '@/components/Seo';
import { JobApplicationsList } from '@/components/JobApplicationsList';
import { JobResponseForm } from '@/components/JobResponseForm';
import { PriceProposalForm } from '@/components/PriceProposalForm';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import interestedInJobImage from '@/assets/interested-in-job.png';
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
  ZoomIn,
  DollarSign
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
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
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [jobApplications, setJobApplications] = useState<any[]>([]);
  const [assignedPro, setAssignedPro] = useState<any>(null);
  const { formatPrice } = useCurrency();

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
      await loadClientData(data.client_id);
      if (data.pro_id) {
        await loadAssignedProfessional(data.pro_id);
      }
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

  const loadClientData = async (clientId: string) => {
    try {
      // Load client profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, avatar_url')
        .eq('id', clientId)
        .maybeSingle();
      
      setClientProfile(profile);

      // Load client rating (average rating given to this client)
      const { data: clientRatings } = await supabase
        .from('ratings')
        .select('score')
        .eq('to_user_id', clientId);
      
      if (clientRatings && clientRatings.length > 0) {
        const average = clientRatings.reduce((sum, r) => sum + r.score, 0) / clientRatings.length;
        setClientRating({ average, count: clientRatings.length });
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    }
  };

  const loadAssignedProfessional = async (proId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, avatar_url')
        .eq('id', proId)
        .maybeSingle();

      const { data: proProfile } = await supabase
        .from('pro_profiles')
        .select('*')
        .eq('user_id', proId)
        .maybeSingle();

      const { data: ratings } = await supabase
        .from('ratings')
        .select('score')
        .eq('to_user_id', proId);

      let proRating = null;
      if (ratings && ratings.length > 0) {
        const average = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
        proRating = { average, count: ratings.length };
      }

      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select(`
          id,
          title,
          description,
          portfolio_media (
            id,
            file_url,
            file_type,
            display_order
          )
        `)
        .eq('pro_id', proId)
        .order('created_at', { ascending: false })
        .limit(3);

      setAssignedPro({
        profile,
        proProfile,
        rating: proRating,
        portfolio: portfolioData || []
      });
    } catch (error) {
      console.error('Error loading assigned professional:', error);
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
    <main className="min-h-screen">
      <Seo 
        title={`Заказ: ${job.title}`} 
        description={job.description} 
        canonical={`/job/${job.id}`} 
      />

      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button variant="outline" onClick={() => {
              if (userRole === 'pro') {
                navigate('/dashboard/pro');
              } else if (userRole === 'client') {
                navigate('/dashboard/client');
              } else {
                navigate('/feed');
              }
            }} className="card-surface">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            
            {/* Edit and Delete buttons for job owner */}
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleEditJob} className="card-surface">
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
          
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {job.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-lg text-muted-foreground">
            <span>{job.categories.label_ru}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ru })}</span>
            <span>•</span>
            {getStatusBadge(job.status)}
          </div>

          {/* Client Info Card */}
          {clientProfile && (
            <div className="card-surface p-6 mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                Информация о заказчике
              </h3>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage 
                    src={clientProfile.avatar_url || ''} 
                    alt={clientProfile.full_name || `${clientProfile.first_name} ${clientProfile.last_name}` || 'Клиент'} 
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {clientProfile.full_name 
                      ? clientProfile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                      : (clientProfile.first_name && clientProfile.last_name 
                        ? `${clientProfile.first_name[0]}${clientProfile.last_name[0]}`.toUpperCase()
                        : 'К')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">
                      {clientProfile.full_name || 
                       (clientProfile.first_name && clientProfile.last_name 
                         ? `${clientProfile.first_name} ${clientProfile.last_name}` 
                         : 'Клиент')}
                    </h4>
                    <Badge variant="secondary" className="text-xs">Клиент</Badge>
                  </div>
                  <div>
                    {clientRating && clientRating.count > 0 ? (
                      <StarRating 
                        rating={clientRating.average} 
                        size="sm" 
                        showValue={false}
                        readonly 
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground">Новый клиент</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Job Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description Card */}
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Описание заказа
                </h2>
                <p className="text-muted-foreground whitespace-pre-wrap text-lg leading-relaxed">{job.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {(job.budget_min_cents || job.budget_max_cents) && (
                  <div className="card-surface p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Euro className="w-5 h-5 text-success" />
                      </div>
                      <span className="font-semibold text-lg">Бюджет</span>
                    </div>
                    <p className="text-2xl font-bold text-success">
                      {job.budget_min_cents && job.budget_max_cents
                        ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                        : job.budget_min_cents
                        ? `от ${formatPrice(job.budget_min_cents)}`
                        : job.budget_max_cents
                        ? `до ${formatPrice(job.budget_max_cents)}`
                        : 'Договорная'}
                    </p>
                  </div>
                )}

                {job.location_address && (
                  <div className="card-surface p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-lg">Адрес</span>
                    </div>
                    <p className="text-muted-foreground">{job.location_address}</p>
                  </div>
                )}

                {job.scheduled_at && (
                  <div className="card-surface p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-semibold text-lg">Запланировано</span>
                    </div>
                    <p className="text-muted-foreground">{new Date(job.scheduled_at).toLocaleString('ru-RU')}</p>
                  </div>
                )}

              </div>

              {/* Assigned Professional Section */}
              {job.pro_id && assignedPro && (
                <div className="card-surface p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                    <span className="font-semibold text-lg">Назначен специалист</span>
                  </div>
                  
                  <div className="border border-border/50 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage 
                          src={assignedPro.profile?.avatar_url || ''} 
                          alt={assignedPro.profile?.full_name || `${assignedPro.profile?.first_name} ${assignedPro.profile?.last_name}` || 'Специалист'} 
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                          {assignedPro.profile?.full_name 
                            ? assignedPro.profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                            : (assignedPro.profile?.first_name && assignedPro.profile?.last_name 
                              ? `${assignedPro.profile.first_name[0]}${assignedPro.profile.last_name[0]}`.toUpperCase()
                              : 'С')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">
                            {assignedPro.profile?.full_name || 
                             (assignedPro.profile?.first_name && assignedPro.profile?.last_name 
                               ? `${assignedPro.profile.first_name} ${assignedPro.profile.last_name}` 
                               : 'Специалист')}
                          </h4>
                          <Badge variant="default" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                            Специалист
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          {assignedPro.rating && assignedPro.rating.count > 0 ? (
                            <div className="flex items-center gap-2">
                              <StarRating 
                                rating={assignedPro.rating.average} 
                                size="sm" 
                                showValue={false}
                                readonly 
                              />
                              <span className="text-sm text-muted-foreground">
                                ({assignedPro.rating.count} отзыв{assignedPro.rating.count === 1 ? '' : assignedPro.rating.count < 5 ? 'а' : 'ов'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Новый специалист</span>
                          )}
                        </div>

                        {assignedPro.proProfile?.bio && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {assignedPro.proProfile.bio}
                          </p>
                        )}

                        {assignedPro.proProfile?.hourly_rate_cents && (
                          <div className="flex items-center gap-2 mb-3">
                            <Euro className="w-4 h-4 text-success" />
                            <span className="text-sm font-medium">
                              {formatPrice(assignedPro.proProfile.hourly_rate_cents)}/час
                            </span>
                          </div>
                        )}

                        {assignedPro.portfolio && assignedPro.portfolio.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Примеры работ:</p>
                            <div className="flex gap-2">
                              {assignedPro.portfolio.slice(0, 3).map((item: any) => {
                                const firstMedia = item.portfolio_media?.[0];
                                if (!firstMedia) return null;
                                
                                const imageUrl = supabase.storage.from('portfolio').getPublicUrl(firstMedia.file_url).data.publicUrl;
                                return (
                                  <div key={item.id} className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                                    <img
                                      src={imageUrl}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                );
                              })}
                              {assignedPro.portfolio.length > 3 && (
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    +{assignedPro.portfolio.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/pro/${job.pro_id}`)}
                          >
                            Профиль
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/messages?user=${job.pro_id}`)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Написать
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Photos */}
              {jobPhotos.length > 0 && (
                <div className="card-surface pt-8 px-8 pb-0 overflow-hidden">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    Фотографии заказа
                    <Badge variant="secondary" className="ml-3 text-lg px-3 py-1">{jobPhotos.length}</Badge>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-8 -mb-0">
                    {jobPhotos.map((photo, index) => {
                      const imageUrl = supabase.storage.from('evidence').getPublicUrl(photo.file_url).data.publicUrl;
                      return (
                        <Dialog key={photo.id}>
                          <DialogTrigger asChild>
                            <div className="relative group cursor-pointer p-2">
                              <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
                                <img
                                  src={imageUrl}
                                  alt={`Фото заказа ${index + 1}`}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
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
              <div className="card-surface p-8">
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
              <div className="card-surface p-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">
                    Заинтересованы в заказе?
                  </h3>
                  
                  {!showPriceProposal ? (
                    <Card className="transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex justify-center">
                          <Button 
                            className="flex-1 max-w-xs"
                            onClick={() => setShowPriceProposal(true)}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Откликнуться
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Client Info */}
                        {clientProfile && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Заказчик:</p>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12 flex-shrink-0">
                                <AvatarImage 
                                  src={clientProfile.avatar_url || ''} 
                                  alt={clientProfile.full_name || `${clientProfile.first_name} ${clientProfile.last_name}` || 'Клиент'} 
                                />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {clientProfile.full_name 
                                    ? clientProfile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                    : (clientProfile.first_name && clientProfile.last_name 
                                      ? `${clientProfile.first_name[0]}${clientProfile.last_name[0]}`.toUpperCase()
                                      : 'К')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold flex items-center gap-2 mb-1">
                                      <span className="truncate">
                                        {clientProfile.full_name || 
                                         (clientProfile.first_name && clientProfile.last_name 
                                           ? `${clientProfile.first_name} ${clientProfile.last_name}` 
                                           : 'Клиент')}
                                      </span>
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">Клиент</Badge>
                                      {clientRating && clientRating.count > 0 ? (
                                        <span className="text-xs text-muted-foreground">
                                          Рейтинг: {clientRating.average.toFixed(1)} ({clientRating.count})
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Новый клиент</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Job Description */}
                        <div>
                          <p className="text-sm font-medium mb-1">Описание заказа:</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {job.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="transition-all">
                      <CardContent className="p-6">
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
                        <Button 
                          variant="outline" 
                          className="mt-4 w-full"
                          onClick={() => setShowPriceProposal(false)}
                        >
                          Отмена
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8 mt-8">
            {/* Statistics Card */}
            <div className="card-surface p-6 mb-8">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                Статистика заказа
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Статус:</span>
                  {getStatusBadge(job.status)}
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Создан:</span>
                  <span className="font-medium">{new Date(job.created_at).toLocaleDateString('ru-RU')}</span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Категория:</span>
                  <span className="font-medium">{job.categories.label_ru}</span>
                </div>
              </div>
            </div>

            {/* Professional Status Card */}
            {isProfessional && !canApply && job.status === 'new' && (
              <div className="card-surface p-6 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {job.pro_id ? 'Заказ уже принят другим специалистом' : 'Вы уже откликнулись на этот заказ'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default JobDetail;