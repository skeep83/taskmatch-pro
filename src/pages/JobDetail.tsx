import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { Seo } from '@/components/Seo';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { MediaViewer, VideoThumbnail } from '@/components/media';
import { JobApplicationsList } from '@/components/JobApplicationsList';
import { PriceProposalForm } from '@/components/PriceProposalForm';
import { JobStatusProgress } from '@/components/JobStatusProgress';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import interestedInJobImage from '@/assets/interested-in-job.png';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { canClientCancelJob, canClientDeleteJob, canClientEditJob, inferMediaKind } from '@/utils/jobLifecycle';
import { deleteClientJob, getErrorMessage } from '@/utils/deleteClientJob';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  DollarSign,
  Send,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Job {
  id: string;
  public_id: string;
  title: string;
  description: string;
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'canceled' | 'disputed';
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

interface JobPhoto {
  id?: string;
  file_url: string;
  created_at?: string;
}

interface CurrentUser {
  id: string;
}

interface BasicProfile {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface JobResponseSummary {
  id: string;
  job_id: string;
  pro_id: string;
  created_at: string;
  price_cents?: number | null;
  status?: string | null;
}

interface PortfolioMedia {
  id: string;
  file_url: string;
  file_type?: string | null;
  display_order?: number | null;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string | null;
  portfolio_media?: PortfolioMedia[] | null;
}

interface ProProfileDetails {
  bio?: string | null;
  hourly_rate_cents?: number | null;
}

interface AssignedProData {
  profile: BasicProfile | null;
  proProfile: ProProfileDetails | null;
  rating: { average: number; count: number } | null;
  portfolio: PortfolioItem[];
}

const JobDetail = () => {
  const { t } = useEnhancedI18n();
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  const [hasPayment, setHasPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showPriceProposal, setShowPriceProposal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hasSubmittedRating, setHasSubmittedRating] = useState(false);
  const [hasClientRatedAssignedPro, setHasClientRatedAssignedPro] = useState(false);
  const [proProfile, setProProfile] = useState<BasicProfile | null>(null);
  const [clientRating, setClientRating] = useState<{average: number, count: number} | null>(null);
  const [clientProfile, setClientProfile] = useState<BasicProfile | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [jobApplications, setJobApplications] = useState<JobResponseSummary[]>([]);
  const [assignedPro, setAssignedPro] = useState<AssignedProData | null>(null);
  const [jobStatusData, setJobStatusData] = useState<{start_confirmed: boolean, end_confirmed: boolean}>({
    start_confirmed: false,
    end_confirmed: false
  });
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (jobId) {
      fetchJob();
      fetchJobPhotos();
      checkPaymentStatus();
      getCurrentUser();
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    const refreshPaymentState = () => {
      void checkPaymentStatus();
      void fetchJob();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPaymentState();
      }
    };

    window.addEventListener('focus', refreshPaymentState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshPaymentState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job-detail-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        () => {
          void fetchJob();
          void checkPaymentStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job-detail-responses-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_applications',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          void loadJobData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_price_proposals',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          void loadJobData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, job?.client_id, userRoles]);

  useEffect(() => {
    if (!jobId) return;

    const paymentSuccess = searchParams.get('payment_success');
    if (paymentSuccess !== '1') return;

    toast({
      title: t("ui.platezh_podtverzhden"),
      description: t("ui.eskrou_sozdan_mozhno_prodolzhat"),
    });
    navigate(`/job/${jobId}`, { replace: true });
  }, [jobId, navigate, searchParams, toast]);

  useEffect(() => {
    if (jobId && currentUser?.id) {
      checkExistingRating(currentUser.id);
    }
  }, [jobId, currentUser?.id]);

  useEffect(() => {
    if (jobId && job?.client_id && job?.pro_id) {
      void checkClientRatingForAssignedProfessional(job.client_id, job.pro_id);
      return;
    }

    setHasClientRatedAssignedPro(false);
  }, [jobId, job?.client_id, job?.pro_id]);

  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job-detail-ratings-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ratings',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          if (currentUser?.id) {
            void checkExistingRating(currentUser.id);
          }

          if (job?.client_id && job?.pro_id) {
            void checkClientRatingForAssignedProfessional(job.client_id, job.pro_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, currentUser?.id, job?.client_id, job?.pro_id]);

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

  const checkExistingRating = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('id')
        .eq('job_id', jobId)
        .eq('from_user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setHasSubmittedRating(Boolean(data));
    } catch (error) {
      console.error('Error checking existing rating:', error);
    }
  };

  const checkClientRatingForAssignedProfessional = async (clientId: string, proId: string) => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('id')
        .eq('job_id', jobId)
        .eq('from_user_id', clientId)
        .eq('to_user_id', proId)
        .maybeSingle();

      if (error) throw error;
      setHasClientRatedAssignedPro(Boolean(data));
    } catch (error) {
      console.error('Error checking client rating for assigned professional:', error);
      setHasClientRatedAssignedPro(false);
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
      setJobStatusData({
        start_confirmed: data.start_confirmed || false,
        end_confirmed: data.end_confirmed || false
      });
      await loadJobData();
      await loadClientData(data.client_id);
      if (data.pro_id) {
        await loadAssignedProfessional(data.pro_id);
        await loadProProfile(data.pro_id);
      }
    } catch (error: unknown) {
      console.error('Error fetching job:', error);
      toast({
        title: t("notifications.error"),
        description: `Не удалось загрузить заказ: ${error instanceof Error ? error.message : t("dash.client.unknown_error")}`,
        variant: 'destructive'
      });
      navigate('/dashboard/client');
    } finally {
      setLoading(false);
    }
  };

  const loadJobData = async () => {
    if (!jobId) return;

    try {
      const [applicationsResponse, proposalsResponse] = await Promise.all([
        supabase
          .from('job_applications')
          .select('id, job_id, pro_id, created_at, price_cents, status')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false }),
        supabase
          .from('job_price_proposals')
          .select('id, job_id, pro_id, created_at, price_cents, status')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
      ]);

      const combinedResponses = [
        ...(applicationsResponse.data || []),
        ...(proposalsResponse.data || [])
      ];

      setJobApplications(combinedResponses);

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

  const loadProProfile = async (proId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, avatar_url')
        .eq('id', proId)
        .maybeSingle();

      setProProfile(profile);
    } catch (error) {
      console.error('Error loading pro profile:', error);
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
    if (!confirm(t("dash.client.delete_confirm"))) {
      return;
    }

    try {
      const result = await deleteClientJob(jobId);

      toast({
        title: result === 'hard' ? t("dash.client.job_deleted") : t("dash.client.job_hidden"),
        description: result === 'hard' ? t("dash.client.job_deleted_desc") : t("ui.zakaz_otmenen_i_bolshe")
      });
      navigate('/dashboard/client');
    } catch (error: unknown) {
      console.error('Error deleting job:', error);
      toast({
        title: t("notifications.error"),
        description: `Не удалось удалить заказ: ${getErrorMessage(error, t("dash.client.unknown_error"))}`,
        variant: 'destructive'
      });
    }
  };

  const handleCancelJob = async () => {
    if (!confirm(t("dash.client.cancel_confirm"))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'canceled',
          status_new: 'Cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) throw error;

      await supabase.rpc('transition_job_status', {
        _job_id: jobId,
        _new_status: 'Cancelled',
        _reason: 'client_cancelled_locked_job',
      });

      if (job?.pro_id) {
        await supabase.functions.invoke('notifications-send', {
          body: {
            user_id: job.pro_id,
            type: 'job_cancelled',
            title: t("ui.klient_otmenil_zakaz"),
            title_ro: 'Clientul a anulat comanda',
            message: `Заказ "${job.title}" отменён заказчиком.`,
            message_ro: `Comanda "${job.title}" a fost anulată de client.`,
            data: { job_id: job.id },
            channels: ['push'],
          },
        });
      }

      toast({
        title: t("dash.client.job_canceled"),
        description: t("dash.client.job_canceled_desc")
      });
      navigate('/dashboard/client');
    } catch (error: unknown) {
      console.error('Error cancelling job:', error);
      toast({
        title: t("notifications.error"),
        description: `Не удалось отменить заказ: ${error instanceof Error ? error.message : t("dash.client.unknown_error")}`,
        variant: 'destructive'
      });
    }
  };

  const handleStartWork = async () => {
    if (!job || !currentUser || currentUser.id !== job.pro_id) {
      toast({
        title: t("notifications.error"),
        description: t("ui.u_vas_net_prav"),
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'in_progress',
          start_confirmed: true
        })
        .eq('id', jobId);

      if (error) throw error;

      // Send notification to client
      const { error: notifyError } = await supabase.functions.invoke('notifications-send', {
        body: {
          user_id: job.client_id,
          type: 'job_update',
          title: t("ui.rabota_nachata"),
          title_ro: 'Lucrul a început',
          message: `Специалист начал выполнение работы: ${job.title}`,
          message_ro: `Specialistul a început să lucreze: ${job.title}`,
          data: { job_id: job.id, status: 'in_progress' },
          channels: ['push']
        }
      });

      if (notifyError) {
        console.error('Error sending notification:', notifyError);
      }

      toast({
        title: t("ui.rabota_nachata"),
        description: t("ui.status_zakaza_izmenen_na")
      });

      await fetchJob();
    } catch (error: unknown) {
      console.error('Error starting work:', error);
      toast({
        title: t("notifications.error"),
        description: `Не удалось обновить статус: ${error instanceof Error ? error.message : t("dash.client.unknown_error")}`,
        variant: 'destructive'
      });
    }
  };

  const handleCompleteWork = async () => {
    if (!job || !currentUser || currentUser.id !== job.pro_id) {
      toast({
        title: t("notifications.error"),
        description: t("ui.u_vas_net_prav"),
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'done',
          end_confirmed: true
        })
        .eq('id', jobId);

      if (error) throw error;

      // Send notification to client
      const { error: notifyError } = await supabase.functions.invoke('notifications-send', {
        body: {
          user_id: job.client_id,
          type: 'job_update',
          title: t("ui.rabota_zavershena"),
          title_ro: 'Lucrul este terminat',
          message: `Специалист завершил работу: ${job.title}`,
          message_ro: `Specialistul a terminat lucrul: ${job.title}`,
          data: { job_id: job.id, status: 'done' },
          channels: ['push']
        }
      });

      if (notifyError) {
        console.error('Error sending notification:', notifyError);
      }

      toast({
        title: t("ui.rabota_zavershena"),
        description: t("ui.status_zakaza_izmenen_na_2")
      });

      await fetchJob();
    } catch (error: unknown) {
      console.error('Error completing work:', error);
      toast({
        title: t("notifications.error"),
        description: `Не удалось обновить статус: ${error instanceof Error ? error.message : t("dash.client.unknown_error")}`,
        variant: 'destructive'
      });
    }
  };

  const handleSubmitRating = async () => {
    if (!job || !currentUser || !job.pro_id || rating === 0) {
      toast({
        title: t("notifications.error"),
        description: t("ui.pozhaluista_vyberite_ocenku"),
        variant: 'destructive'
      });
      return;
    }

    try {
      // Insert rating
      const { error } = await supabase
        .from('ratings')
        .insert({
          job_id: job.id,
          from_user_id: currentUser.id,
          to_user_id: job.pro_id,
          score: rating,
          comment: ratingComment || null
        });

      if (error) throw error;

      // Send notification to specialist
      const { data: notifyResult, error: notifyError } = await supabase.functions.invoke('notifications-send', {
        body: {
          user_id: job.pro_id,
          type: 'rating',
          title: t("ui.novaia_ocenka"),
          title_ro: 'Evaluare nouă',
          message: `Вы получили оценку ${rating} звезд за работу: ${job.title}`,
          message_ro: `Ați primit o evaluare de ${rating} stele pentru lucrarea: ${job.title}`,
          data: { job_id: job.id, rating, comment: ratingComment },
          channels: ['push']
        }
      });

      if (notifyError) {
        console.error('Error sending rating notification:', notifyError);
        toast({
          title: t("ui.preduprezhdenie"),
          description: t("ui.ocenka_otpravlena_no_uvedomlenie"),
          variant: 'default'
        });
      } else {
        console.log('Rating notification sent successfully:', notifyResult);
      }

      toast({
        title: t("ui.ocenka_otpravlena"),
        description: t("ui.spasibo_za_vashu_ocenku")
      });

      setHasSubmittedRating(true);
      setRating(0);
      setRatingComment('');

      // Force refresh notifications for the specialist
      if (notifyResult?.notification_id) {
        console.log('✅ Rating notification sent with ID:', notifyResult.notification_id);
        // Trigger a refresh of notifications UI for real-time update
        window.dispatchEvent(new CustomEvent('notification-sent', {
          detail: { notificationId: notifyResult.notification_id, type: 'rating' }
        }));
      }

      await fetchJob();
    } catch (error: unknown) {
      console.error('Error submitting rating:', error);

      const errorCode = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
      const errorMessage = error instanceof Error ? error.message : '';
      const duplicateRating = errorCode === '23505'
        || /duplicate key/i.test(errorMessage)
        || /unique/i.test(errorMessage);

      if (duplicateRating) {
        setHasSubmittedRating(true);
        setRating(0);
        setRatingComment('');
        toast({
          title: t("ui.ocenka_uzhe_otpravlena"),
          description: t("ui.povtorno_ocenit_etot_zakaz"),
        });
        await fetchJob();
        return;
      }

      toast({
        title: t("notifications.error"),
        description: `Не удалось отправить оценку: ${errorMessage || t("dash.client.unknown_error")}`,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      new: { label: t("status.new"), variant: 'default' as const },
      accepted: { label: t("dash.client.st_accepted"), variant: 'secondary' as const },
      in_progress: { label: t("dash.client.st_in_progress"), variant: 'default' as const },
      done: { label: jobStatusData.end_confirmed ? t("status.done") : t("status.awaiting_confirm"), variant: 'secondary' as const },
      'canceled': { label: t("ui.otmenen"), variant: 'destructive' as const }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'new': return <AlertCircle className="h-3 w-3 flex-shrink-0" />;
        case 'accepted': return <CheckCircle className="h-3 w-3 flex-shrink-0" />;
        case 'in_progress': return <PlayCircle className="h-3 w-3 flex-shrink-0" />;
        case 'done': return <CheckCircle className="h-3 w-3 flex-shrink-0" />;
        case 'canceled': return <XCircle className="h-3 w-3 flex-shrink-0" />;
        default: return <Clock className="h-3 w-3 flex-shrink-0" />;
      }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const };
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <span>{statusInfo.label}</span>
        {getStatusIcon(status)}
      </Badge>
    );
  };

  const isJobOwner = currentUser && job && currentUser.id === job.client_id;
  const hasExistingResponse = Boolean(currentUser?.id && jobApplications.some((response) => response.pro_id === currentUser.id));
  const canEdit = canClientEditJob({ job, isOwner: Boolean(isJobOwner), hasPayment });
  const canDelete = canClientDeleteJob({ job, isOwner: Boolean(isJobOwner), hasPayment });
  const canCancel = canClientCancelJob({ job, isOwner: Boolean(isJobOwner), hasPayment });
  const isProfessional = userRole === 'pro' && job?.status === 'new';
  const canApply = isProfessional && !job?.pro_id && currentUser?.id !== job?.client_id && !hasExistingResponse;
  const isAssignedPro = currentUser && job && currentUser.id === job.pro_id;
  const canStartWork = isAssignedPro && job?.status === 'accepted' && !jobStatusData.start_confirmed;
  const canCompleteWork = isAssignedPro && job?.status === 'in_progress' && jobStatusData.start_confirmed && !jobStatusData.end_confirmed;
  const canRate = isJobOwner && job?.status === 'done' && !hasSubmittedRating;
  const shouldShowRatingSuccess = Boolean(isJobOwner && job?.status === 'done' && hasSubmittedRating);
  const isCancelled = job?.status === 'canceled';
  const isDoneAwaitingConfirmation = job?.status === 'done' && !jobStatusData.end_confirmed;
  const isDoneConfirmed = job?.status === 'done' && jobStatusData.end_confirmed;
  const cancelledStatusMessage = isJobOwner
    ? t("ui.vy_otmenili_etot_zakaz")
    : t("ui.zakaz_byl_otmenen_otklik");
  const professionalStatusMessage = currentUser?.id === job?.client_id
    ? t("ui.eto_vash_sobstvennyi_zakaz_2")
    : job?.pro_id
      ? t("ui.zakaz_uzhe_priniat_drugim")
      : hasExistingResponse
        ? t("ui.vy_uzhe_otpravili_predlozhenie_3")
        : t("ui.seichas_otpravka_predlozheniia_nedostupn");

  if (loading) {
    return <div className="container mx-auto py-8">{t("common.loading")}</div>;
  }

  if (!job) {
    return <div className="container mx-auto py-8">{t("ui.zakaz_ne_naiden")}</div>;
  }

  return (
    <main className="min-h-screen bg-neo">
      <Seo
        title={`Заказ: ${job.title}`}
        description={job.description}
        canonical={`/job/${job.id}`}
      />

      {/* Main Content Section */}
      <section className="container mx-auto py-6 md:py-10 px-4 md:px-6">
        <div className="neo-card p-4 md:p-6 mb-6 md:mb-8 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (userRole === 'pro') {
                  navigate('/dashboard/pro');
                } else if (userRole === 'client') {
                  navigate('/dashboard/client');
                } else {
                  navigate('/feed');
                }
              }}
              className="h-10 w-10 p-0 bg-neo neo-4 hover:neo-2 rounded-xl transition-all duration-300 text-foreground border-none shrink-0"
              aria-label={t("ui.nazad")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-2xl font-bold truncate">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground mt-1">
                <span className="font-mono">{t("dash.client.request_no")}: {job.public_id}</span>
                <span className="hidden sm:inline">•</span>
                <span>{job.categories.label_ru}</span>
                <span className="hidden sm:inline">•</span>
                <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ru })}</span>
              </div>
            </div>

            <div className="shrink-0">{getStatusBadge(job.status)}</div>

            {(canEdit || canCancel) && (
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <Button
                    variant="ghost"
                    onClick={handleEditJob}
                    className="px-4 py-2 bg-neo neo-4 hover:neo-2 rounded-xl transition-all duration-300 text-foreground border-none text-sm"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    {t("ui.redaktirovat")}
                  </Button>
                )}
                {canEdit && canDelete && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteJob}
                    className="px-4 py-2 rounded-xl text-sm"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t("common.delete")}
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelJob}
                    className="px-4 py-2 rounded-xl text-sm"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    {t("ui.otmenit_zakaz")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Job Details */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Description Card */}
              <div className="bg-neo rounded-2xl p-6 neo-8">
                <h2 className="text-2xl font-semibold mb-4 text-[#374151]">
                  {t("ui.opisanie_zakaza_2")}
                </h2>
                <p className="text-[#6B7280] whitespace-pre-wrap">{job.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(job.budget_min_cents || job.budget_max_cents) && (
                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Euro className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-lg text-[#374151]">{t("hero.mock.budget")}</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">
                      {job.budget_min_cents && job.budget_max_cents
                        ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                        : job.budget_min_cents
                        ? `от ${formatPrice(job.budget_min_cents)}`
                        : job.budget_max_cents
                        ? `до ${formatPrice(job.budget_max_cents)}`
                        : t("dash.pro.negotiable")}
                    </p>
                  </div>
                )}

                {job.location_address && (
                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-lg text-[#374151]">{t("ui.adres")}</span>
                    </div>
                    <p className="text-[#6B7280]">{job.location_address}</p>
                  </div>
                )}

                {job.scheduled_at && (
                  <div className="bg-neo rounded-2xl p-6 md:col-span-2 neo-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-orange-500" />
                      <span className="font-semibold text-lg text-[#374151]">{t("ui.zaplanirovano")}</span>
                    </div>
                    <p className="text-[#6B7280]">{new Date(job.scheduled_at).toLocaleString('ru-RU')}</p>
                  </div>
                )}
              </div>

              {/* Assigned Professional Section */}
              {job.pro_id && assignedPro && (
                <div className="p-4 md:p-6 rounded-2xl bg-neo neo-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <User className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                    </div>
                    <span className="font-semibold text-base md:text-lg">{t("ui.naznachen_specialist")}</span>
                  </div>

                  <div className="border border-border/50 rounded-lg p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                      <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto sm:mx-0">
                        <AvatarImage
                          src={assignedPro.profile?.avatar_url || ''}
                          alt={assignedPro.profile?.full_name || `${assignedPro.profile?.first_name} ${assignedPro.profile?.last_name}` || t("menu.role_pro")}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base md:text-lg">
                          {assignedPro.profile?.full_name
                            ? assignedPro.profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                            : (assignedPro.profile?.first_name && assignedPro.profile?.last_name
                              ? `${assignedPro.profile.first_name[0]}${assignedPro.profile.last_name[0]}`.toUpperCase()
                              : 'С')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                          <h4 className="font-semibold text-base md:text-lg">
                            {assignedPro.profile?.full_name ||
                             (assignedPro.profile?.first_name && assignedPro.profile?.last_name
                               ? `${assignedPro.profile.first_name} ${assignedPro.profile.last_name}`
                               : t("menu.role_pro"))}
                          </h4>
                          <Badge variant="default" className="bg-orange-100 text-orange-800 hover:bg-orange-200 w-fit mx-auto sm:mx-0">
                            {t("menu.role_pro")}
                          </Badge>
                        </div>

                        <div className="flex justify-center sm:justify-start items-center gap-4 mb-3">
                          {assignedPro.rating && assignedPro.rating.count > 0 ? (
                            <div className="flex items-center gap-2">
                              <StarRating
                                rating={assignedPro.rating.average}
                                size="sm"
                                showValue={true}
                                readonly
                              />
                              <span className="text-xs md:text-sm text-muted-foreground">
                                ({assignedPro.rating.count} отзыв{assignedPro.rating.count === 1 ? '' : assignedPro.rating.count < 5 ? 'а' : 'ов'})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <StarRating
                                rating={0}
                                size="sm"
                                showValue={false}
                                readonly
                              />
                              <span className="text-xs md:text-sm text-muted-foreground">{t("catalog.new_specialist")}</span>
                            </div>
                          )}
                        </div>

                        {assignedPro.proProfile?.bio && (
                          <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">
                            {assignedPro.proProfile.bio}
                          </p>
                        )}

                        {assignedPro.proProfile?.hourly_rate_cents && (
                          <div className="flex justify-center sm:justify-start items-center gap-2 mb-3">
                            <Euro className="w-3 h-3 md:w-4 md:h-4 text-success" />
                            <span className="text-xs md:text-sm font-medium">
                              {formatPrice(assignedPro.proProfile.hourly_rate_cents)}/час
                            </span>
                          </div>
                        )}

                        {assignedPro.portfolio && assignedPro.portfolio.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs md:text-sm font-medium text-muted-foreground mb-3">{t("ui.primery_rabot")}</p>
                            <div className="flex gap-2 md:gap-3 flex-wrap justify-center sm:justify-start">
                              {assignedPro.portfolio.map((item: PortfolioItem) =>
                                item.portfolio_media?.map((media: PortfolioMedia, mediaIndex: number) => {
                                  const imageUrl = media.file_url;
                                  return (
                                    <div key={`${item.id}-${media.id}`} className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-muted shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                      <img
                                        src={imageUrl}
                                        alt={`${item.title} - фото ${mediaIndex + 1}`}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                      />
                                    </div>
                                  );
                                })
                              ).flat()}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <div className="p-2 rounded-2xl bg-neo neo-inset-8">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/pro/${job.pro_id}`)}
                              className="w-full sm:w-auto bg-neo neo-8 hover:neo-inset-4 rounded-xl transition-all duration-300 text-black hover:text-black"
                            >
                              {t("nav.profile_tab")}
                            </Button>
                          </div>
                          <div className="p-2 rounded-2xl bg-neo neo-inset-8">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/messages?user=${job.pro_id}&job=${job.id}`)}
                              className="w-full sm:w-auto bg-neo neo-8 hover:neo-inset-4 rounded-xl transition-all duration-300 text-black hover:text-black"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {t("ui.napisat")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Photos */}
              {jobPhotos.length > 0 && (
                <div className="pt-6 md:pt-8 px-4 md:px-8 pb-0 overflow-hidden rounded-2xl bg-neo neo-8">
                  <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-3">
                    <div className="w-1 h-6 md:h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    {t("ui.foto_i_video_zakaza")}
                    <Badge variant="secondary" className="ml-3 text-sm md:text-lg px-2 md:px-3 py-1">{jobPhotos.length}</Badge>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 md:-mx-8 -mb-0">
                    {jobPhotos.map((photo, index) => {
                      const imageUrl = supabase.storage.from('evidence').getPublicUrl(photo.file_url).data.publicUrl;
                      const mediaKind = inferMediaKind(photo.file_url);
                      return (
                        <Dialog key={photo.id}>
                          <DialogTrigger asChild>
                            <div className="relative group cursor-pointer p-1 md:p-2">
                              <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 bg-black/5">
                                {mediaKind === 'video' ? (
                                  <VideoThumbnail src={imageUrl} overlayLabel={t("ui.video")} />
                                ) : (
                                  <MediaViewer
                                    src={imageUrl}
                                    alt={`Медиа заказа ${index + 1}`}
                                    type="image"
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    containerClassName="w-full h-full"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 md:p-3">
                                    <ZoomIn className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl w-full p-2">
                            <div className="space-y-3">
                              {mediaKind === 'video' ? (
                                <div className="space-y-3">
                                  <video
                                    src={imageUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full h-auto max-h-[80vh] object-contain rounded-lg bg-black"
                                  />
                                  <div className="text-center">
                                    <a href={imageUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                                      {t("ui.otkryt_video_otdelno")}
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <MediaViewer
                                  src={imageUrl}
                                  alt={`Медиа заказа ${index + 1}`}
                                  type="image"
                                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                                  containerClassName="w-full h-auto max-h-[80vh]"
                                  objectFit="contain"
                                />
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6 md:space-y-8">
              {/* Professional Work Management */}
              {isAssignedPro && (
                <div className="p-4 md:p-6 relative z-10 rounded-2xl bg-neo neo-8">
                  <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 flex items-center gap-3">
                    <div className="w-1 h-4 md:h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    {t("ui.upravlenie_rabotoi")}
                  </h3>

                  <div className="space-y-4">
                    {canStartWork && (
                      <div className="p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2 text-sm md:text-base">{t("ui.gotovy_nachat_rabotu")}</h4>
                        <p className="text-xs md:text-sm text-blue-700 mb-3 md:mb-4">
                          {t("ui.nazhmite_knopku_kogda_pristupite")} {t("job.detail.status_will_change_progress")}
                        </p>
                        <div className="p-2 rounded-2xl bg-neo neo-inset-8">
                          <Button
                            onClick={handleStartWork}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-sm md:text-base rounded-xl"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            {t("ui.nachat_vypolnenie_raboty")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {canCompleteWork && (
                      <div className="p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2 text-sm md:text-base">{t("ui.rabota_vypolnena")}</h4>
                        <p className="text-xs md:text-sm text-green-700 mb-3 md:mb-4">
                          {t("ui.nazhmite_knopku_kogda_zakonchite")} {t("job.detail.status_will_change_done")}
                        </p>
                        <div className="p-2 rounded-2xl bg-neo neo-inset-8">
                          <Button
                            onClick={handleCompleteWork}
                            className="w-full bg-green-600 hover:bg-green-700 text-sm md:text-base rounded-xl"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            {t("ui.zavershit_rabotu")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {job.status === 'done' && (
                      <div className={`p-3 md:p-4 rounded-lg text-center ${isDoneConfirmed ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                        <Star className="w-6 h-6 md:w-8 md:h-8 text-emerald-600 mx-auto mb-2" />
                        <h4 className={`font-medium mb-1 text-sm md:text-base ${isDoneConfirmed ? 'text-emerald-900' : 'text-amber-900'}`}>{isDoneConfirmed ? t("ui.zakaz_zavershen") : t("ui.rabota_zavershena")}</h4>
                        <p className={`text-xs md:text-sm ${isDoneConfirmed ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isDoneConfirmed
                            ? hasClientRatedAssignedPro
                              ? t("ui.zakazchik_uzhe_ostavil_otzyv")
                              : t("ui.zakaz_podtverzhden_kak_tolko")
                            : t("ui.zakaz_ozhidaet_podtverzhdeniia_ot")}
                        </p>
                      </div>
                    )}

                    {isCancelled && (
                      <div className="p-3 md:p-4 rounded-lg text-center bg-red-50 border border-red-200">
                        <XCircle className="w-6 h-6 md:w-8 md:h-8 text-red-600 mx-auto mb-2" />
                        <h4 className="font-medium mb-1 text-sm md:text-base text-red-900">{t("ui.rabota_po_zakazu_ostanovlena")}</h4>
                        <p className="text-xs md:text-sm text-red-700">
                          {t("ui.zakaz_otmenen_prodolzhat_vypolnenie")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client Info Card */}
          {clientProfile && (
            <div className="p-4 md:p-6 bg-neo rounded-2xl neo-8">
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-3 text-[#374151]">
                <div className="w-1 h-4 md:h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                {t("ui.informaciia_o_zakazchike")}
              </h3>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 md:w-12 md:h-12">
                  <AvatarImage
                    src={clientProfile.avatar_url || ''}
                    alt={clientProfile.full_name || `${clientProfile.first_name} ${clientProfile.last_name}` || t("menu.role_client")}
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <h4 className="font-semibold text-sm md:text-base truncate text-[#374151]">
                      {clientProfile.full_name ||
                       (clientProfile.first_name && clientProfile.last_name
                         ? `${clientProfile.first_name} ${clientProfile.last_name}`
                         : t("menu.role_client"))}
                    </h4>
                    <Badge variant="secondary" className="text-xs w-fit">{t("menu.role_client")}</Badge>
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
                      <p className="text-xs text-[#6B7280]">{t("ui.novyi_klient")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

              {/* Job Status and Statistics Combined - Only show when professional is assigned */}
              {job.pro_id && (
                <div className="p-4 md:p-6 relative z-10 rounded-2xl bg-neo neo-8">
                  <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 flex items-center gap-3">
                    <div className="w-1 h-4 md:h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    {t("ui.status_i_statistika_zakaza")}
                  </h3>

                  {/* Job Status Progress */}
                  <div className="mb-6 md:mb-8">
                    <h4 className="text-base md:text-lg font-medium mb-3 md:mb-4 text-muted-foreground">{t("ui.progress_vypolneniia")}</h4>
                  <JobStatusProgress
                    status={job.status}
                    startConfirmed={jobStatusData.start_confirmed}
                    endConfirmed={jobStatusData.end_confirmed}
                  />
                </div>

                {/* Rating Section - Appears first when job is done and user can rate */}
                {canRate ? (
                  <div className="mb-6 md:mb-8">
                    <div className="p-3 md:p-4 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <h4 className="font-medium text-amber-900 mb-1 text-sm md:text-base">{t("ui.nuzhen_poslednii_shag_ot")}</h4>
                      <p className="text-xs md:text-sm text-amber-700">
                        {t("ui.podtverdite_zavershenie_i_ostavte")}
                      </p>
                    </div>
                    <h4 className="text-base md:text-lg font-medium mb-4 md:mb-6 text-center text-primary animate-pulse">{t("ui.ocenite_vypolnenie_uslugi_specialistom")}</h4>

                    {/* Professional Avatar and Info */}
                    {proProfile && (
                      <div className="flex flex-col items-center mb-4 md:mb-6">
                        <Avatar className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mb-3 md:mb-4 border-4 border-white/50 shadow-2xl">
                          <AvatarImage
                            src={proProfile.avatar_url || ''}
                            alt={proProfile.full_name || `${proProfile.first_name} ${proProfile.last_name}` || t("menu.role_pro")}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-lg md:text-2xl lg:text-3xl">
                            {proProfile.full_name
                              ? proProfile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                              : (proProfile.first_name && proProfile.last_name
                                ? `${proProfile.first_name[0]}${proProfile.last_name[0]}`.toUpperCase()
                                : 'С')}
                          </AvatarFallback>
                        </Avatar>
                        <h5 className="font-bold text-base md:text-lg lg:text-xl text-center mb-1 md:mb-2">
                          {proProfile.full_name ||
                           (proProfile.first_name && proProfile.last_name
                             ? `${proProfile.first_name} ${proProfile.last_name}`
                             : t("menu.role_pro"))}
                        </h5>
                        <Badge variant="default" className="bg-gradient-to-r from-primary to-accent text-white">{t("menu.role_pro")}</Badge>
                      </div>
                    )}

                    {/* Rating Section */}
                    <div className="space-y-4 md:space-y-6">
                      <div className="text-center">
                        <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6 font-medium animate-fade-in">{t("ui.postavte_ocenku_ot_1")}</p>
                        <div className="relative group">
                          <div className="absolute -inset-3 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          <div className="relative transform hover:scale-110 transition-all duration-300">
                            <StarRating
                              rating={rating}
                              readonly={false}
                              size="lg"
                              className="justify-center [&>*]:transition-all [&>*]:duration-300 [&>*]:hover:drop-shadow-lg [&>*]:hover:brightness-125 [&>svg]:w-8 [&>svg]:h-8 md:[&>svg]:w-10 md:[&>svg]:h-10 lg:[&>svg]:w-12 lg:[&>svg]:h-12"
                              onRatingChange={setRating}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs md:text-sm font-medium mb-2 md:mb-3 block">{t("ui.kommentarii_neobiazatelno")}</label>
                        <Textarea
                          placeholder={t("ui.rasskazhite_o_kachestve_vypolnennoi")}
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          className="min-h-[100px] md:min-h-[120px] transition-all duration-300 focus:scale-[1.02] text-sm md:text-base"
                        />
                      </div>

                      <div className="p-2 rounded-2xl bg-neo neo-inset-8">
                        <Button
                          onClick={handleSubmitRating}
                          disabled={rating === 0}
                          className="w-full bg-neo neo-8 hover:neo-inset-4 disabled:neo-8 rounded-xl transition-all duration-300 text-black hover:text-black disabled:opacity-50 font-semibold py-2 md:py-3 transform hover:scale-105 disabled:hover:scale-100 relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                          <Send className="w-4 h-4 md:w-5 md:h-5 mr-2 relative z-10" />
                          <span className="relative z-10 text-sm md:text-base">{t("ui.otpravit_ocenku")}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : shouldShowRatingSuccess ? (
                  <div className="mb-6 md:mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <Star className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                    <h4 className="mb-1 font-medium text-emerald-900 text-sm md:text-base">{t("ui.otzyv_uzhe_otpravlen")}</h4>
                    <p className="text-xs md:text-sm text-emerald-700">
                      {t("ui.spasibo_zakaz_zakryt_s")}
                    </p>
                  </div>
                ) : null}

                {/* Statistics - Always shown, but moved below rating when rating is available */}
                <div>
                  <h4 className="text-base md:text-lg font-medium mb-3 md:mb-4 text-muted-foreground">{t("ui.informaciia_o_zakaze")}</h4>
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center justify-between py-2 md:py-3 border-b border-border/50">
                      <span className="text-muted-foreground text-sm md:text-base">{t("ui.status")}</span>
                      {getStatusBadge(job.status)}
                    </div>

                    <div className="flex items-center justify-between py-2 md:py-3 border-b border-border/50">
                      <span className="text-muted-foreground text-sm md:text-base">{t("ui.sozdan")}</span>
                      <span className="font-medium text-sm md:text-base">{new Date(job.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 md:py-3">
                      <span className="text-muted-foreground text-sm md:text-base">{t("ui.kategoriia")}</span>
                      <span className="font-medium text-sm md:text-base">{job.categories.label_ru}</span>
                    </div>

                    {isCancelled && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                        <XCircle className="mx-auto mb-2 h-7 w-7 text-red-600" />
                        <h4 className="mb-1 font-medium text-red-900 text-sm md:text-base">{t("dash.client.job_canceled")}</h4>
                        <p className="text-xs md:text-sm text-red-700">{cancelledStatusMessage}</p>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                          <Button variant="outline" onClick={() => navigate('/dashboard/client')}>
                            {t("ui.k_moim_zakazam")}
                          </Button>
                          <Button variant="ghost" onClick={() => navigate(-1)}>
                            {t("ui.nazad")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}

              {/* Applications List for Job Owner - Show applications and job progress */}
              {isJobOwner && (
                <div className="p-4 md:p-6 lg:p-8 relative z-20 rounded-2xl bg-neo neo-8">
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
                <div className="p-4 md:p-6 lg:p-8 relative z-20 rounded-2xl bg-neo neo-8">
                  <div className="space-y-4">
                    <h3 className="text-lg md:text-xl font-semibold mb-4">
                      {t("ui.zainteresovany_v_zakaze")}
                    </h3>

                    {!showPriceProposal ? (
                      <Card className="transition-all rounded-2xl bg-neo neo-8 border-none">
                        <CardHeader className="pb-3">
                          <div className="flex justify-center">
                            <div className="p-2 rounded-2xl bg-neo neo-inset-8">
                              <Button
                                className="flex-1 max-w-xs w-full bg-neo neo-8 hover:neo-inset-4 rounded-xl transition-all duration-300 text-black hover:text-black"
                                onClick={() => setShowPriceProposal(true)}
                              >
                                <User className="w-4 h-4 mr-2" />
                                {t("dash.pro.send_offer")}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          {/* Client Info */}
                          {clientProfile && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">{t("ui.zakazchik_2")}</p>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                                  <AvatarImage
                                    src={clientProfile.avatar_url || ''}
                                    alt={clientProfile.full_name || `${clientProfile.first_name} ${clientProfile.last_name}` || t("menu.role_client")}
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
                                      <h4 className="font-semibold flex items-center gap-2 mb-1 text-sm md:text-base">
                                        <span className="truncate">
                                          {clientProfile.full_name ||
                                           (clientProfile.first_name && clientProfile.last_name
                                             ? `${clientProfile.first_name} ${clientProfile.last_name}`
                                             : t("menu.role_client"))}
                                        </span>
                                      </h4>
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <Badge variant="secondary" className="text-xs w-fit">{t("menu.role_client")}</Badge>
                                        {clientRating && clientRating.count > 0 ? (
                                          <span className="text-xs text-muted-foreground">
                                            Рейтинг: {clientRating.average.toFixed(1)} ({clientRating.count})
                                          </span>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">{t("ui.novyi_klient")}</span>
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
                            <p className="text-sm font-medium mb-1">{t("ui.opisanie_zakaza")}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {job.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="transition-all rounded-2xl bg-neo neo-8 border-none">
                        <CardContent className="p-4 md:p-6">
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
                          <div className="p-2 rounded-2xl bg-neo neo-inset-8 mt-4">
                            <Button
                              variant="ghost"
                              className="w-full bg-neo neo-8 hover:neo-inset-4 rounded-xl transition-all duration-300 text-black hover:text-black"
                              onClick={() => setShowPriceProposal(false)}
                            >
                              {t("common.cancel")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Professional Status Card */}
              {isProfessional && !canApply && job.status === 'new' && (
                <div className="p-4 md:p-6 text-center relative z-10 rounded-2xl bg-neo neo-8">
                  <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm md:text-base">
                    {professionalStatusMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default JobDetail;