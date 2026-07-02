import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { notificationSounds } from '@/utils/notificationSounds';
import { useSoundSettings } from '@/hooks/useSoundSettings';

interface Notification {
  id: string;
  type: 'job_match' | 'job_update' | 'payment' | 'message' | 'rating' | 'system' | 'price_proposal' | 'job_application';
  title: string;
  title_ro?: string;
  message: string;
  message_ro?: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { shouldPlaySound, settings } = useSoundSettings();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
      const newUnreadCount = data?.filter(n => !n.is_read).length || 0;
      console.log('📧 Fetched notifications:', {
        total: data?.length || 0,
        unread: newUnreadCount,
        notifications: data?.map(n => ({ id: n.id, type: n.type, title: n.title, is_read: n.is_read }))
      });
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Ошибка загрузки уведомлений',
        description: 'Не удалось загрузить уведомления',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Send notification
  const sendNotification = async (
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data: any = {},
    titleRo?: string,
    messageRo?: string
  ) => {
    try {
      const { error } = await supabase.functions.invoke('notifications-send', {
        body: {
          user_id: userId,
          type,
          title,
          title_ro: titleRo,
          message,
          message_ro: messageRo,
          data,
          channels: ['push'] // Can be extended to ['push', 'email', 'sms']
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    let channel: any = null;
    
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetchNotifications();

      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 New notification received via realtime:', payload);
            const newNotification = payload.new as Notification;
            
            // Add to notifications list
            setNotifications(prev => {
              const updated = [newNotification, ...prev];
              console.log('🔔 Updated notifications list:', updated.length);
              return updated;
            });
            
            // Update unread count
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('🔔 Updated unread count:', newCount);
              return newCount;
            });

            // Play notification sound based on settings
            if (shouldPlaySound(newNotification.type)) {
              console.log('🔔 Playing notification sound for type:', newNotification.type);
              notificationSounds.playNotification(newNotification.type);
            } else {
              console.log('🔔 Sound disabled for type:', newNotification.type, 'Settings:', settings);
            }

            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 5000,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification updated:', payload);
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => {
              const next = prev.map(n =>
                n.id === updatedNotification.id ? updatedNotification : n
              );
              // Recompute instead of decrementing: avoids drift when
              // markAsRead already updated the count optimistically
              setUnreadCount(next.filter(n => !n.is_read).length);
              return next;
            });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    sendNotification,
  };
};