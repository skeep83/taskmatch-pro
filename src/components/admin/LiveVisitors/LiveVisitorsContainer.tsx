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
      
      <div className="flex items-center gap-8 h-[350px]">
        {/* Большой шар слева */}
        <div className="flex-shrink-0">
          <CentralStatsCircle userStats={userStats} />
        </div>
        
        {/* Категории справа в стиле навигации */}
        <div className="flex-1 space-y-3">
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