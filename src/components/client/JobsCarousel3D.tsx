import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { useNavigate } from 'react-router-dom';

// UI компоненты
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NeumorphicIcon } from '@/components/ui/neumorphic-icon';

// Иконки
import { 
  Clock, Shield, MessageSquare, CheckCircle, User, Eye, 
  ChevronLeft, ChevronRight, Star, Calendar, MapPin,
  Edit, Trash2, AlertCircle, PlayCircle, XCircle, Plus
} from 'lucide-react';

// Утилиты
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Job {
  id: string;
  title: string;
  description?: string;
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'cancelled';
  budget_min_cents?: number;
  budget_max_cents?: number;
  created_at: string;
  scheduled_at?: string;
  urgency: string;
  pro_id?: string;
  location_lat?: number;
  location_lng?: number;
  categories?: {
    label_ru: string;
    label_ro: string;
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface JobsCarousel3DProps {
  userId: string;
}

export const JobsCarousel3D: React.FC<JobsCarousel3DProps> = ({ userId }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const { formatPrice: formatCurrency } = useCurrency();
  const { toast } = useToast();
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchJobs();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`client-jobs-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `client_id=eq.${userId}`
      }, () => fetchJobs())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const fetchJobs = async () => {
    try {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          status,
          budget_min_cents,
          budget_max_cents,
          created_at,
          scheduled_at,
          urgency,
          pro_id,
          location_lat,
          location_lng,
          categories!inner (
            label_ru,
            label_ro
          ),
          profiles (
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs(jobsData || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заказы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) {
      return;
    }

    setDeleting(jobId);
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
      
      fetchJobs();
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить заказ: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % jobs.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + jobs.length) % jobs.length);
  };

  const goToCard = (index: number) => {
    setCurrentIndex(index);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return AlertCircle;
      case 'accepted': return CheckCircle;
      case 'in_progress': return PlayCircle;
      case 'done': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new': { label: 'Новый', variant: 'secondary' as const },
      'accepted': { label: 'Принят', variant: 'default' as const },
      'in_progress': { label: 'В работе', variant: 'default' as const },
      'done': { label: 'Выполнен', variant: 'default' as const },
      'cancelled': { label: 'Отменен', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const };
    const StatusIcon = getStatusIcon(status);
    
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <span>{statusInfo.label}</span>
        <StatusIcon className="h-3 w-3 flex-shrink-0" />
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      'normal': { label: 'Обычный', variant: 'outline' as const },
      'urgent': { label: 'Срочно', variant: 'secondary' as const },
      'same_day': { label: 'В тот же день', variant: 'destructive' as const }
    };
    
    const urgencyInfo = urgencyMap[urgency as keyof typeof urgencyMap] || { label: urgency, variant: 'outline' as const };
    return <Badge variant={urgencyInfo.variant}>{urgencyInfo.label}</Badge>;
  };

  const formatJobPrice = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return "Не указан";
    
    if (minCents && maxCents) {
      return `${formatCurrency(minCents)} - ${formatCurrency(maxCents)}`;
    }
    
    return formatCurrency(minCents || maxCents || 0);
  };

  const canEditJob = (job: Job) => {
    return job.status === 'new' && !job.pro_id;
  };

  const canDeleteJob = (job: Job) => {
    return job.status === 'new' && !job.pro_id;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="card-surface p-8 rounded-2xl max-w-md mx-auto">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <Card className="card-surface max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <div className="mb-6">
              <NeumorphicIcon 
                icon={Plus} 
                size={64} 
                variant="behance" 
                className="mx-auto mb-4"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет заказов</h3>
            <p className="text-muted-foreground mb-4">
              У вас пока нет созданных заказов
            </p>
            <Button onClick={() => navigate('/job/new')} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Создать заказ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с счетчиком */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Мои заказы ({jobs.length})</h3>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {jobs.length}
        </div>
      </div>
      
      {/* Контейнер карусели */}
      <div className="relative w-full max-w-lg mx-auto h-[700px] perspective-1000">
        <AnimatePresence mode="wait">
          {jobs.map((job, index) => {
            const isActive = index === currentIndex;
            if (!isActive) return null;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: 100, rotateY: 15, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, rotateY: -15, scale: 0.95 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1],
                  type: "tween"
                }}
                className="absolute inset-0 card-3d"
              >
                <Card className="card-surface h-full shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] border-0">
                  <CardHeader className="relative pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <CardTitle className="text-lg font-bold line-clamp-2">
                          {job.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDistanceToNow(new Date(job.created_at), { 
                            addSuffix: true, 
                            locale: ru 
                          })}
                        </div>
                      </div>
                      
                      {/* Действия */}
                      <div className="flex gap-2">
                        {canEditJob(job) && (
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/job/edit/${job.id}`)}
                              className="p-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )}
                        
                        {canDeleteJob(job) && (
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteJob(job.id)}
                              disabled={deleting === job.id}
                              className="p-2 text-destructive hover:text-destructive"
                            >
                              {deleting === job.id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="h-4 w-4 border border-current border-t-transparent rounded-full"
                                />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Статусы и категория */}
                    <div className="flex flex-wrap gap-2">
                      {getStatusBadge(job.status)}
                      {getUrgencyBadge(job.urgency)}
                      {job.categories && (
                        <Badge variant="outline">
                          {job.categories.label_ru}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 flex-1">
                    {/* Описание */}
                    {job.description && (
                      <div>
                        <h4 className="font-medium mb-2">Описание</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {job.description}
                        </p>
                      </div>
                    )}

                    {/* Бюджет */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <NeumorphicIcon icon={Star} size={24} variant="soft-inset" />
                        <span className="font-medium">Бюджет</span>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {formatJobPrice(job.budget_min_cents, job.budget_max_cents)}
                      </p>
                    </div>

                    {/* Запланированное время */}
                    {job.scheduled_at && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Запланировано</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(job.scheduled_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Исполнитель */}
                    {job.pro_id && job.profiles && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Исполнитель</p>
                          <p className="text-sm text-muted-foreground">
                            {job.profiles.full_name || 
                             `${job.profiles.first_name} ${job.profiles.last_name}`.trim() ||
                             'Неизвестный специалист'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Действия */}
                    <div className="space-y-3 pt-4 border-t">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          onClick={() => navigate(`/job/${job.id}`)}
                          className="w-full"
                          variant="default"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Просмотреть заказ
                        </Button>
                      </motion.div>
                      
                      {job.status === 'new' && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button 
                            onClick={() => navigate(`/job/${job.id}?tab=applications`)}
                            className="w-full"
                            variant="outline"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Смотреть отклики
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Навигация */}
      {jobs.length > 1 && (
        <div className="flex items-center justify-center gap-6 py-4">
          {/* Предыдущая карточка */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              onClick={prevCard}
              size="sm"
              variant="outline"
              className="card-surface w-12 h-12 rounded-full p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </motion.div>

          {/* Индикаторы */}
          <div className="flex gap-2">
            {jobs.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => goToCard(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-primary' 
                    : 'bg-muted hover:bg-muted-foreground/50'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                animate={index === currentIndex ? { scale: 1.25 } : { scale: 1 }}
              />
            ))}
          </div>

          {/* Следующая карточка */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              onClick={nextCard}
              size="sm"
              variant="outline"
              className="card-surface w-12 h-12 rounded-full p-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
};