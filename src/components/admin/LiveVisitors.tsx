import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Users, Eye, Clock, MapPin } from 'lucide-react';

interface PresenceState {
  [key: string]: {
    user_id: string;
    username: string;
    avatar_url?: string;
    page: string;
    joined_at: string;
    last_seen: string;
    user_agent?: string;
    location?: string;
  }[];
}

export const LiveVisitors = () => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    // Создаем канал для отслеживания присутствия
    const presenceChannel = supabase.channel('platform_visitors', {
      config: {
        presence: {
          key: 'platform_visitors',
        },
      },
    });

    // Отслеживаем изменения присутствия
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState() as PresenceState;
        setOnlineUsers(newState);
        
        // Подсчитываем общее количество уникальных пользователей
        const uniqueUsers = new Set();
        Object.values(newState).forEach(presences => {
          presences.forEach(presence => {
            uniqueUsers.add(presence.user_id);
          });
        });
        setTotalVisitors(uniqueUsers.size);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe();

    setChannel(presenceChannel);

    return () => {
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
    };
  }, []);

  // Отправляем информацию о присутствии администратора
  useEffect(() => {
    const trackAdminPresence = async () => {
      if (!channel) return;

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const presenceData = {
        user_id: user.id,
        username: user.email?.split('@')[0] || 'Admin',
        page: '/admin',
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        user_agent: navigator.userAgent,
        location: 'Admin Panel'
      };

      await channel.track(presenceData);

      // Обновляем last_seen каждые 30 секунд
      const interval = setInterval(async () => {
        await channel.track({
          ...presenceData,
          last_seen: new Date().toISOString()
        });
      }, 30000);

      return () => clearInterval(interval);
    };

    trackAdminPresence();
  }, [channel]);

  // Получаем список активных пользователей для отображения
  const getActiveUsers = () => {
    const users: any[] = [];
    Object.values(onlineUsers).forEach(presences => {
      presences.forEach(presence => {
        const lastSeen = new Date(presence.last_seen);
        const now = new Date();
        const minutesAgo = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
        
        // Считаем активными пользователей, которые были онлайн в последние 5 минут
        if (minutesAgo <= 5) {
          users.push({
            ...presence,
            minutesAgo
          });
        }
      });
    });
    
    return users.sort((a, b) => a.minutesAgo - b.minutesAgo);
  };

  const activeUsers = getActiveUsers();

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Eye className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Live посетители</CardTitle>
            <p className="text-sm text-muted-foreground">
              Активные пользователи платформы
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Общий счетчик */}
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-semibold">Сейчас онлайн</span>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <Users className="h-3 w-3 mr-1" />
            {totalVisitors}
          </Badge>
        </div>

        {/* Список активных пользователей */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {activeUsers.length > 0 ? (
            activeUsers.map((user, index) => (
              <motion.div
                key={`${user.user_id}-${user.page}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 card-surface rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.username}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{user.page || user.location}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {user.minutesAgo === 0 ? 'сейчас' : `${user.minutesAgo}м`}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет активных посетителей</p>
            </div>
          )}
        </div>

        {/* Статистика по страницам */}
        {Object.keys(onlineUsers).length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Активность по страницам</h4>
            <div className="space-y-2">
              {Object.entries(
                activeUsers.reduce((acc: Record<string, number>, user) => {
                  const page = user.page || user.location || 'Неизвестно';
                  acc[page] = (acc[page] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([page, count]) => (
                  <div key={page} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{page}</span>
                    <Badge variant="outline" className="text-xs">
                      {count as number}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};