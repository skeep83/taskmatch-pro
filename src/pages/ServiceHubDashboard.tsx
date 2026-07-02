import { default as React, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobStatusBadge, JobStatusNew } from '@/components/servicehub/JobStatusBadge';
import { JobProgressTracker } from '@/components/servicehub/JobProgressTracker';
import { JobResponseCard } from '@/components/servicehub/JobResponseCard';
import { MobileTabNavigation } from '@/components/servicehub/MobileTabNavigation';
import { useToast } from '@/hooks/use-toast';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import {
  PlusCircle,
  Search,
  Filter,
  Star,
  MessageCircle,
  Eye,
  Clock,
  TrendingUp,
  Briefcase
} from 'lucide-react';

interface Job {
  id: string;
  client_id?: string;
  pro_id?: string;
  title: string;
  description: string;
  status_new: JobStatusNew;
  budget_min_cents?: number;
  budget_max_cents?: number;
  category: string;
  location_address?: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  deadline?: string;
  tags: string[];
  media_urls: string[];
  responses_count: number;
  acceptance_deadline?: string;
  client: {
    name: string;
    avatar?: string;
    rating: number;
  };
  assigned_provider?: {
    name: string;
    avatar?: string;
    rating: number;
  };
}

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalEarnings: number;
  responseRate: number;
  averageRating: number;
}

const ServiceHubDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useDeviceDetection();

  const [userRole, setUserRole] = useState<'client' | 'provider' | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    responseRate: 0,
    averageRating: 0
  });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Определяем роль пользователя
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const role = roles?.role === 'pro' ? 'provider' : 'client';
      setUserRole(role);

      // Загружаем задачи в зависимости от роли
      let jobsQuery = supabase
        .from('jobs')
        .select(`
          *,
          profiles!jobs_client_id_fkey(first_name, last_name, avatar_url),
          job_responses(count)
        `);

      if (role === 'client') {
        jobsQuery = jobsQuery.eq('client_id', user.id);
      } else {
        // Для провайдера показываем доступные задачи и назначенные ему,
        // но исключаем собственные заказы пользователя из pro-поверхностей
        jobsQuery = jobsQuery.or(`status_new.eq.Published,pro_id.eq.${user.id}`).neq('client_id', user.id);
      }

      const { data: jobsData } = await jobsQuery.order('created_at', { ascending: false });

      if (jobsData) {
        const formattedJobs: Job[] = jobsData.map(job => ({
          ...job,
          client: {
            name: `${job.profiles?.first_name || ''} ${job.profiles?.last_name || ''}`.trim() || 'Аноним',
            avatar: job.profiles?.avatar_url,
            rating: 4.8 // Заглушка
          },
          responses_count: job.job_responses?.[0]?.count || 0
        }));

        setJobs(formattedJobs);

        // Считаем статистику
        const totalJobs = formattedJobs.length;
        const activeJobs = formattedJobs.filter(j =>
          ['Published', 'Assigned', 'InProgress', 'Submitted'].includes(j.status_new)
        ).length;
        const completedJobs = formattedJobs.filter(j => j.status_new === 'Completed').length;

        setStats({
          totalJobs,
          activeJobs,
          completedJobs,
          totalEarnings: 50000, // Заглушка
          responseRate: 85, // Заглушка
          averageRating: 4.8 // Заглушка
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные дашборда',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  const filterJobs = (status?: string) => {
    if (!status || status === 'all') return jobs;
    return jobs.filter(job => job.status_new === status);
  };

  const handleTransitionStatus = async (jobId: string, newStatus: JobStatusNew, reason?: string) => {
    try {
      const { data, error } = await supabase.rpc('transition_job_status', {
        _job_id: jobId,
        _new_status: newStatus,
        _reason: reason
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Статус обновлен',
          description: 'Статус заказа успешно изменен'
        });
        loadDashboardData();
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось изменить статус заказа',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error transitioning status:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при изменении статуса',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`container mx-auto p-4 ${isMobile ? 'pb-20' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {userRole === 'client' ? 'Мои заказы' : 'Заказы для предложений'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {userRole === 'client'
                ? 'Управляйте своими заказами и отслеживайте прогресс'
                : 'Найдите заказы и отправляйте отклики'
              }
            </p>
          </div>

          <Button onClick={() => navigate('/job/new')} className="gap-2">
            <PlusCircle size={20} />
            {isMobile ? 'Создать' : 'Создать заказ'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Briefcase size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Всего заказов</p>
                <p className="text-xl font-bold">{stats.totalJobs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Активных</p>
                <p className="text-xl font-bold">{stats.activeJobs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Завершено</p>
                <p className="text-xl font-bold">{stats.completedJobs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Star size={20} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Рейтинг</p>
                <p className="text-xl font-bold">{stats.averageRating}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">Все</TabsTrigger>
                  <TabsTrigger value="Published">Новые</TabsTrigger>
                  <TabsTrigger value="InProgress">В работе</TabsTrigger>
                  <TabsTrigger value="Submitted">На проверке</TabsTrigger>
                  <TabsTrigger value="Completed">Готовые</TabsTrigger>
                </TabsList>

                <Button variant="outline" size="sm" className="gap-2">
                  <Filter size={16} />
                  Фильтры
                </Button>
              </div>

              <TabsContent value={activeTab} className="space-y-4">
                {filterJobs(activeTab === 'all' ? undefined : activeTab).map(job => (
                  <Card
                    key={job.id}
                    className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedJobId === job.id ? 'ring-2 ring-primary/20 border-primary/30' : ''
                    }`}
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            {job.title}
                          </h3>
                          <JobStatusBadge status={job.status_new} size="sm" />
                          {job.urgency === 'urgent' && (
                            <Badge variant="destructive" className="text-xs">Срочно</Badge>
                          )}
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                          {job.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{job.category}</span>
                          {job.location_address && <span>📍 {job.location_address}</span>}
                          <span>🕒 {new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        {job.budget_min_cents && job.budget_max_cents && (
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {Math.floor(job.budget_min_cents / 100)}-{Math.floor(job.budget_max_cents / 100)} MDL
                          </div>
                        )}

                        {job.responses_count > 0 && (
                          <div className="flex items-center gap-1 text-sm text-primary mt-1">
                            <MessageCircle size={14} />
                            <span>{job.responses_count} откликов</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {job.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/job/${job.id}`);
                        }}
                        className="gap-1"
                      >
                        <Eye size={16} />
                        Детали
                      </Button>

                      {userRole === 'client' && job.status_new === 'Submitted' && (
                        <>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTransitionStatus(job.id, 'Completed');
                            }}
                          >
                            Принять работу
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTransitionStatus(job.id, 'InProgress', 'change_request');
                            }}
                          >
                            Запросить изменения
                          </Button>
                        </>
                      )}

                      {userRole === 'provider' && job.status_new === 'Published' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/job/${job.id}/respond`);
                          }}
                        >
                          Отправить предложение
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}

                {filterJobs(activeTab === 'all' ? undefined : activeTab).length === 0 && (
                  <div className="text-center py-12">
                    <Search size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Заказы не найдены
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {userRole === 'client'
                        ? 'У вас пока нет заказов в этой категории'
                        : 'Нет подходящих заказов в этой категории'
                      }
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Job Details Sidebar */}
          <div>
            {selectedJob ? (
              <div className="space-y-6">
                <JobProgressTracker
                  currentStatus={selectedJob.status_new}
                  showAcceptanceDeadline={selectedJob.status_new === 'Submitted'}
                  acceptanceDeadline={selectedJob.acceptance_deadline ? new Date(selectedJob.acceptance_deadline) : undefined}
                />

                {selectedJob.assigned_provider && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Выбранный исполнитель</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div>
                        <p className="font-medium">{selectedJob.assigned_provider.name}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Star size={14} className="text-yellow-500" />
                          <span>{selectedJob.assigned_provider.rating}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Выберите заказ
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Нажмите на заказ слева, чтобы увидеть детали и прогресс
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {isMobile && <MobileTabNavigation />}
    </div>
  );
};

export default ServiceHubDashboard;