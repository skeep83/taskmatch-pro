import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { categoryLabel } from '@/lib/categoryLabel';
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useMobile } from "@/mobile/providers/MobileProvider";
import { Seo } from "@/components/Seo";
import { getUserRole } from "@/lib/userRoles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { MobileCard } from "@/mobile/components/ui/MobileCard";
import { MobileHeader } from "@/mobile/components/navigation/MobileHeader";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Euro,
  Star,
  Video,
  Shield,
  Zap,
  Eye,
  MessageSquare,
  Heart,
  RefreshCw,
  Calendar,
  User,
  AlertCircle
} from "lucide-react";

interface Job {
  id: string;
  title?: string;
  description?: string;
  status: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  created_at: string;
  scheduled_at?: string;
  urgency: string;
  location_address?: string;
  client_id: string;
  category_id: string;
  categories?: {
    label_ru: string;
    label_ro: string;
  };
  profiles?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  job_photos: Array<{ file_url: string }>;
}

interface Category {
  id: string;
  key: string;
  label_ru: string;
  label_ro: string;
}

interface ResponseJobRef {
  job_id: string;
}

export default function MobileFeed() {
  console.log("MobileFeed component loading...", { React });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { t, language } = useEnhancedI18n();
  const { safeAreaInsets } = useMobile();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string>("client");
  const [user, setUser] = useState<{ id: string } | null>(null);


  const checkAuth = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.session.user);

      // Load user role
      const roleResult = await getUserRole(session.session.user.id);
      if (roleResult.success) {
        setUserRole(roleResult.role);
      }

      setLoading(false);
    } catch (error) {
      console.error("Auth error:", error);
      setLoading(false);
    }
  }, [navigate]);

  const loadJobs = useCallback(async () => {
    try {
      setRefreshing(true);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("label_ru");

      if (categoriesError) {
        console.warn("Categories loading error:", categoriesError);
      } else {
        setCategories(categoriesData || []);
      }

      const params = new URLSearchParams({
        page: "1",
        limit: "20"
      });

      if (selectedCategory) {
        params.append("category_id", selectedCategory);
      }

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const { data: response, error } = await supabase.functions.invoke('jobs-catalog', {
        body: { params: { ...Object.fromEntries(params), lang: language } }
      });

      if (error) throw error;
      if (response.error) throw new Error(response.error);

      let respondedJobIds = new Set<string>();

      if (userRole === 'pro' && user?.id) {
        const [{ data: applications }, { data: proposals }] = await Promise.all([
          supabase.from('job_applications').select('job_id').eq('pro_id', user.id),
          supabase.from('job_price_proposals').select('job_id').eq('pro_id', user.id),
        ]);

        respondedJobIds = new Set([
          ...((applications as ResponseJobRef[] | null) || []).map((row) => row.job_id),
          ...((proposals as ResponseJobRef[] | null) || []).map((row) => row.job_id),
        ]);
      }

      const visibleJobs = (response.jobs || []).filter((job: Job) => {
        if (userRole !== 'pro' || !user?.id) return true;
        return job.client_id !== user.id && !respondedJobIds.has(job.id);
      });

      setJobs(visibleJobs);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast({
        title: t("notifications.error"),
        description: error instanceof Error ? error.message : t("biz.jobs.load_error"),
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory, toast, user?.id, userRole]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      void loadJobs();
    }
  }, [loadJobs, user]);

  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadJobs();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const jobsChannel = supabase
      .channel(`mobile-feed-jobs-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
      }, () => {
        void loadJobs();
      })
      .subscribe();

    const applicationsChannel = supabase
      .channel(`mobile-feed-applications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'job_applications',
        filter: `pro_id=eq.${user.id}`,
      }, () => {
        void loadJobs();
      })
      .subscribe();

    const proposalsChannel = supabase
      .channel(`mobile-feed-proposals-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'job_price_proposals',
        filter: `pro_id=eq.${user.id}`,
      }, () => {
        void loadJobs();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(jobsChannel);
      void supabase.removeChannel(applicationsChannel);
      void supabase.removeChannel(proposalsChannel);
    };
  }, [loadJobs, user?.id]);


  const handleJobPress = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  const filteredJobs = jobs.filter(job => {
    if (searchQuery && job.description) {
      return job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
             categoryLabel(job.categories, language)?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'text-orange-500';
      case 'same_day': return 'text-red-500';
      default: return 'text-green-500';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return t("dash.client.urg_urgent");
      case 'same_day': return t("dash.client.urg_same_day");
      default: return t("dash.client.urg_normal");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo">
        <MobileCard className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-lg">{t("common.loading")}</p>
        </MobileCard>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={t("ui.lenta_zakazov_servicehub")}
        description={t("ui.zakazy_dlia_otpravki_predlozhenii")}
        canonical="/feed"
      />

      <div className="min-h-screen bg-neo">
        <MobileHeader
          title={t("footer.feed")}
          showBack={true}
          showNotifications={true}
        />

        <div
          className="pt-20 pb-24 px-4 space-y-6"
          style={{ paddingTop: `${80 + safeAreaInsets.top}px` }}
        >
          {/* Hero Section */}
          <MobileCard className="text-center">
            <h1 className="text-2xl font-bold mb-2">
              {userRole === "pro" ? t("dash.pro.jobs_for_offers") : t("footer.feed")}
            </h1>
            <p className="text-muted-foreground mb-4">
              {userRole === "pro"
                ? t("ui.pokazyvaem_tolko_novye_zakazy")
                : t("ui.smotrite_novye_zakazy_na")
              }
            </p>

            <div className="flex flex-wrap gap-2 justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <AnimatedIcon icon={Zap} className="text-primary h-3 w-3" />
                <span className="text-xs font-medium">{t("ui.novye_zakazy")}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-200">
                <AnimatedIcon icon={Shield} className="text-green-500 h-3 w-3" />
                <span className="text-xs font-medium">{t("ui.otkliki_i_soobscheniia")}</span>
              </div>
            </div>
          </MobileCard>

          {/* Filters */}
          <MobileCard>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t("ui.poisk_zakazov")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">{t("feed.category.all")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {categoryLabel(cat, language) || cat.key}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </MobileCard>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("biz.analytics.total_jobs")}</p>
                  <p className="text-xl font-bold">{filteredJobs.length}</p>
                </div>
                <NeumorphicIcon icon={AlertCircle} size={32} variant="behance" />
              </div>
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("ui.obnovleno")}</p>
                  <p className="text-sm font-medium">{t("ui.seichas")}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadJobs}
                  disabled={refreshing}
                  className="p-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </MobileCard>
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {filteredJobs.length === 0 ? (
              <MobileCard className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold mb-2">{t("ui.zakazy_ne_naideny")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("catalog.try_filters")}
                </p>
              </MobileCard>
            ) : (
              filteredJobs.map((job) => (
                <MobileCard key={job.id} className="p-0 overflow-hidden">
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabel(job.categories, language) || t("ui.usluga")}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-base mb-2 line-clamp-2">
                      {job.title || job.description || t("ui.zakaz_bez_opisaniia")}
                    </h3>

                    {/* Info */}
                    <div className="space-y-2 mb-4">
                      {(job.budget_min_cents || job.budget_max_cents) && (
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            {job.budget_min_cents && job.budget_max_cents
                              ? `${formatPrice(job.budget_min_cents)} - ${formatPrice(job.budget_max_cents)}`
                              : job.budget_min_cents
                              ? `от ${formatPrice(job.budget_min_cents)}`
                              : job.budget_max_cents
                              ? `до ${formatPrice(job.budget_max_cents)}`
                              : t("dash.pro.negotiable")}
                          </span>
                        </div>
                      )}

                      {job.location_address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {job.location_address}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Star className={`h-4 w-4 ${getUrgencyColor(job.urgency)}`} />
                        <span className="text-sm text-muted-foreground">
                          Срочность: {getUrgencyLabel(job.urgency)}
                        </span>
                      </div>
                    </div>

                    {/* Photos */}
                    {job.job_photos && job.job_photos.length > 0 && (
                      <div className="flex gap-2 mb-4 overflow-x-auto">
                        {job.job_photos.slice(0, 3).map((photo, index) => (
                          <img
                            key={index}
                            src={`${SUPABASE_URL}/storage/v1/object/public/evidence/${photo.file_url}`}
                            alt={t("ui.foto_zakaza")}
                            className="w-16 h-16 object-cover rounded-lg border border-border"
                            onError={(e) => {
                              console.log("Failed to load image:", photo.file_url);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ))}
                         {job.job_photos.length > 3 && (
                          <div className="w-16 h-16 bg-muted rounded-lg border border-border flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              +{job.job_photos.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Client info */}
                    {job.profiles && (
                      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {job.profiles.full_name ||
                             (job.profiles.first_name && job.profiles.last_name
                               ? `${job.profiles.first_name} ${job.profiles.last_name.charAt(0)}.`
                               : t("menu.role_client"))}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("ui.zakazchik")}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 p-4 pt-0 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJobPress(job.id)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t("dash.pro.details")}
                    </Button>

                    {userRole === "pro" && job.status === "new" && job.client_id !== user?.id && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/job/${job.id}/respond`)}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t("dash.pro.send_offer")}
                      </Button>
                    )}

                    <Button variant="ghost" size="sm" className="px-3">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </MobileCard>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}