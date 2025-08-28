import { supabase } from '@/integrations/supabase/client';

export interface ChatNotificationData {
  chat_id: string;
  message_id: string;
  sender_name: string;
  sender_id: string;
  message_preview: string;
}

export const createChatNotification = async (
  recipientUserId: string,
  senderName: string,
  messagePreview: string,
  chatId: string,
  messageId: string,
  senderId: string
) => {
  try {
    // Don't send notification to the sender
    if (recipientUserId === senderId) {
      return;
    }

    const notificationData: ChatNotificationData = {
      chat_id: chatId,
      message_id: messageId,
      sender_name: senderName,
      sender_id: senderId,
      message_preview: messagePreview.substring(0, 100), // Limit preview length
    };

    const { error } = await supabase.functions.invoke('notifications-send', {
      body: {
        user_id: recipientUserId,
        type: 'message',
        title: `Новое сообщение от ${senderName}`,
        title_ro: `Mesaj nou de la ${senderName}`,
        message: messagePreview.length > 50 
          ? `${messagePreview.substring(0, 50)}...` 
          : messagePreview,
        message_ro: messagePreview.length > 50 
          ? `${messagePreview.substring(0, 50)}...` 
          : messagePreview,
        data: notificationData,
        channels: ['push']
      }
    });

    if (error) {
      console.error('Error sending chat notification:', error);
      throw error;
    }

    console.log('Chat notification sent successfully');
  } catch (error) {
    console.error('Error creating chat notification:', error);
  }
};

export const markChatNotificationsAsRead = async (chatId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('type', 'message')
      .eq('data->>chat_id', chatId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking chat notifications as read:', error);
    }
  } catch (error) {
    console.error('Error marking chat notifications as read:', error);
  }
};