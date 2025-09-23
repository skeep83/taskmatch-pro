import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Star, 
  Award, 
  Sparkles, 
  Crown, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Rating {
  id: string;
  score: number;
  comment?: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
  job_id: string;
  from_user_profile?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  to_user_profile?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  job?: {
    title?: string;
    description?: string;
    categories?: {
      label_ru?: string;
    };
  };
}

interface HallOfFameProps {
  userId: string;
  userRole: 'client' | 'pro' | 'business';
  className?: string;
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ userId, userRole, className = '' }) => {
  const [receivedRatings, setReceivedRatings] = useState<Rating[]>([]);
  const [givenRatings, setGivenRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [currentPage, setCurrentPage] = useState(0);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalRatings: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0
  });
  const { toast } = useToast();

  const RATINGS_PER_PAGE = 3;

  useEffect(() => {
    loadRatings();
  }, [userId]);

  const loadRatings = async () => {
    try {
      setLoading(true);
      
      // Load ratings received by this user
      const { data: received, error: receivedError } = await supabase
        .from('ratings')
        .select(`
          *,
          from_user_profile:profiles!ratings_from_user_id_fkey(
            first_name,
            last_name,
            full_name,
            avatar_url
          ),
          job:jobs(
            title,
            description,
            categories(label_ru)
          )
        `)
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Load ratings given by this user
      const { data: given, error: givenError } = await supabase
        .from('ratings')
        .select(`
          *,
          to_user_profile:profiles!ratings_to_user_id_fkey(
            first_name,
            last_name,
            full_name,
            avatar_url
          ),
          job:jobs(
            title,
            description,
            categories(label_ru)
          )
        `)
        .eq('from_user_id', userId)
        .order('created_at', { ascending: false });

      if (givenError) throw givenError;

      setReceivedRatings(received || []);
      setGivenRatings(given || []);

      // Calculate statistics for received ratings
      if (received && received.length > 0) {
        const total = received.length;
        const average = received.reduce((sum, rating) => sum + rating.score, 0) / total;
        const distribution = received.reduce((acc, rating) => {
          acc[`${rating.score}Stars`] = (acc[`${rating.score}Stars`] || 0) + 1;
          return acc;
        }, {} as any);

        setStats({
          averageRating: average,
          totalRatings: total,
          fiveStars: distribution['5Stars'] || 0,
          fourStars: distribution['4Stars'] || 0,
          threeStars: distribution['3Stars'] || 0,
          twoStars: distribution['2Stars'] || 0,
          oneStar: distribution['1Stars'] || 0
        });
      }

    } catch (error: any) {
      console.error('Error loading ratings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить отзывы',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentRatings = () => {
    return activeTab === 'received' ? receivedRatings : givenRatings;
  };

  const getTotalPages = () => {
    const ratings = getCurrentRatings();
    return Math.ceil(ratings.length / RATINGS_PER_PAGE);
  };

  const getCurrentPageRatings = () => {
    const ratings = getCurrentRatings();
    const start = currentPage * RATINGS_PER_PAGE;
    return ratings.slice(start, start + RATINGS_PER_PAGE);
  };

  const nextPage = () => {
    const totalPages = getTotalPages();
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getRatingBadgeColor = (score: number) => {
    if (score >= 5) return 'bg-green-500';
    if (score >= 4) return 'bg-blue-500';
    if (score >= 3) return 'bg-yellow-500';
    if (score >= 2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProfileName = (profile: any) => {
    if (!profile) return 'Пользователь';
    return profile.full_name || 
           (profile.first_name && profile.last_name 
             ? `${profile.first_name} ${profile.last_name}` 
             : profile.first_name || 'Пользователь');
  };

  if (loading) {
    return (
      <div className={`card-surface p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка отзывов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Trophy Icon */}
      <div className="card-surface p-6">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: "backOut" }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]"
          >
            <Trophy className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Зал славы
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </h2>
          <p className="text-muted-foreground">
            {userRole === 'pro' ? 'Отзывы клиентов о вашей работе' : 'Ваши отзывы и оценки'}
          </p>
        </div>

        {/* Statistics for received ratings */}
        {activeTab === 'received' && stats.totalRatings > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
          >
            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/60">
              <div className="text-2xl font-bold text-yellow-600">{stats.averageRating.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Средняя оценка</div>
              <div className="flex justify-center mt-1">
                <StarRating rating={stats.averageRating} readonly size="sm" />
              </div>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/60">
              <div className="text-2xl font-bold text-primary">{stats.totalRatings}</div>
              <div className="text-sm text-muted-foreground">Всего отзывов</div>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/60">
              <div className="text-xl font-bold text-green-600">{stats.fiveStars}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Star className="w-3 h-3 fill-current" />5
              </div>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/60">
              <div className="text-xl font-bold text-blue-600">{stats.fourStars}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Star className="w-3 h-3 fill-current" />4
              </div>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/60">
              <div className="text-xl font-bold text-yellow-600">{stats.threeStars}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Star className="w-3 h-3 fill-current" />3
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'received' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('received');
              setCurrentPage(0);
            }}
            className="flex-1"
          >
            <Award className="w-4 h-4 mr-2" />
            Полученные ({receivedRatings.length})
          </Button>
          <Button
            variant={activeTab === 'given' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('given');
              setCurrentPage(0);
            }}
            className="flex-1"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Оставленные ({givenRatings.length})
          </Button>
        </div>
      </div>

      {/* Ratings List */}
      {getCurrentRatings().length === 0 ? (
        <div className="card-surface p-8 text-center">
          <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {activeTab === 'received' ? 'Пока нет отзывов' : 'Вы пока не оставляли отзывы'}
          </h3>
          <p className="text-muted-foreground">
            {activeTab === 'received' 
              ? 'Выполните первый заказ, чтобы получить отзыв от клиента'
              : 'Закажите услугу и оставьте отзыв специалисту'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {getCurrentPageRatings().map((rating, index) => {
              const profile = activeTab === 'received' 
                ? rating.from_user_profile 
                : rating.to_user_profile;
              const profileName = getProfileName(profile);

              return (
                <motion.div
                  key={rating.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card-surface p-6"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profileName} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{profileName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={rating.score} readonly size="sm" />
                            <Badge 
                              variant="secondary" 
                              className={`${getRatingBadgeColor(rating.score)} text-white`}
                            >
                              {rating.score}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(rating.created_at), { 
                              addSuffix: true, 
                              locale: ru 
                            })}
                          </div>
                        </div>
                      </div>

                      {rating.job && (
                        <div className="mb-3">
                          <Badge variant="outline" className="text-xs">
                            {rating.job.categories?.label_ru || 'Услуга'}
                          </Badge>
                          {rating.job.title && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {rating.job.title}
                            </p>
                          )}
                        </div>
                      )}

                      {rating.comment && (
                        <div className="p-3 bg-white/50 rounded-lg border border-white/60 mt-3">
                          <p className="text-sm text-foreground leading-relaxed">
                            "{rating.comment}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {getTotalPages() > 1 && (
            <div className="card-surface p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Назад
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: getTotalPages() }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                        i === currentPage
                          ? 'bg-primary text-white shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]'
                          : 'bg-white/50 text-muted-foreground hover:bg-white/70'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={nextPage}
                  disabled={currentPage === getTotalPages() - 1}
                  size="sm"
                >
                  Далее
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HallOfFame;