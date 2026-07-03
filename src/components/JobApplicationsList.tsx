import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { openChatWidget, isDesktopViewport } from '@/lib/chatWidget';
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
import { Link, useNavigate } from 'react-router-dom';
import { JobStatusProgress } from '@/components/JobStatusProgress';
import { useEnhancedI18n } from "@/i18n/enhanced";

interface JobApplication {
  id: string;
  responseSource: 'job_application' | 'job_price_proposal';
  responseLabel: string;
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

interface PortfolioImage {
  id: string;
  url: string;
  title: string;
  description: string;
  isMain: boolean;
}

type JobProgressStatus = 'new' | 'accepted' | 'in_progress' | 'done' | 'canceled' | 'disputed';

const normalizeJobProgressStatus = (status: string): JobProgressStatus => {
  if (status === 'accepted' || status === 'in_progress' || status === 'done' || status === 'canceled' || status === 'disputed') {
    return status;
  }

  return 'new';
};

const invokeEdgeFunction = async <T,>(name: string, payload: Record<string, unknown>) => {
  const initialResult = await supabase.functions.invoke(name, {
    body: payload,
  });

  if (!initialResult.error) {
    return initialResult as { data: T; error: null };
  }

  const fallbackNeeded = /unknown function/i.test(initialResult.error.message || '')
    || /non-2xx/i.test(initialResult.error.message || '')
    || /failed with 404/i.test(initialResult.error.message || '');

  if (!fallbackNeeded) {
    return initialResult as { data: null; error: Error };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return initialResult as { data: null; error: Error };
  }

  const tryFetch = async (url: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    return { response, data };
  };

  const fallbackUrls = [
    `${window.location.origin}/marketplace-api/functions/${name}`,
    `${SUPABASE_URL}/functions/v1/${name}`,
  ];

  for (const url of fallbackUrls) {
    try {
      const { response, data } = await tryFetch(url);
      if (response.ok) {
        return { data: data as T, error: null };
      }

      const message = typeof data === 'object' && data && 'error' in data
        ? String((data as { error?: unknown }).error)
        : `Function failed with status ${response.status}`;

      if (response.status !== 404) {
        return { data: null, error: new Error(message) };
      }
    } catch (error) {
      continue;
    }
  }

  return initialResult as { data: null; error: Error };
};

const invokeJobApplicationSelect = async (applicationId: string, jobId: string) => {
  return invokeEdgeFunction('job-application-select', { applicationId, jobId });
};

const fetchJobApplications = async (jobId: string) => {
  return invokeEdgeFunction<{ applications?: JobApplication[] }>('job-applications-list', { jobId });
};

export function JobApplicationsList({
  jobId,
  jobStatus,
  selectedProId,
  onApplicationSelect
}: JobApplicationsListProps) {
  const { t } = useEnhancedI18n();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<JobApplication | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allPortfolioImages, setAllPortfolioImages] = useState<PortfolioImage[]>([]);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);

      const result = await fetchJobApplications(jobId);
      if (result.error) {
        throw result.error;
      }

      const fetchedApplications = result.data?.applications || [];
      setApplications(fetchedApplications);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: t("ui.ne_udalos_zagruzit_predlozheniia"),
        description: error instanceof Error ? error.message : t("ui.poprobuite_obnovit_stranicu"),
        variant: 'destructive',
      });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, toast]);

  useEffect(() => {
    if (jobId) {
      fetchApplications();
    }
  }, [fetchApplications, jobId]);

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
          void fetchApplications();
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
          void fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApplications, jobId]);

  const handleSelectProfessional = async (application: JobApplication) => {
    try {
      setSelecting(application.id);

      const { data, error } = await invokeJobApplicationSelect(application.id, jobId);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchApplications();
      onApplicationSelect();

      toast({
        title: t("dash.client.st_accepted"),
        description: t("ui.predlozhenie_uspeshno_priniato_zakaz")
      });

      if (data?.chatId) {
        if (isDesktopViewport()) {
          openChatWidget(String(data.chatId));
        } else {
          navigate(`/messages/${data.chatId}`);
        }
        return;
      }
      navigate(`/messages?user=${application.pro_id}&job=${jobId}`);
    } catch (error: unknown) {
      console.error('Error selecting professional:', error);
      const message = error instanceof Error ? error.message : t("ui.ne_udalos_vybrat_ispolnitelia");
      toast({
        title: t("notifications.error"),
        description: message,
        variant: 'destructive'
      });
    } finally {
      setSelecting(null);
    }
  };

  const handlePortfolioOpen = (application: JobApplication) => {
    console.log('🖼️ Opening portfolio for:', application.pro_id, application);

    // Собираем все изображения из портфолио
    const images: PortfolioImage[] = [];
    application.portfolio?.forEach(item => {
      // Добавляем основное изображение
      if (item.image_url) {
        images.push({
          id: `main-${item.id}`,
          url: item.image_url,
          title: item.title || t("ui.osnovnoe_foto"),
          description: `Работа: ${item.title || t("dash.client.untitled")}`,
          isMain: true
        });
      }

      // Добавляем дополнительные изображения
      if (item.portfolio_media) {
        item.portfolio_media
          .filter(media => media.file_type === 'image' || media.file_type.startsWith('image/'))
          .sort((a, b) => a.display_order - b.display_order)
          .forEach(media => {
            images.push({
              id: media.id,
              url: media.file_url,
              title: media.file_name || t("ui.dopolnitelnoe_foto"),
              description: `Работа: ${item.title || t("dash.client.untitled")}`,
              isMain: false
            });
          });
      }
    });

    console.log('🎨 All portfolio images:', images);
    setAllPortfolioImages(images);
    setCurrentImageIndex(0);
    setSelectedPortfolio(application);
    setPortfolioModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">{t("ui.zagruzka_otklikov")}</div>;
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("ui.poka_net_predlozhenii")}</h3>
          <p className="text-muted-foreground">
            {t("ui.specialisty_uvidiat_vash_zakaz")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Если специалист назначен, показываем статус выполнения и назначенного специалиста
  if (selectedProId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">
            {t("dash.client.st_accepted")}
          </h3>
        </div>

        {/* Assigned Professional Card */}
        <div className="card-surface p-6">
          <h4 className="text-lg font-semibold mb-4">{t("ui.vash_ispolnitel")}</h4>
          {applications.length > 0 && (
            (() => {
              const assignedApp = applications.find(app => app.pro_id === selectedProId);
              if (!assignedApp) return <div>{t("ui.zagruzka_dannyh_ispolnitelia")}</div>;

              const profileName = assignedApp.profiles?.full_name ||
                (assignedApp.profiles?.first_name && assignedApp.profiles?.last_name
                  ? `${assignedApp.profiles.first_name} ${assignedApp.profiles.last_name}`
                  : t("menu.role_pro"));

              return (
                <div className="card-3d group relative w-full bg-neo rounded-3xl neo-12 overflow-hidden transform-gpu">
                  {/* Top gradient section */}
                  <div className="relative h-32 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/20" />
                  </div>

                  {/* Avatar positioned to overlap sections - with higher z-index */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-16 z-10">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <Avatar className="w-32 h-32 ring-4 ring-white shadow-xl">
                        <AvatarImage
                          src={assignedApp.profiles?.avatar_url || ''}
                          alt={profileName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white font-bold text-2xl">
                          {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Status indicator */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white z-20"
                      >
                        <CheckCircle className="w-6 h-6 text-white" />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Bottom white section */}
                  <div className="relative bg-neo px-6 pt-20 pb-8">
                    {/* Name and title */}
                    <div className="text-center mb-6">
                      <h4 className="font-bold text-xl text-gray-900 mb-1">{profileName}</h4>
                      <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                        {t("ui.specialist")}
                      </p>
                    </div>

                    {/* Rating */}
                    {assignedApp.rating && (
                      <div className="flex justify-center items-center gap-2 mb-6">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${star <= assignedApp.rating!.avg_score ? 'text-purple-500 fill-purple-500' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          ({assignedApp.rating.rating_count})
                        </span>
                      </div>
                    )}

                    {/* Price section */}
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatPrice(assignedApp.price_cents)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t("ui.predlozhennaia_cena")}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                      <Link
                        to={`/messages?user=${selectedProId}&job=${jobId}`}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {t("nav.chat_tab")}
                      </Link>
                      <Link
                        to={`/pro/${selectedProId}`}
                        className="w-full border border-purple-200 text-purple-600 hover:bg-purple-50 font-medium py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t("nav.profile_tab")}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Job Status Progress */}
        <div className="card-surface p-6">
          <JobStatusProgress
            status={normalizeJobProgressStatus(jobStatus)}
            startConfirmed={false}
            endConfirmed={false}
          />
        </div>

        {/* Tips for working with professional */}
        <div className="card-surface p-6">
          <h4 className="text-lg font-semibold mb-4">{t("ui.sovety_po_rabote_s")}</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                {t("ui.obsudite_vse_detali_raboty")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                {t("ui.proveriaite_progress_rabot_cherez")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                {t("ui.podtverzhdaite_kazhdyi_etap_tolko")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-muted-foreground">
                {t("ui.ostavte_otzyv_posle_zaversheniia")}
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
          Предложения ({applications.length})
        </h3>
        {/* Debug info */}
        <div className="text-sm text-muted-foreground">
          Текущая карточка: {currentIndex + 1} / {applications.length}
        </div>
      </div>

      {/* Card Deck Container */}
      <div className="relative w-full max-w-lg mx-auto h-[700px] border border-dashed border-muted-foreground/20 rounded-lg overflow-visible">
        <AnimatePresence mode="wait">
          {applications.map((application, index) => {
            const isSelected = selectedProId === application.pro_id;
            const canSelect = jobStatus === 'new' && !selectedProId;

            // Формируем имя специалиста
            const profileName = application.profiles?.full_name ||
              (application.profiles?.first_name && application.profiles?.last_name
                ? `${application.profiles.first_name} ${application.profiles.last_name}`
                : t("menu.role_pro"));

            // Only show current card
            if (index !== currentIndex) return null;

            return (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, x: 100, rotateY: 15 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -100, rotateY: -15 }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="absolute inset-0 perspective-1000"
              >
                {/* 3D Card with gradient background like reference */}
                <div className="card-3d group relative w-full h-full bg-neo rounded-3xl neo-12 overflow-hidden transform-gpu">
                  {/* Top gradient section */}
                  <div className="relative h-32 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/20" />
                  </div>

                  {/* Avatar positioned to overlap sections - with higher z-index */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-16 z-10">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <Avatar className="w-32 h-32 ring-4 ring-white shadow-xl">
                        <AvatarImage
                          src={application.profiles?.avatar_url || ''}
                          alt={profileName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white font-bold text-2xl">
                          {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Status indicator */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white z-20"
                        >
                          <CheckCircle className="w-6 h-6 text-white" />
                        </motion.div>
                      )}
                    </motion.div>
                  </div>

                   {/* Bottom white section */}
                   <div className="relative bg-neo px-6 pt-20 pb-8">
                    {/* Name and title */}
                    <div className="text-center mb-6">
                      <h4 className="font-bold text-xl text-gray-900 mb-1">{profileName}</h4>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                          {t("ui.specialist")}
                        </p>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          {application.responseLabel}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4 mb-6">
                      {/* Experience/Bio */}
                      <div className="text-center">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {application.proProfile?.bio || t("ui.opytnyi_specialist_gotov_vypolnit")}
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
                          {t("ui.predlozhennaia_cena")}
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

                     {/* Portfolio and Action buttons */}
                     <div className="space-y-3">
                       {/* Portfolio button */}
                        <Button
                          onClick={() => handlePortfolioOpen(application)}
                          variant="outline"
                          className="w-full border-purple-200 text-purple-600 hover:bg-purple-50 font-medium py-2 rounded-lg transition-all duration-200"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("dash.pro.portfolio")}
                        </Button>

                       {/* Action button */}
                       {canSelect && (
                         <Button
                           onClick={() => handleSelectProfessional(application)}
                           disabled={selecting === application.id}
                           className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                         >
                           {selecting === application.id ? t("ui.prinimaem_predlozhenie") : t("ui.priniat_predlozhenie")}
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

      {/* Navigation */}
      {applications.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + applications.length) % applications.length)}
            className="w-10 h-10 rounded-full p-0 hover:bg-muted"
            disabled={applications.length <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              {currentIndex + 1} из {applications.length}
            </span>
            <div className="flex gap-2">
              {applications.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index === currentIndex
                      ? 'bg-primary scale-125'
                      : 'bg-muted hover:bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % applications.length)}
            className="w-10 h-10 rounded-full p-0 hover:bg-muted"
            disabled={applications.length <= 1}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Portfolio Modal */}
      <Dialog open={portfolioModalOpen} onOpenChange={setPortfolioModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={selectedPortfolio?.profiles?.avatar_url || ''}
                  alt={selectedPortfolio?.profiles?.full_name || t("menu.role_pro")}
                />
                <AvatarFallback>
                  {selectedPortfolio?.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'С'}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-xl">Портфолио {selectedPortfolio?.profiles?.full_name || 'специалиста'}</span>
                <p className="text-sm text-muted-foreground font-normal">
                  {selectedPortfolio?.proProfile?.bio || t("ui.opytnyi_specialist")}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            {allPortfolioImages.length > 0 ? (
              <div className="space-y-6">
                {/* Main Image Display */}
                <div className="relative">
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-muted shadow-2xl"
                  >
                    <OptimizedImage
                      src={allPortfolioImages[currentImageIndex]?.url}
                      alt={allPortfolioImages[currentImageIndex]?.title}
                      width={800}
                      height={500}
                      className="w-full h-full object-cover"
                    />

                    {/* Image info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                      <div className="text-white">
                        <h4 className="text-lg font-semibold mb-1">
                          {allPortfolioImages[currentImageIndex]?.title}
                        </h4>
                        <p className="text-sm opacity-90">
                          {allPortfolioImages[currentImageIndex]?.description}
                        </p>
                        {allPortfolioImages[currentImageIndex]?.isMain && (
                          <div className="inline-flex items-center gap-2 mt-2 bg-primary/20 text-primary-foreground px-3 py-1 rounded-lg text-sm">
                            <Star className="w-4 h-4" />
                            {t("ui.glavnoe_foto")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Navigation arrows */}
                    {allPortfolioImages.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentImageIndex((prev) => (prev - 1 + allPortfolioImages.length) % allPortfolioImages.length)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-0"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentImageIndex((prev) => (prev + 1) % allPortfolioImages.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-0"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                      </>
                    )}

                    {/* Image counter */}
                    {allPortfolioImages.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-medium">
                        {currentImageIndex + 1} / {allPortfolioImages.length}
                      </div>
                    )}

                    {/* Full screen button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(allPortfolioImages[currentImageIndex]?.url, '_blank')}
                      className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>

                {/* Thumbnail Navigation */}
                {allPortfolioImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
                    {allPortfolioImages.map((image, index) => (
                      <motion.button
                        key={image.id}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          index === currentImageIndex
                            ? 'border-primary shadow-lg scale-105'
                            : 'border-transparent hover:border-muted-foreground/50'
                        }`}
                        whileHover={{ scale: index === currentImageIndex ? 1.05 : 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <OptimizedImage
                          src={image.url}
                          alt={image.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                        {image.isMain && (
                          <div className="absolute top-1 left-1 w-2 h-2 bg-primary rounded-full" />
                        )}
                        {index === currentImageIndex && (
                          <div className="absolute inset-0 bg-primary/20" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(allPortfolioImages[currentImageIndex]?.url, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("ui.otkryt_v_polnom_razmere")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">{t("ui.portfolio_poka_pusto")}</h3>
                <p className="text-gray-500">
                  {t("ui.specialist_esche_ne_dobavil")}
                </p>
              </div>
            )}
          </div>

          {/* Portfolio stats */}
          {selectedPortfolio && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span>Работ в портфолио: {selectedPortfolio.portfolio?.length || 0}</span>
                  {selectedPortfolio.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {selectedPortfolio.rating.avg_score.toFixed(1)} ({selectedPortfolio.rating.rating_count} отзывов)
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/pro/${selectedPortfolio.pro_id}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t("ui.polnyi_profil")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}