import React, { useState, useEffect } from 'react';
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
  { icon: User, label: 'Профиль', path: '/dashboard/client' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { bottomNavHeight, safeAreaInsets, isKeyboardOpen } = useMobile();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Загружаем количество непрочитанных сообщений
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        
        if (!uid) {
          setUnreadCount(0);
          return;
        }
        
        setUserId(uid);
        
        // Получаем количество непрочитанных сообщений
        const { data: unreadMessages } = await supabase
          .from('chat_messages')
          .select('id, chat_id')
          .eq('is_read', false)
          .neq('sender_id', uid);
        
        setUnreadCount(unreadMessages?.length || 0);
        
        // Подписываемся на новые сообщения
        const channel = supabase
          .channel('unread-messages-counter')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages'
            },
            (payload: any) => {
              // Увеличиваем счетчик если сообщение не от нас
              if (payload.new.sender_id !== uid) {
                setUnreadCount(prev => prev + 1);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_messages'
            },
            (payload: any) => {
              // Уменьшаем счетчик если сообщение прочитано
              if (payload.new.is_read && !payload.old.is_read && payload.new.sender_id !== uid) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .subscribe();
        
        return () => supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };
    
    loadUnreadCount();
  }, []);

  // Обнуляем счетчик когда заходим в сообщения
  useEffect(() => {
    if (location.pathname.startsWith('/messages') && userId) {
      const markMessagesAsRead = async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          
          // Помечаем все сообщения как прочитанные
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('is_read', false)
            .neq('sender_id', userId);
          
          setUnreadCount(0);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };
      
      markMessagesAsRead();
    }
  }, [location.pathname, userId]);

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
        "bg-[#E5E7EB]"
      )}
      style={{ 
        paddingBottom: `env(safe-area-inset-bottom)`
      }}
    >
      {/* Компактное neumorphic меню */}
      <div className="px-2 py-2 bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB] relative will-change-transform" style={{ transform: 'translateZ(0)' }}>
        <nav className="flex items-center justify-around h-14">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1",
                  "min-w-[60px] h-14 rounded-xl transition-all duration-300",
                  "touch-manipulation select-none text-gray-700",
                  "bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB]",
                  isActive && "shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-800"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#22D3EE" }}
                  />
                )}
                
                {/* Special styling for create button */}
                {item.label === 'Создать' ? (
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "flex flex-col items-center justify-center",
                      "w-7 h-7 mb-1 rounded-full",
                      "bg-gradient-to-br from-primary to-primary/80",
                      "text-primary-foreground shadow-lg shadow-primary/25"
                    )}
                  >
                    <Icon size={16} />
                  </motion.div>
                ) : (
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center justify-center relative z-10"
                  >
                    <Icon 
                      size={18} 
                      className="mb-1 transition-all duration-300" 
                    />
                  </motion.div>
                )}

                <span className={cn(
                  "text-xs font-medium transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-70"
                )}>
                  {item.label}
                </span>

                {/* Notification badge for unread messages */}
                {item.label === 'Сообщения' && unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <span className="text-destructive-foreground text-xs font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </motion.div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </motion.div>
  );
}