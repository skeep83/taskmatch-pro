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
      
      <CardContent className="flex-1 flex items-center justify-center">
        {/* Neumorphic Infographic Container */}
        <div className="relative w-80 h-80 flex items-center justify-center">
          {/* Центральный большой круг */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="relative w-48 h-48 rounded-full flex flex-col items-center justify-center text-center"
            style={{
              background: 'linear-gradient(145deg, #f0f0f0, #cacaca)',
              boxShadow: `
                20px 20px 40px #bebebe,
                -20px -20px 40px #ffffff,
                inset 0px 0px 0px #bebebe,
                inset 0px 0px 0px #ffffff
              `,
            }}
          >
            {/* Внутренний круг с градиентом */}
            <div
              className="absolute inset-4 rounded-full flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: 'inset 5px 5px 10px rgba(0,0,0,0.1), inset -5px -5px 10px rgba(255,255,255,0.1)'
              }}
            >
              <motion.div
                key={userStats.total}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-white text-center"
              >
                <div className="text-3xl font-bold mb-1">{userStats.total}</div>
                <div className="text-sm uppercase tracking-wider font-medium opacity-90">
                  АКТИВНЫХ<br />ПОЛЬЗОВАТЕЛЕЙ
                </div>
              </motion.div>
            </div>

            {/* Индикатор пульсации */}
            <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping"></div>
          </motion.div>

          {/* Маленькие кружки по типам пользователей */}
          {userTypeInfo.map((userType, index) => {
            const Icon = userType.icon;
            return (
              <motion.div
                key={userType.type}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.2 * (index + 1),
                  type: "spring",
                  stiffness: 150
                }}
                className="absolute w-20 h-20 rounded-full flex flex-col items-center justify-center group cursor-pointer"
                style={{
                  ...userType.position,
                  background: 'linear-gradient(145deg, #f0f0f0, #cacaca)',
                  boxShadow: `
                    8px 8px 16px #bebebe,
                    -8px -8px 16px #ffffff
                  `,
                  transition: 'all 0.3s ease'
                }}
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: `
                    12px 12px 24px #bebebe,
                    -12px -12px 24px #ffffff
                  `
                }}
              >
                {/* Внутренний круг с иконкой */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
                  style={{
                    background: `linear-gradient(135deg, ${userType.color.split(' ')[1]}, ${userType.color.split(' ')[3]})`,
                    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.1)'
                  }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>

                {/* Количество */}
                <div className="text-xs font-bold text-center">
                  {userType.count}
                </div>

                {/* Tooltip на hover */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                  {userType.label}
                </div>
              </motion.div>
            );
          })}

          {/* Соединительные линии (опционально) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
            {userTypeInfo.map((_, index) => {
              const angle = (index * 90) - 45; // Равномерное распределение по кругу
              const radius = 100;
              const x1 = 160; // Центр
              const y1 = 160;
              const x2 = x1 + Math.cos(angle * Math.PI / 180) * radius;
              const y2 = y1 + Math.sin(angle * Math.PI / 180) * radius;
              
              return (
                <motion.line
                  key={index}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="url(#gradient)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#764ba2" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};