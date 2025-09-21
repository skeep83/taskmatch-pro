import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, User, Briefcase, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/mobile/providers/MobileProvider';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  color?: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Главная', path: '/' },
  { icon: Search, label: 'Поиск', path: '/catalog' },
  { icon: Plus, label: 'Создать', path: '/job/new', color: 'text-primary' },
  { icon: MessageCircle, label: 'Сообщения', path: '/messages' },
  { icon: User, label: 'Профиль', path: '/profile' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { bottomNavHeight, safeAreaInsets, isKeyboardOpen } = useMobile();

  if (isKeyboardOpen) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-xl border-t border-border/40",
        "supports-[backdrop-filter]:bg-background/60"
      )}
      style={{ 
        height: bottomNavHeight + safeAreaInsets.bottom,
        paddingBottom: safeAreaInsets.bottom 
      }}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <nav className="flex items-center justify-around h-20 px-2">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center relative",
                "min-w-[64px] h-16 rounded-2xl transition-all duration-300",
                "touch-manipulation select-none",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Special styling for create button */}
              {item.label === 'Создать' ? (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "w-12 h-12 mb-1 rounded-full",
                    "bg-gradient-to-br from-primary to-primary/80",
                    "text-primary-foreground shadow-lg shadow-primary/25"
                  )}
                >
                  <Icon size={24} />
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center justify-center relative z-10"
                >
                  <Icon 
                    size={24} 
                    className={cn(
                      "mb-1 transition-all duration-300",
                      isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                    )} 
                  />
                  <span className={cn(
                    "text-xs font-medium transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-70"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              )}

              {/* Notification badge placeholder */}
              {item.label === 'Сообщения' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-destructive-foreground text-xs font-bold">3</span>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>
    </motion.div>
  );
}