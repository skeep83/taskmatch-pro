import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useMobile } from "@/mobile/providers/MobileProvider";
import { Seo } from "@/components/Seo";
import { getUserRole } from "@/lib/userRoles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function MobileFeed() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { t } = useEnhancedI18n();
  const { safeAreaInsets } = useMobile();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string>("client");
  const [user, setUser] = useState<any>(null);
  const [acceptingJob, setAcceptingJob] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user, selectedCategory]);

  const checkAuth = async () => {
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
    } catch (error: any) {
      console.error("Auth error:", error);
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      setRefreshing(true);

      // Load categories first
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("label_ru");

      if (categoriesError) {
        console.warn("Categories loading error:", categoriesError);
      } else {
        setCategories(categoriesData || []);
      }

      // Load jobs via edge function
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
        body: { params: Object.fromEntries(params) }
      });

      if (error) {
        throw error;
      }

      if (response.error) {
        throw new Error(response.error);
      }

      setJobs(response.jobs || []);
    } catch (error: any) {
      console.error("Error loading jobs:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить заказы",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const acceptJob = async (jobId: string) => {
    if (!user) return;
    
    try {
      setAcceptingJob(jobId);

      const { error } = await supabase
        .from("jobs")
        .update({ 
          pro_id: user.id, 
          status: "accepted" 
        })
        .eq("id", jobId)
        .eq("status", "new"); // Only accept if still new

      if (error) throw error;

      toast({
        title: "Заказ принят!",
        description: "Заказ был успешно принят в работу"
      });

      // Refresh jobs list
      await loadJobs();
    } catch (error: any) {
      console.error("Error accepting job:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось принять заказ",
        variant: "destructive"
      });
    } finally {
      setAcceptingJob(null);
    }
  };

  const handleJobPress = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  const filteredJobs = jobs.filter(job => {
    if (searchQuery && job.description) {
      return job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
             job.categories?.label_ru?.toLowerCase().includes(searchQuery.toLowerCase());
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
      case 'urgent': return 'Срочно';
      case 'same_day': return 'В тот же день';
      default: return 'Обычный';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5E7EB]">
        <MobileCard className="p-8 text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-lg">Загрузка...</p>
        </MobileCard>
      </div>
    );
  }

  return (
    <>
      <Seo 
        title="Лента заказов — ServiceHub" 
        description="Доступные заказы для специалистов" 
        canonical="/feed" 
      />
      
      <div className="min-h-screen bg-[#E5E7EB]">
        <MobileHeader 
          title="Лента заказов"
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
              {userRole === "pro" ? "Доступные заказы" : "Поиск специалистов"}
            </h1>
            <p className="text-muted-foreground mb-4">
              {userRole === "pro" 
                ? "Выберите подходящий заказ для работы"
                : "Найдите лучших специалистов в вашем городе"
              }
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <AnimatedIcon icon={Zap} className="text-primary h-3 w-3" />
                <span className="text-xs font-medium">Мгновенные выплаты</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-200">
                <AnimatedIcon icon={Shield} className="text-green-500 h-3 w-3" />
                <span className="text-xs font-medium">Защита эскроу</span>
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
                  placeholder="Поиск заказов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все категории</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label_ru || cat.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </MobileCard>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Всего заказов</p>
                  <p className="text-xl font-bold">{filteredJobs.length}</p>
                </div>
                <NeumorphicIcon icon={AlertCircle} size={32} variant="behance" />
              </div>
            </MobileCard>

            <MobileCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Обновлено</p>
                  <p className="text-sm font-medium">Сейчас</p>
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
                <h3 className="text-lg font-semibold mb-2">Заказы не найдены</h3>
                <p className="text-muted-foreground text-sm">
                  Попробуйте изменить фильтры поиска
                </p>
              </MobileCard>
            ) : (
              filteredJobs.map((job) => (
                <MobileCard key={job.id} className="p-0 overflow-hidden">
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {job.categories?.label_ru || "Услуга"}
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
                      {job.title || job.description || "Заказ без описания"}
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
                              : 'Договорная'}
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
                            src={photo.file_url}
                            alt="Фото заказа"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        ))}
                        {job.job_photos.length > 3 && (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
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
                               : 'Клиент')}
                          </p>
                          <p className="text-xs text-muted-foreground">Заказчик</p>
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
                      Подробнее
                    </Button>
                    
                    {userRole === "pro" && job.status === "new" && (
                      <Button
                        size="sm"
                        onClick={() => acceptJob(job.id)}
                        disabled={acceptingJob === job.id}
                        className="flex-1"
                      >
                        {acceptingJob === job.id ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4 mr-2" />
                        )}
                        {acceptingJob === job.id ? 'Принимаем...' : 'Откликнуться'}
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