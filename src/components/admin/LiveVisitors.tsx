import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Users, Eye, Clock, MapPin, User, Briefcase, Building, UserX } from 'lucide-react';

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
    user_type?: string;
  }[];
}

interface UserTypeStats {
  client: number;
  pro: number;
  business: number;
  guest: number;
  total: number;
}

export const LiveVisitors = () => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});
  const [userStats, setUserStats] = useState<UserTypeStats>({
    client: 0,
    pro: 0,
    business: 0,
    guest: 0,
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
              uniqueUsers.add(presence.user_id);
              
              // Определяем тип пользователя (здесь нужно будет получать реальные роли из базы)
              const userType = presence.user_type || 'guest';
              if (userType === 'client') stats.client++;
              else if (userType === 'pro') stats.pro++;
              else if (userType === 'business') stats.business++;
              else stats.guest++;
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

  const userTypeInfo = [
    {
      type: 'client',
      count: userStats.client,
      label: 'Клиенты',
      icon: User,
      color: 'from-blue-500 to-blue-600',
      position: { top: '20%', right: '20%' }
    },
    {
      type: 'pro',
      count: userStats.pro,
      label: 'Специалисты',
      icon: Briefcase,
      color: 'from-green-500 to-green-600',
      position: { bottom: '20%', right: '20%' }
    },
    {
      type: 'business',
      count: userStats.business,
      label: 'Бизнес',
      icon: Building,
      color: 'from-purple-500 to-purple-600',
      position: { bottom: '20%', left: '20%' }
    },
    {
      type: 'guest',
      count: userStats.guest,
      label: 'Гости',
      icon: UserX,
      color: 'from-gray-500 to-gray-600',
      position: { top: '20%', left: '20%' }
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Eye className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Live Посетители</CardTitle>
            <p className="text-sm text-muted-foreground">
              Активные пользователи по типам
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="relative w-full h-[350px] flex items-center justify-center">
          {/* Большой центральный круг - увеличенный */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="relative"
          >
            <svg width="280" height="280" viewBox="-140 -140 280 280" className="drop-shadow-2xl">
              {/* Внешний градиентный круг */}
              <defs>
                <linearGradient id="outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.4" />
                </linearGradient>
                <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f0f9ff" />
                  <stop offset="100%" stopColor="#e0f2fe" />
                </radialGradient>
              </defs>
              
              {/* Основной круг с neumorphic эффектом */}
              <circle
                cx="0"
                cy="0"
                r="120"
                fill="url(#outerGradient)"
                stroke="hsl(var(--border))"
                strokeWidth="2"
                style={{
                  filter: 'drop-shadow(15px 15px 30px rgba(0,0,0,0.15)) drop-shadow(-15px -15px 30px rgba(255,255,255,0.7))'
                }}
              />
              
              {/* Внутренний круг */}
              <circle
                cx="0"
                cy="0"
                r="80"
                fill="url(#centerGradient)"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.1))'
                }}
              />
              
              {/* Пульсирующее кольцо */}
              <circle
                cx="0"
                cy="0"
                r="100"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2"
                opacity="0.4"
                className="animate-ping"
              />
              
              {/* Центральный текст */}
              <text
                x="0"
                y="-15"
                textAnchor="middle"
                className="fill-muted-foreground text-sm font-medium"
              >
                АКТИВНЫХ
              </text>
              <text
                x="0"
                y="5"
                textAnchor="middle"
                className="fill-muted-foreground text-sm font-medium"
              >
                ПОЛЬЗОВАТЕЛЕЙ
              </text>
              <text
                x="0"
                y="35"
                textAnchor="middle"
                className="fill-foreground text-4xl font-bold"
              >
                {userStats.total}
              </text>
            </svg>
          </motion.div>

          {/* Информационные блоки вокруг диаграммы */}
          {userTypeInfo.slice(0, 3).map((userType, index) => {
            const Icon = userType.icon;
            const positions = [
              { top: '10%', right: '10%' }, // Top-right
              { bottom: '15%', right: '5%' }, // Bottom-right  
              { bottom: '15%', left: '5%' }, // Bottom-left
            ];

            return (
              <motion.div
                key={userType.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="absolute flex flex-col items-center gap-2 p-3 rounded-xl card-surface min-w-[120px]"
                style={positions[index]}
              >
                <div 
                  className="p-2 rounded-lg shadow-sm"
                  style={{ backgroundColor: `${userType.color.split(' ')[1].replace('from-', '').replace('to-', '')}20` }}
                >
                  <Icon 
                    className="h-4 w-4" 
                    style={{ color: userType.color.split(' ')[1].replace('from-', '').replace('to-', '') }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-foreground">
                    {userType.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userType.count} активных
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};