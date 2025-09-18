import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      type: 'guest',
      count: userStats.guest,
      label: 'Гости',
      icon: UserX,
      color: 'from-gray-500 to-gray-600',
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
          <CentralStatsCircle userStats={userStats} />
          
          {/* Информационные блоки вокруг диаграммы */}
          {userTypeInfo.slice(0, 3).map((userType, index) => (
            <UserTypeCard 
              key={userType.type}
              userType={userType}
              index={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};