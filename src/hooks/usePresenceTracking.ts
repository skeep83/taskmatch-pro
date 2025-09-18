import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const usePresenceTracking = () => {
  const location = useLocation();
  const channelRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const trackPresence = async () => {
      try {
        // Получаем данные пользователя
        const { data: { user } } = await supabase.auth.getUser();
        
        let userType = 'unregistered';
        let profile = null;
        
        if (user) {

          // Получаем дополнительную информацию о пользователе
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name, avatar_url')
            .eq('id', user.id)
            .single();

          profile = profileData;

          // Получаем роли пользователя
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          userType = 'guest';
          if (roles && roles.length > 0) {
            if (roles.some(r => r.role === 'business')) userType = 'business';
            else if (roles.some(r => r.role === 'pro')) userType = 'pro';
            else if (roles.some(r => r.role === 'client')) userType = 'client';
          }
        }

        // Создаем или переиспользуем канал
        if (!channelRef.current) {
          channelRef.current = supabase.channel('platform_visitors', {
            config: {
              presence: {
                key: 'platform_visitors',
              },
            },
          });

          channelRef.current.subscribe();
        }

        const presenceData = {
          user_id: user.id,
          username: profile?.full_name || 
                   `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                   user.email?.split('@')[0] ||
                   'Пользователь',
          avatar_url: profile?.avatar_url,
          page: location.pathname,
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          user_agent: navigator.userAgent,
          location: getPageTitle(location.pathname),
          user_type: userType
        };

        // Отправляем данные о присутствии
        await channelRef.current.track(presenceData);

        // Очищаем предыдущий интервал если есть
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Обновляем last_seen каждые 30 секунд
        intervalRef.current = setInterval(async () => {
          if (channelRef.current) {
            await channelRef.current.track({
              ...presenceData,
              last_seen: new Date().toISOString()
            });
          }
        }, 30000);

      } catch (error) {
        console.error('Error tracking presence:', error);
      }
    };

    trackPresence();

    // Cleanup при изменении маршрута
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [location.pathname]);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  // Обработчик ухода со страницы
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.untrack();
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Пользователь переключился на другую вкладку
        if (channelRef.current) {
          await channelRef.current.untrack();
        }
      } else {
        // Пользователь вернулся на вкладку
        const { data: { user } } = await supabase.auth.getUser();
        
        let userType = 'unregistered';
        let profile = null;
        
        if (user && channelRef.current) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name, avatar_url')
            .eq('id', user.id)
            .single();

          profile = profileData;

          // Получаем роли пользователя
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          userType = 'guest';
          if (roles && roles.length > 0) {
            if (roles.some(r => r.role === 'business')) userType = 'business';
            else if (roles.some(r => r.role === 'pro')) userType = 'pro';
            else if (roles.some(r => r.role === 'client')) userType = 'client';
          }

          const presenceData = {
            user_id: user?.id || null,
            username: user ? (
              profile?.full_name || 
              `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
              user.email?.split('@')[0] ||
              'Пользователь'
            ) : `Guest_${Date.now()}`,
            avatar_url: profile?.avatar_url || null,
            page: location.pathname,
            joined_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            user_agent: navigator.userAgent,
            location: getPageTitle(location.pathname),
            user_type: userType,
            is_authenticated: !!user
          };

          if (channelRef.current) {
            await channelRef.current.track(presenceData);
          }
        } else if (!user && channelRef.current) {
          // Незарегистрированный пользователь вернулся на вкладку
          const presenceData = {
            user_id: null,
            username: `Guest_${Date.now()}`,
            avatar_url: null,
            page: location.pathname,
            joined_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            user_agent: navigator.userAgent,
            location: getPageTitle(location.pathname),
            user_type: 'unregistered',
            is_authenticated: false
          };

          await channelRef.current.track(presenceData);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname]);
};

// Функция для получения читаемого названия страницы
const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    '/': 'Главная',
    '/catalog': 'Каталог услуг',
    '/feed': 'Лента заказов',
    '/how-it-works': 'Как это работает',
    '/auth': 'Авторизация',
    '/dashboard/client': 'Личный кабинет клиента',
    '/dashboard/pro': 'Личный кабинет специалиста',
    '/dashboard/business': 'Бизнес кабинет',
    '/admin': 'Админ панель',
    '/admin/users': 'Управление пользователями',
    '/admin/jobs': 'Управление заказами',
    '/admin/finance': 'Финансы',
    '/admin/settings': 'Настройки',
    '/messages': 'Сообщения',
    '/profile/settings': 'Настройки профиля',
    '/kyc': 'Верификация',
    '/tenders': 'Тендеры'
  };

  // Проверяем точное соответствие
  if (titles[pathname]) {
    return titles[pathname];
  }

  // Проверяем паттерны
  if (pathname.startsWith('/admin/')) {
    return 'Админ панель';
  }
  if (pathname.startsWith('/job/')) {
    return 'Просмотр заказа';
  }
  if (pathname.startsWith('/tender/')) {
    return 'Просмотр тендера';
  }
  if (pathname.startsWith('/pro/')) {
    return 'Профиль специалиста';
  }

  return pathname;
};