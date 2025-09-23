import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, MessageCircle, User, Star, Briefcase } from 'lucide-react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { cn } from '@/lib/utils';

interface TabItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  badge?: number;
}

export const MobileTabNavigation: React.FC = () => {
  const location = useLocation();
  const { isMobile } = useDeviceDetection();

  if (!isMobile) return null;

  const tabs: TabItem[] = [
    { icon: Home, label: 'Главная', path: '/' },
    { icon: Search, label: 'Поиск', path: '/jobs/search' },
    { icon: PlusCircle, label: 'Создать', path: '/job/new' },
    { icon: MessageCircle, label: 'Чат', path: '/messages', badge: 3 },
    { icon: Star, label: 'Зал славы', path: '/hall-of-fame' },
    { icon: User, label: 'Профиль', path: '/profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 dark:bg-gray-900/95 dark:border-gray-800">
      <div className="safe-area-inset-bottom">
        <nav className="flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || 
              (tab.path !== '/' && location.pathname.startsWith(tab.path));
            
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 min-w-[60px] rounded-xl transition-all duration-200",
                  "touch-manipulation active:scale-95",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                <div className="relative">
                  <tab.icon 
                    size={24} 
                    className={cn(
                      "transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                  />
                  {tab.badge && tab.badge > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium mt-1 transition-colors duration-200",
                  isActive && "text-primary"
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};