import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Activity, Clock, MapPin } from 'lucide-react';

interface VisitorStatsData {
  currentVisitors: number;
  peakToday: number;
  avgSessionTime: number;
  topPages: { page: string; visitors: number }[];
}

export const VisitorStats = () => {
  const [stats, setStats] = useState<VisitorStatsData>({
    currentVisitors: 0,
    peakToday: 0,
    avgSessionTime: 0,
    topPages: []
  });

  useEffect(() => {
    // Создаем канал для отслеживания присутствия
    const channel = supabase.channel('platform_visitors_stats', {
      config: {
        presence: {
          key: 'platform_visitors',
        },
      },
    });

    // Отслеживаем изменения присутствия
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        
        // Подсчитываем текущих посетителей
        const uniqueUsers = new Set();
        const pageViews: Record<string, number> = {};
        
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            const lastSeen = new Date(presence.last_seen);
            const now = new Date();
            const minutesAgo = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
            
            // Считаем активными пользователей, которые были онлайн в последние 5 минут
            if (minutesAgo <= 5) {
              uniqueUsers.add(presence.user_id);
              const page = presence.location || presence.page || 'Неизвестно';
              pageViews[page] = (pageViews[page] || 0) + 1;
            }
          });
        });

        // Сортируем страницы по количеству посетителей
        const topPages = Object.entries(pageViews)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([page, visitors]) => ({ page, visitors: visitors as number }));

        setStats(prev => ({
          ...prev,
          currentVisitors: uniqueUsers.size,
          topPages
        }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Текущие посетители */}
      <div className="flex items-center gap-3 p-4 card-surface rounded-xl">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <div className="relative">
            <Users className="h-5 w-5 text-green-600" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Онлайн</p>
          <p className="text-2xl font-bold text-green-600">{stats.currentVisitors}</p>
        </div>
      </div>

      {/* Пик дня */}
      <div className="flex items-center gap-3 p-4 card-surface rounded-xl">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Activity className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Пик дня</p>
          <p className="text-2xl font-bold text-blue-600">{stats.peakToday}</p>
        </div>
      </div>

      {/* Среднее время сессии */}
      <div className="flex items-center gap-3 p-4 card-surface rounded-xl">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Clock className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Ср. сессия</p>
          <p className="text-2xl font-bold text-orange-600">
            {Math.floor(stats.avgSessionTime / 60)}м
          </p>
        </div>
      </div>

      {/* Топ страница */}
      <div className="flex items-center gap-3 p-4 card-surface rounded-xl">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <MapPin className="h-5 w-5 text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Топ страница</p>
          <p className="text-sm font-semibold text-purple-600 truncate">
            {stats.topPages[0]?.page || 'Нет данных'}
          </p>
          {stats.topPages[0] && (
            <p className="text-xs text-muted-foreground">
              {stats.topPages[0].visitors} посетителей
            </p>
          )}
        </div>
      </div>
    </div>
  );
};