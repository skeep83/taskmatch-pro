import React from 'react';
import { ArrowLeft, Bell, Search, MoreHorizontal, ChevronDown, User, Briefcase, Building2, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMobile } from '@/mobile/providers/MobileProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useNotifications } from '@/hooks/useNotifications';

interface DashboardOption {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  available: boolean;
}

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  showLogout?: boolean;
  className?: string;
  children?: React.ReactNode;
  transparent?: boolean;
  // Dashboard selector props
  showDashboardSelector?: boolean;
  dashboardOptions?: DashboardOption[];
  currentDashboard?: string;
  onDashboardChange?: (dashboard: string) => void;
}

export function MobileHeader({
  title,
  showBack = false,
  showSearch = false,
  showNotifications = false,
  showMenu = false,
  showLogout = false,
  className,
  children,
  transparent = false,
  showDashboardSelector = false,
  dashboardOptions = [],
  currentDashboard = '',
  onDashboardChange
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { safeAreaInsets } = useMobile();
  const { unreadCount } = useNotifications();
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState(0);
  const [userId, setUserId] = React.useState<string | null>(null);

  // Загружаем количество непрочитанных сообщений
  React.useEffect(() => {
    const loadUnreadMessagesCount = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        
        if (!uid) {
          setUnreadMessagesCount(0);
          return;
        }
        
        setUserId(uid);
        
        // Получаем количество непрочитанных сообщений
        const { data: unreadMessages } = await supabase
          .from('chat_messages')
          .select('id, chat_id')
          .eq('is_read', false)
          .neq('sender_id', uid);
        
        setUnreadMessagesCount(unreadMessages?.length || 0);
        
        // Подписываемся на новые сообщения
        const channel = supabase
          .channel('header-unread-messages-counter')
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
                setUnreadMessagesCount(prev => prev + 1);
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
                setUnreadMessagesCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .subscribe();
        
        return () => supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error loading unread messages count:', error);
      }
    };
    
    loadUnreadMessagesCount();
  }, []);

  // Обнуляем счетчик сообщений когда заходим в чаты
  React.useEffect(() => {
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
          
          setUnreadMessagesCount(0);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };
      
      markMessagesAsRead();
    }
  }, [location.pathname, userId]);

  // Функция логаута
  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleDashboardSwitch = (dashboardValue: string) => {
    setSelectorOpen(false);
    onDashboardChange?.(dashboardValue);
  };

  const getCurrentDashboardOption = () => {
    return dashboardOptions.find(option => option.value === currentDashboard);
  };

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-40",
        "bg-[#E5E7EB]"
      )}
      style={{ paddingTop: `env(safe-area-inset-top)` }}
    >
      {/* Компактный neumorphic контейнер */}
      <div className="px-4 py-2 bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]">
        <header className={cn(
          "flex items-center justify-between h-12",
          className
        )}>
          {/* Left section */}
          <div className="flex items-center min-w-0 flex-1">
            {showLogout && (
              <motion.button
                onClick={handleLogout}
                className="mr-2 w-10 h-10 flex items-center justify-center bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl transition-all duration-300"
                whileTap={{ scale: 0.95 }}
              >
                <LogOut size={16} className="text-red-500" />
              </motion.button>
            )}
            
            {showBack && (
              <motion.button
                onClick={handleBack}
                className="mr-2 w-10 h-10 flex items-center justify-center bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl transition-all duration-300"
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft size={16} />
              </motion.button>
            )}
            
            {title && (
              <h1 className="text-base font-semibold truncate">
                {title}
              </h1>
            )}
          </div>

          {/* Center section */}
          {children && (
            <div className="flex-1 flex justify-center">
              {children}
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center space-x-2 min-w-0 flex-1 justify-end">
            {showDashboardSelector && (
              <div className="relative">
                <motion.button
                  onClick={() => setSelectorOpen(!selectorOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                >
                  {getCurrentDashboardOption()?.icon && 
                    React.createElement(getCurrentDashboardOption()!.icon, { className: "h-4 w-4 text-primary" })
                  }
                  <ChevronDown className={`h-4 w-4 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
                </motion.button>
                
                {/* Dropdown Menu */}
                {selectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl z-50 overflow-hidden"
                  >
                    {dashboardOptions.map((option) => (
                      <motion.button
                        key={option.value}
                        onClick={() => handleDashboardSwitch(option.value)}
                        className={`w-full p-4 flex items-center gap-3 text-left transition-all hover:bg-white/20 ${
                          option.value === currentDashboard ? 'bg-white/10' : ''
                        }`}
                        disabled={!option.available}
                        whileTap={{ scale: 0.98 }}
                      >
                        <option.icon className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-semibold">{option.label}</h4>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        {!option.available && (
                          <Badge variant="secondary">Скоро</Badge>
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {showSearch && (
              <motion.button
                onClick={() => navigate('/catalog')}
                className="w-10 h-10 flex items-center justify-center bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl transition-all duration-300"
                whileTap={{ scale: 0.95 }}
              >
                <Search size={16} />
              </motion.button>
            )}
            
            {showNotifications && (
              <div className="relative">
                <motion.button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="w-10 h-10 flex items-center justify-center bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl transition-all duration-300 relative"
                  whileTap={{ scale: 0.95 }}
                >
                  <Bell size={16} className={unreadCount > 0 ? "text-red-500" : ""} />
                  {/* Общий счетчик уведомлений */}
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                      <span className="text-destructive-foreground text-xs font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </div>
                  )}
                  {/* Дополнительный индикатор для сообщений */}
                  {unreadMessagesCount > 0 && unreadCount === 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    </div>
                  )}
                  {/* Показываем синий индикатор сообщений рядом с основным счетчиком */}
                  {unreadMessagesCount > 0 && unreadCount > 0 && (
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </motion.button>
                
                {/* Notification Panel */}
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-background border rounded-lg shadow-lg z-50 overflow-hidden"
                  >
                    <div className="max-h-96 overflow-y-auto">
                      <NotificationCenter />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            
            {showMenu && (
              <motion.button
                onClick={() => {
                  // Можно добавить меню или навигацию
                  console.log('Menu clicked');
                }}
                className="w-10 h-10 flex items-center justify-center bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl transition-all duration-300"
                whileTap={{ scale: 0.95 }}
              >
                <MoreHorizontal size={16} />
              </motion.button>
            )}
          </div>
        </header>
        
        {/* Overlay to close dropdowns */}
        {(selectorOpen || notificationOpen) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setSelectorOpen(false);
              setNotificationOpen(false);
            }}
          />
        )}
      </div>
    </motion.div>
  );
}