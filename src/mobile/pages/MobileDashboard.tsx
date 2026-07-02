import { default as React, useState } from 'react';
import { Plus, Bell, Star, TrendingUp, Calendar, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMobile } from '../providers/MobileProvider';

const quickActions = [
  { icon: Plus, label: 'Новый заказ', href: '/job/new', color: 'from-blue-500 to-blue-600' },
  { icon: Calendar, label: 'Мой график', href: '/pro/schedule', color: 'from-green-500 to-green-600' },
  { icon: MessageCircle, label: 'Сообщения', href: '/messages', color: 'from-purple-500 to-purple-600' },
  { icon: Star, label: 'Отзывы', href: '/profile', color: 'from-yellow-500 to-yellow-600' },
];

const recentActivity = [
  {
    id: '1',
    type: 'job_completed',
    title: 'Заказ выполнен',
    description: 'Ремонт крана в ванной',
    time: '2 часа назад',
    amount: '+450 MDL'
  },
  {
    id: '2',
    type: 'new_message',
    title: 'Новое сообщение',
    description: 'От клиента Мария И.',
    time: '4 часа назад'
  },
  {
    id: '3',
    type: 'review_received',
    title: 'Новый отзыв',
    description: '5 звёзд за качественную работу',
    time: '1 день назад'
  }
];

export default function MobileDashboard() {
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const [userStats] = useState({
    rating: 4.9,
    completedJobs: 127,
    earnings: 15420,
    activeJobs: 3
  });

  return (
    <div className="min-h-screen bg-neo">
      <MobileHeader 
        title="Дашборд"
        showNotifications
        showSearch
      />

      <div 
        className="px-4 pt-4"
        style={{ 
          paddingTop: 80 + safeAreaInsets.top + 16,
          paddingBottom: bottomNavHeight + safeAreaInsets.bottom + 16 
        }}
      >
        {/* Welcome Section */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold mb-2">Добро пожаловать!</h1>
          <p className="text-muted-foreground">Вот ваша активность сегодня</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <MobileCard gradient className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="text-yellow-500 mr-2" size={20} />
              <span className="text-2xl font-bold">{userStats.rating}</span>
            </div>
            <p className="text-sm text-muted-foreground">Рейтинг</p>
          </MobileCard>

          <MobileCard gradient className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="text-green-500 mr-2" size={20} />
              <span className="text-2xl font-bold">{userStats.completedJobs}</span>
            </div>
            <p className="text-sm text-muted-foreground">Заказов</p>
          </MobileCard>

          <MobileCard gradient className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl font-bold">{userStats.earnings.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">MDL заработано</p>
          </MobileCard>

          <MobileCard gradient className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-primary">{userStats.activeJobs}</span>
            </div>
            <p className="text-sm text-muted-foreground">Активных</p>
          </MobileCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold mb-3">Быстрые действия</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                whileTap={{ scale: 0.98 }}
              >
                <Link to={action.href}>
                  <MobileCard 
                    className={`p-4 text-center bg-gradient-to-br ${action.color} text-white border-0`}
                  >
                    <action.icon className="mx-auto mb-2" size={24} />
                    <p className="text-sm font-medium">{action.label}</p>
                  </MobileCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold mb-3">Последняя активность</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <MobileCard className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        {activity.amount && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {activity.amount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </MobileCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <MobileCard gradient className="p-6">
            <h4 className="text-lg font-semibold mb-2">Готовы к новым заказам?</h4>
            <p className="text-muted-foreground mb-4 text-sm">
              Откликайтесь на заказы и увеличивайте свой доход
            </p>
            <Button asChild className="w-full h-12 rounded-2xl">
              <Link to="/feed">
                Смотреть заказы
              </Link>
            </Button>
          </MobileCard>
        </motion.div>
      </div>
    </div>
  );
}