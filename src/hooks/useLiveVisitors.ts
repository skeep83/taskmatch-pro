import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PresenceState, UserTypeStats } from '@/types/liveVisitors';

export const useLiveVisitors = () => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});
  const [userStats, setUserStats] = useState<UserTypeStats>({
    client: 0,
    pro: 0,
    business: 0,
    guest: 0,
    unregistered: 0,
    total: 0
  });
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
        
        // Подсчитываем статистику по типам пользователей
        const stats = {
          client: 0,
          pro: 0,
          business: 0,
          guest: 0,
          unregistered: 0,
          total: 0
        };

        const uniqueUsers = new Set();
        Object.values(newState).forEach(presences => {
          presences.forEach(presence => {
            const lastSeen = new Date(presence.last_seen);
            const now = new Date();
            const minutesAgo = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
            
            // Считаем активными пользователей, которые были онлайн в последние 5 минут
            if (minutesAgo <= 5) {
              uniqueUsers.add(presence.user_id || presence.username || 'anonymous');
              
              const userType = presence.user_type;
              // Если пользователь не имеет user_id (анонимный) или user_type не определен
              if (!presence.user_id || !userType) {
                stats.unregistered++;
              } else if (userType === 'client') {
                stats.client++;
              } else if (userType === 'pro') {
                stats.pro++;
              } else if (userType === 'business') {
                stats.business++;
              } else {
                stats.guest++;
              }
            }
          });
        });

        stats.total = uniqueUsers.size;
        setUserStats(stats);
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

      // Получаем роли пользователя
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      let userType = 'guest';
      if (roles && roles.length > 0) {
        if (roles.some(r => r.role === 'business')) userType = 'business';
        else if (roles.some(r => r.role === 'pro')) userType = 'pro';
        else if (roles.some(r => r.role === 'client')) userType = 'client';
      }

      const presenceData = {
        user_id: user.id,
        username: user.email?.split('@')[0] || 'Admin',
        page: '/admin',
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        user_agent: navigator.userAgent,
        location: 'Admin Panel',
        user_type: userType
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

  return {
    onlineUsers,
    userStats,
    channel
  };
};