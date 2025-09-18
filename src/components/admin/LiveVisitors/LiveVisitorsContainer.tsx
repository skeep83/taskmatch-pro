import { Eye, User, Briefcase, Building, UserX } from 'lucide-react';
import { useLiveVisitors } from '@/hooks/useLiveVisitors';
import { CentralStatsCircle } from './CentralStatsCircle';
import { UserTypeCard } from './UserTypeCard';
import type { UserTypeInfo } from '@/types/liveVisitors';

export const LiveVisitorsContainer = () => {
  const { userStats } = useLiveVisitors();

  const userTypeInfo: UserTypeInfo[] = [
    {
      type: 'client',
      count: userStats.client,
      label: 'Клиенты',
      icon: User,
      color: 'from-blue-500 to-blue-600',
    },
    {
      type: 'pro',
      count: userStats.pro,
      label: 'Специалисты',
      icon: Briefcase,
      color: 'from-green-500 to-green-600',
    },
    {
      type: 'business',
      count: userStats.business,
      label: 'Бизнес',
      icon: Building,
      color: 'from-purple-500 to-purple-600',
    },
    {
      type: 'unregistered',
      count: userStats.unregistered,
      label: 'Не зарегистрированы',
      icon: UserX,
      color: 'from-orange-500 to-orange-600',
    }
  ];

  return (
    <div className="card-surface p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Eye className="h-5 w-5 text-cyan-600" />
        </div>
        <div>
          <h3 className="font-semibold">Live Посетители</h3>
          <p className="text-sm text-muted-foreground">
            Активные пользователи по типам
          </p>
        </div>
      </div>
      
      <div className="relative flex items-center gap-8 h-[420px]">
        {/* Анимированные линии соединения */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          style={{ zIndex: 1 }}
        >
          <defs>
            <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {userTypeInfo.map((_, index) => {
            const startX = 170; // Позиция центрального шара
            const startY = 210; // Центр по вертикали
            const endX = 280; // Начало карточек
            const endY = 80 + (index * 85); // Позиция каждой карточки
            
            return (
              <g key={index}>
                {/* Основная линия */}
                <path
                  d={`M ${startX} ${startY} Q ${startX + 40} ${startY} ${endX} ${endY}`}
                  stroke="url(#lineGradient1)"
                  strokeWidth="2"
                  fill="none"
                  className="animate-fade-in"
                  style={{ 
                    animationDelay: `${index * 0.2}s`,
                    strokeDasharray: '5,5',
                    animation: `fadeInLine 1s ease-out ${index * 0.2}s forwards, dashFlow 3s linear infinite`
                  }}
                />
                
                {/* Светящаяся точка на конце */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="3"
                  fill="hsl(var(--primary))"
                  className="animate-pulse"
                  style={{ 
                    animationDelay: `${index * 0.2 + 0.5}s`,
                    filter: 'drop-shadow(0 0 6px hsl(var(--primary)))'
                  }}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Большой шар слева */}
        <div className="flex-shrink-0 relative" style={{ zIndex: 2 }}>
          <CentralStatsCircle userStats={userStats} />
        </div>
        
        {/* Категории справа в стиле навигации */}
        <div className="w-96 space-y-3 relative" style={{ zIndex: 2 }}>
          {userTypeInfo.map((userType, index) => (
            <UserTypeCard 
              key={userType.type}
              userType={userType}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};