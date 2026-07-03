import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, DollarSign, User, Star, Camera, MessageCircle, Phone, X, ChevronLeft, ChevronRight, Edit, Trash2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { categoryLabel } from '@/lib/categoryLabel';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { MediaViewer, VideoThumbnail } from '@/components/media';
import { canClientCancelJob, canClientDeleteJob, canClientEditJob, inferMediaKind } from '@/utils/jobLifecycle';
import { deleteClientJob, getErrorMessage } from '@/utils/deleteClientJob';
import { JobApplicationsList } from '@/components/JobApplicationsList';

interface JobDetail {
  id: string;
  public_id: string;
  title: string;
  description: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  location_address?: string;
  created_at: string;
  urgency: string;
  status: string;
  start_confirmed?: boolean;
  end_confirmed?: boolean;
  pro_id?: string | null;
  client_id?: string;
  categories?: { label_ru: string; label_ro: string };
  profiles?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    phone?: string;
  };
  job_photos?: Array<{ file_url: string }>;
}

interface AssignedProProfile {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
}

export default function MobileJobDetail() {
  console.log("MobileJobDetail component loading...", { React });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, language } = useEnhancedI18n();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'client' | 'pro' | null>(null);
  const [hasExistingResponse, setHasExistingResponse] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [assignedProProfile, setAssignedProProfile] = useState<AssignedProProfile | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hasSubmittedRating, setHasSubmittedRating] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const openPhotoModal = (index: number) => {
    console.log('Opening photo modal, index:', index);
    setCurrentPhotoIndex(index);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    console.log('Closing photo modal');
    setPhotoModalOpen(false);
    setCurrentPhotoIndex(0);
  };

  const nextPhoto = () => {
    if (job && currentPhotoIndex < job.job_photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  async function fetchJobDetail(jobId: string) {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      setCurrentUserId(userId);

      if (userId) {
        const [{ data: roles }, { data: applications }, { data: proposals }] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', userId),
          supabase.from('job_applications').select('id').eq('job_id', jobId).eq('pro_id', userId).limit(1),
          supabase.from('job_price_proposals').select('id').eq('job_id', jobId).eq('pro_id', userId).limit(1),
        ]);

        setCurrentUserRole((roles || []).some((role) => role.role === 'pro') ? 'pro' : 'client');
        setHasExistingResponse(Boolean((applications && applications.length) || (proposals && proposals.length)));
      } else {
        setCurrentUserRole(null);
        setHasExistingResponse(false);
      }

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          public_id,
          title,
          description,
          budget_min_cents,
          budget_max_cents,
          location_address,
          created_at,
          urgency,
          status,
          start_confirmed,
          end_confirmed,
          pro_id,
          client_id,
          categories(label_ru, label_ro),
          profiles!jobs_client_id_fkey(
            full_name,
            first_name,
            last_name,
            avatar_url,
            phone
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching job:', error);
        toast({
          title: t("notifications.error"),
          description: t("ui.ne_udalos_zagruzit_detali"),
          variant: "destructive"
        });
        navigate(-1);
        return;
      }

      // Fetch job photos separately
      const { data: photos } = await supabase
        .from('job_photos')
        .select('file_url')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      const { data: escrow } = await supabase
        .from('escrows')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();

      setHasPayment(Boolean(escrow));

      let nextAssignedProProfile: AssignedProProfile | null = null;
      if (data.pro_id) {
        const { data: proProfile } = await supabase
          .from('profiles')
          .select('full_name, first_name, last_name, avatar_url, phone')
          .eq('id', data.pro_id)
          .maybeSingle();
        nextAssignedProProfile = proProfile ?? null;
      }
      setAssignedProProfile(nextAssignedProProfile);

      // Add photos to job data
      const jobWithPhotos = {
        ...data,
        job_photos: photos || []
      };

      setJob(jobWithPhotos);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.proizoshla_oshibka_pri_zagruzke"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      void fetchJobDetail(id);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const refreshPaymentState = () => {
      void fetchJobDetail(id);
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
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`mobile-job-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${id}`,
        },
        () => {
          void fetchJobDetail(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`mobile-job-detail-responses-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_applications',
          filter: `job_id=eq.${id}`,
        },
        () => {
          void fetchJobDetail(id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_price_proposals',
          filter: `job_id=eq.${id}`,
        },
        () => {
          void fetchJobDetail(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const paymentSuccess = searchParams.get('payment_success');
    if (paymentSuccess !== '1') return;

    toast({
      title: t("ui.platezh_podtverzhden"),
      description: t("ui.eskrou_sozdan_mozhno_prodolzhat"),
    });
    navigate(`/job/${id}`, { replace: true });
  }, [id, navigate, searchParams, toast]);

  useEffect(() => {
    if (id) {
      void fetchJobDetail(id);
    }
  }, [id]);

  useEffect(() => {
    if (!id || !currentUserId) return;
    void checkExistingRating(currentUserId);
  }, [id, currentUserId]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`mobile-job-detail-ratings-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ratings',
          filter: `job_id=eq.${id}`,
        },
        () => {
          if (currentUserId) {
            void checkExistingRating(currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId]);

  const handleResponse = async () => {
    if (currentUserId && job?.client_id === currentUserId) {
      toast({
        title: t("ui.nedostupno"),
        description: t("ui.nelzia_otklikatsia_na_sobstvennyi_2"),
        variant: "destructive"
      });
      return;
    }

    setResponding(true);
    try {
      // Navigate to response form
      navigate(`/job/${id}/respond`);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_otpravit_otklik"),
        variant: "destructive"
      });
    } finally {
      setResponding(false);
    }
  };

  const handleStartWork = async () => {
    if (!job || !currentUserId || currentUserId !== job.pro_id) {
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
        .eq('id', job.id);

      if (error) throw error;

      await supabase.functions.invoke('notifications-send', {
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

      toast({
        title: t("ui.rabota_nachata"),
        description: t("ui.status_zakaza_izmenen_na_4")
      });

      await fetchJobDetail(job.id);
    } catch (error) {
      console.error('Error starting work:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_obnovit_status"),
        variant: 'destructive'
      });
    }
  };

  const handleCompleteWork = async () => {
    if (!job || !currentUserId || currentUserId !== job.pro_id) {
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
        .eq('id', job.id);

      if (error) throw error;

      await supabase.functions.invoke('notifications-send', {
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

      toast({
        title: t("ui.rabota_zavershena"),
        description: t("ui.status_zakaza_izmenen_na_3")
      });

      await fetchJobDetail(job.id);
    } catch (error) {
      console.error('Error completing work:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_obnovit_status"),
        variant: 'destructive'
      });
    }
  };

  const handleSubmitRating = async () => {
    if (!job || !currentUserId || !job.pro_id || rating === 0) {
      toast({
        title: t("notifications.error"),
        description: t("ui.pozhaluista_vyberite_ocenku"),
        variant: 'destructive'
      });
      return;
    }

    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('ratings')
        .insert({
          job_id: job.id,
          from_user_id: currentUserId,
          to_user_id: job.pro_id,
          score: rating,
          comment: ratingComment || null
        });

      if (error) throw error;

      const { error: notifyError } = await supabase.functions.invoke('notifications-send', {
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
      }

      toast({
        title: t("ui.ocenka_otpravlena"),
        description: t("ui.spasibo_za_vashu_ocenku")
      });

      setHasSubmittedRating(true);
      setRating(0);
      setRatingComment('');
      await fetchJobDetail(job.id);
    } catch (error) {
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
          description: t("ui.my_uzhe_sohranili_vash")
        });
        return;
      }

      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_otpravit_ocenku"),
        variant: 'destructive'
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const checkExistingRating = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('id')
        .eq('job_id', id)
        .eq('from_user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setHasSubmittedRating(Boolean(data));
    } catch (error) {
      console.error('Error checking existing rating:', error);
      setHasSubmittedRating(false);
    }
  };

  const handleEditJob = () => {
    navigate(`/job/${id}/edit`);
  };

  const handleDeleteJob = async () => {
    if (!confirm(t("dash.client.delete_confirm"))) return;

    try {
      const result = await deleteClientJob(id);
      toast({
        title: result === 'hard' ? t("ui.zakaz_udalen") : t("dash.client.job_hidden"),
        description: result === 'hard' ? t("ui.zakaz_byl_uspeshno_udalen") : t("ui.zakaz_otmenen_i_bolshe")
      });
      navigate('/dashboard/client');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: t("notifications.error"),
        description: `Не удалось удалить заказ: ${getErrorMessage(error, t("dash.client.unknown_error"))}`,
        variant: 'destructive'
      });
    }
  };

  const handleCancelJob = async () => {
    if (!job || !confirm(t("dash.client.cancel_confirm"))) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'canceled',
          status_new: 'Cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (error) throw error;

      await supabase.rpc('transition_job_status', {
        _job_id: job.id,
        _new_status: 'Cancelled',
        _reason: 'client_cancelled_locked_job',
      });

      if (job.pro_id) {
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

      toast({ title: t("dash.client.job_canceled"), description: t("dash.client.job_canceled_desc") });
      navigate('/dashboard/client');
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast({ title: t("notifications.error"), description: t("ui.ne_udalos_otmenit_zakaz"), variant: 'destructive' });
    }
  };

  const urgencyColors = {
    normal: 'bg-green-500/10 text-green-700 border-green-500/20',
    urgent: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    same_day: 'bg-red-500/10 text-red-700 border-red-500/20'
  };

  const urgencyLabels = {
    normal: t("ui.obychno"),
    urgent: t("dash.client.urg_urgent"),
    same_day: t("dash.client.urg_same_day")
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neo flex items-center justify-center">
        <div className="text-[#374151]">{t("common.loading")}</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-neo flex items-center justify-center">
        <div className="text-[#374151]">{t("ui.zakaz_ne_naiden")}</div>
      </div>
    );
  }

  const isOwnJob = Boolean(currentUserId && job.client_id === currentUserId);
  const isAssignedPro = Boolean(currentUserId && job.pro_id === currentUserId);
  const canClientEdit = canClientEditJob({ job, isOwner: isOwnJob, hasPayment });
  const canClientDelete = canClientDeleteJob({ job, isOwner: isOwnJob, hasPayment });
  const canClientCancel = canClientCancelJob({ job, isOwner: isOwnJob, hasPayment });
  const canRespond = job.status === 'new' && !isOwnJob && currentUserRole === 'pro' && !hasExistingResponse;
  const canStartWork = isAssignedPro && job.status === 'accepted' && !job.start_confirmed;
  const canCompleteWork = isAssignedPro && job.status === 'in_progress' && Boolean(job.start_confirmed) && !job.end_confirmed;
  const isDoneAwaitingConfirmation = job.status === 'done' && !job.end_confirmed;
  const canRateAssignedPro = isOwnJob && job.status === 'done' && !isDoneAwaitingConfirmation && Boolean(job.pro_id) && !hasSubmittedRating;
  const shouldShowRatingSuccess = isOwnJob && job.status === 'done' && hasSubmittedRating;
  const showResponseStatusCard = job.status === 'new' && !isOwnJob && !canRespond;

  const responseStatusMessage = (() => {
    if (currentUserRole !== 'pro') return t("ui.otkliki_na_zakaz_dostupny");
    if (hasExistingResponse) return t("ui.vy_uzhe_otpravili_predlozhenie_2");
    return t("ui.seichas_otpravka_predlozheniia_nedostupn_2");
  })();

  return (
    <div>
      {/* Photo Modal */}
      {photoModalOpen && job && job.job_photos.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={(e) => {
            console.log('Background clicked');
            closePhotoModal();
          }}
        >
          <div
            className="relative max-w-full max-h-full flex items-center justify-center p-4"
            onClick={(e) => {
              console.log('Content area clicked');
              e.stopPropagation();
            }}
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                console.log('Close button clicked');
                e.stopPropagation();
                closePhotoModal();
              }}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
            >
              <X size={24} />
            </button>

            {/* Photo Counter */}
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
              {currentPhotoIndex + 1} из {job.job_photos.length}
            </div>

            {/* Previous Button */}
            {currentPhotoIndex > 0 && (
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Next Button */}
            {currentPhotoIndex < job.job_photos.length - 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Media */}
            <motion.div
              key={currentPhotoIndex}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-full max-h-full w-full"
            >
              {inferMediaKind(job.job_photos[currentPhotoIndex].file_url) === 'video' ? (
                <div className="space-y-3">
                  <video
                    src={supabase.storage.from('evidence').getPublicUrl(job.job_photos[currentPhotoIndex].file_url).data.publicUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-w-full max-h-full w-full object-contain rounded-lg bg-black"
                  />
                  <div className="text-center">
                    <a
                      href={supabase.storage.from('evidence').getPublicUrl(job.job_photos[currentPhotoIndex].file_url).data.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-white underline"
                    >
                      {t("ui.otkryt_video_otdelno")}
                    </a>
                  </div>
                </div>
              ) : (
                <MediaViewer
                  src={supabase.storage.from('evidence').getPublicUrl(job.job_photos[currentPhotoIndex].file_url).data.publicUrl}
                  alt={`Медиа ${currentPhotoIndex + 1}`}
                  type="image"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  containerClassName="max-w-full max-h-full"
                />
              )}
            </motion.div>

            {/* Swipe gestures for mobile - covers full screen */}
            <div
              className="fixed inset-0 flex"
              style={{ zIndex: -1 }}
              onTouchStart={(e) => {
                e.stopPropagation();
                const touchStartX = e.touches[0].clientX;
                const handleTouchEnd = (e: TouchEvent) => {
                  const touchEndX = e.changedTouches[0].clientX;
                  const diffX = touchStartX - touchEndX;

                  if (Math.abs(diffX) > 50) {
                    if (diffX > 0 && currentPhotoIndex < job.job_photos.length - 1) {
                      nextPhoto();
                    } else if (diffX < 0 && currentPhotoIndex > 0) {
                      prevPhoto();
                    }
                  }

                  document.removeEventListener('touchend', handleTouchEnd);
                };

                document.addEventListener('touchend', handleTouchEnd);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
    <div className="min-h-screen bg-neo">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-neo px-4 py-3 border-b border-[#D1D5DB]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-neo neo-4 active:neo-inset-2"
          >
            <ArrowLeft className="w-5 h-5 text-[#374151]" />
          </button>
          <h1 className="text-lg font-semibold text-[#374151]">{t("dash.client.col_job")}</h1>
          <div className="w-9 h-9" />
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Title and Category */}
        <MobileCard>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[#374151]">{job.title}</h2>
                <div className="mt-1 text-xs font-mono text-[#6B7280]">№ заявки: {job.public_id}</div>
              </div>
              {job.categories && (
                <Badge variant="secondary" className="ml-2 shrink-0">
                  {categoryLabel(job.categories, language)}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={urgencyColors[job.urgency as keyof typeof urgencyColors] || urgencyColors.normal}
              >
                {urgencyLabels[job.urgency as keyof typeof urgencyLabels] || t("ui.obychno")}
              </Badge>

              <Badge variant={job.status === 'new' ? 'default' : job.status === 'canceled' ? 'destructive' : 'secondary'}>
                {job.status === 'new' ? t("status.new") :
                 job.status === 'accepted' ? t("dash.client.st_accepted") :
                 job.status === 'in_progress' ? t("dash.client.st_in_progress") :
                 job.status === 'done' ? (job.end_confirmed ? t("status.done") : t("status.awaiting_confirm")) :
                 job.status === 'canceled' ? t("ui.otmenen") :
                 job.status}
              </Badge>
            </div>

            {(canClientEdit || canClientCancel) && (
              <div className="flex flex-wrap gap-2">
                {canClientEdit && (
                  <Button variant="outline" onClick={handleEditJob}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t("ui.redaktirovat")}
                  </Button>
                )}
                {canClientDelete && (
                  <Button variant="destructive" onClick={handleDeleteJob}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("common.delete")}
                  </Button>
                )}
                {canClientCancel && (
                  <Button variant="destructive" onClick={handleCancelJob}>
                    <XCircle className="w-4 h-4 mr-2" />
                    {t("ui.otmenit_zakaz")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </MobileCard>

        {/* Description */}
        <MobileCard>
          <div className="space-y-3">
            <h3 className="font-semibold text-[#374151]">{t("ui.opisanie")}</h3>
            <p className="text-[#6B7280] leading-relaxed">{job.description}</p>
          </div>
        </MobileCard>

        {/* Details */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151]">{t("ui.detali")}</h3>

            {/* Budget */}
            <div className="flex items-center text-[#374151]">
              <DollarSign size={18} className="mr-3 text-green-500" />
              <div>
                <div className="font-medium">{t("hero.mock.budget")}</div>
                <div className="text-sm text-[#6B7280]">
                  {job.budget_min_cents && job.budget_max_cents
                    ? `${Math.round(job.budget_min_cents / 100)}-${Math.round(job.budget_max_cents / 100)} MDL`
                    : job.budget_min_cents
                      ? `от ${Math.round(job.budget_min_cents / 100)} MDL`
                      : t("dash.pro.negotiable")}
                </div>
              </div>
            </div>

            {/* Location */}
            {job.location_address && (
              <div className="flex items-center text-[#374151]">
                <MapPin size={18} className="mr-3 text-blue-500" />
                <div>
                  <div className="font-medium">{t("ui.adres")}</div>
                  <div className="text-sm text-[#6B7280]">{job.location_address}</div>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center text-[#374151]">
              <Clock size={18} className="mr-3 text-orange-500" />
              <div>
                <div className="font-medium">{t("ui.data_publikacii")}</div>
                <div className="text-sm text-[#6B7280]">
                  {new Date(job.created_at).toLocaleDateString('ru', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Photos */}
        {job.job_photos && job.job_photos.length > 0 && (
          <MobileCard>
            <div className="space-y-3">
              <h3 className="font-semibold text-[#374151] flex items-center">
                <Camera size={18} className="mr-2" />
                Фото и видео ({job.job_photos.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {job.job_photos.map((photo, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden bg-[#D1D5DB] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openPhotoModal(index)}
                  >
                    {inferMediaKind(photo.file_url) === 'video' ? (
                      <VideoThumbnail
                        src={supabase.storage.from('evidence').getPublicUrl(photo.file_url).data.publicUrl}
                        overlayLabel={t("ui.video")}
                      />
                    ) : (
                      <MediaViewer
                        src={supabase.storage.from('evidence').getPublicUrl(photo.file_url).data.publicUrl}
                        alt={`Медиа ${index + 1}`}
                        type="image"
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </MobileCard>
        )}

        {/* Assigned Professional */}
        {isOwnJob && job.pro_id && assignedProProfile && (
          <MobileCard>
            <div className="space-y-3">
              <h3 className="font-semibold text-[#374151]">{t("ui.naznachennyi_specialist")}</h3>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center min-w-0">
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={assignedProProfile.avatar_url} />
                    <AvatarFallback>
                      {assignedProProfile.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ||
                       assignedProProfile.first_name?.[0] || 'С'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-[#374151] truncate">
                      {assignedProProfile.full_name ||
                       (assignedProProfile.first_name && assignedProProfile.last_name
                        ? `${assignedProProfile.first_name} ${assignedProProfile.last_name.charAt(0)}.`
                        : assignedProProfile.first_name || t("menu.role_pro"))}
                    </div>
                    <div className="text-sm text-[#6B7280]">{t("ui.ispolnitel_uzhe_vybran_sleduiuschii")}</div>
                  </div>
                </div>

                <div className="flex space-x-2 shrink-0">
                  <button
                    onClick={() => navigate(`/messages?user=${job.pro_id || ''}&job=${job.id}`)}
                    className="p-2 rounded-lg bg-neo neo-4 active:neo-inset-2 hover:neo-6 transition-all duration-200"
                    title={t("ui.napisat_specialistu")}
                  >
                    <MessageCircle size={18} className="text-[#374151]" />
                  </button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/pro/${job.pro_id}`)}>
                    {t("nav.profile_tab")}
                  </Button>
                </div>
              </div>
            </div>
          </MobileCard>
        )}

        {/* Assigned pro lifecycle actions */}
        {isAssignedPro && (
          <MobileCard>
            <div className="space-y-3">
              <h3 className="font-semibold text-[#374151]">{t("ui.status_vypolneniia")}</h3>

              {canStartWork && (
                <Button className="w-full" onClick={handleStartWork}>
                  {t("ui.nachat_rabotu")}
                </Button>
              )}

              {canCompleteWork && (
                <Button className="w-full" onClick={handleCompleteWork}>
                  {t("ui.zavershit_rabotu")}
                </Button>
              )}

              {isDoneAwaitingConfirmation && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <div className="font-medium">{t("ui.ozhidanie_podtverzhdeniia_zaversheniia")}</div>
                  <div className="text-sm mt-1">
                    {t("ui.rabota_otmechena_kak_vypolnennaia")}
                  </div>
                </div>
              )}
            </div>
          </MobileCard>
        )}

        {/* Client Info */}
        {job.profiles && (
          <MobileCard>
            <div className="space-y-3">
              <h3 className="font-semibold text-[#374151]">{t("ui.zakazchik")}</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={job.profiles.avatar_url} />
                    <AvatarFallback>
                      {job.profiles.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
                       job.profiles.first_name?.[0] || 'К'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-[#374151]">
                      {job.profiles.full_name ||
                       (job.profiles.first_name && job.profiles.last_name
                         ? `${job.profiles.first_name} ${job.profiles.last_name.charAt(0)}.`
                         : job.profiles.first_name || t("menu.role_client"))}
                    </div>
                    <div className="text-sm text-[#6B7280]">{t("ui.zakazchik")}</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!isOwnJob && (
                    <button
                      onClick={() => navigate(`/messages?user=${job.client_id || ''}&job=${job.id}`)}
                      className="p-2 rounded-lg bg-neo neo-4 active:neo-inset-2 hover:neo-6 transition-all duration-200"
                      title={t("ui.napisat_soobschenie")}
                    >
                      <MessageCircle size={18} className="text-[#374151]" />
                    </button>
                  )}
                  {job.profiles?.phone && (
                    <button
                      onClick={() => window.open(`tel:${job.profiles.phone}`, '_self')}
                      className="p-2 rounded-lg bg-neo neo-4 active:neo-inset-2 hover:neo-6 transition-all duration-200"
                      title={t("ui.pozvonit")}
                    >
                      <Phone size={18} className="text-[#374151]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </MobileCard>
        )}

        {/* Applications / proposals for the job owner */}
        {isOwnJob && (
          <MobileCard>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-[#374151]">{t("ui.predlozheniia_po_zakazu")}</h3>
                <p className="text-sm text-[#6B7280] mt-1">
                  {t("ui.zdes_vidno_kto_otkliknulsia")}
                </p>
              </div>
              <JobApplicationsList
                jobId={job.id}
                jobStatus={job.status}
                selectedProId={job.pro_id ?? undefined}
                onApplicationSelect={() => {
                  void fetchJobDetail(job.id);
                }}
              />
            </div>
          </MobileCard>
        )}

        {(canRateAssignedPro || shouldShowRatingSuccess) && (
          <MobileCard>
            <div className="space-y-4">
              <h3 className="font-semibold text-[#374151]">{t("ui.ocenite_rabotu_specialista")}</h3>

              {shouldShowRatingSuccess ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                  <div className="font-medium">{t("ui.otzyv_uzhe_otpravlen")}</div>
                  <div className="text-sm mt-1">{t("ui.spasibo_vasha_ocenka_uzhe")}</div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-[#6B7280]">{t("ui.vasha_ocenka")}</div>
                    <StarRating rating={rating} onRatingChange={setRating} size="lg" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-[#6B7280]">{t("ui.kommentarii_neobiazatelno")}</div>
                    <Textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder={t("ui.chto_ponravilos_v_rabote")}
                      rows={4}
                    />
                  </div>

                  <Button className="w-full" onClick={handleSubmitRating} disabled={submittingRating || rating === 0}>
                    {submittingRating ? t("ui.otpravka") : t("ui.otpravit_ocenku")}
                  </Button>
                </>
              )}
            </div>
          </MobileCard>
        )}

        {/* Cancelled status notice */}
        {job.status === 'canceled' && (
          <MobileCard>
            <div className="space-y-2 text-red-700">
              <div className="font-semibold text-[#374151]">{t("dash.client.job_canceled")}</div>
              <div className="text-sm text-[#6B7280]">
                {isOwnJob
                  ? t("ui.vy_otmenili_etot_zakaz_2")
                  : t("ui.zakaz_byl_otmenen_otklik_2")}
              </div>
            </div>
          </MobileCard>
        )}

        {/* Completion status notice */}
        {job.status === 'done' && (
          <MobileCard>
            <div className="space-y-2 text-emerald-700">
              <div className="font-semibold text-[#374151]">{t("ui.zakaz_vypolnen")}</div>
              <div className="text-sm text-[#6B7280]">
                {t("ui.zakaz_uzhe_podtverzhden_vse")}
              </div>
            </div>
          </MobileCard>
        )}

        {/* Response Button - only when a pro can truly respond */}
        {canRespond && (
          <div className="pt-4 pb-20">
            <Button
              onClick={handleResponse}
              disabled={responding}
              className="w-full h-12 bg-primary text-white rounded-xl font-semibold neo-8 disabled:opacity-50"
            >
              {responding ? t("ui.otpravka") : t("dash.pro.send_offer")}
            </Button>
          </div>
        )}

        {showResponseStatusCard && (
          <MobileCard className="mb-20">
            <div className="text-center space-y-3">
              <MessageCircle className="w-8 h-8 mx-auto text-[#6B7280]" />
              <div className="font-medium text-[#374151]">{t("ui.otklik_nedostupen")}</div>
              <div className="text-sm text-[#6B7280]">{responseStatusMessage}</div>
            </div>
          </MobileCard>
        )}
      </div>
    </div>
    </div>
  );
}