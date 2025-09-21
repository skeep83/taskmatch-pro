import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, ArrowLeft, Circle, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobile } from '../providers/MobileProvider';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSoundSettings } from '@/hooks/useSoundSettings';
import { notificationSounds } from '@/utils/notificationSounds';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface Chat {
  id: string;
  job_id: string;
  client_id: string;
  professional_id: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

function MobileMessages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const { toast } = useToast();
  const { shouldPlaySound, settings } = useSoundSettings();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState('');
  const [presence, setPresence] = useState<Record<string, any>>({});
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const roomRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (id) {
      loadMessages();
      setupPresence();
    }
    return () => {
      if (roomRef.current) {
        roomRef.current.unsubscribe();
      }
      // Очищаем typing timeout при размонтировании
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [id, userId]);

  const loadChats = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      
      if (!uid) {
        toast({ title: 'Требуется авторизация', variant: 'destructive' });
        navigate('/auth');
        return;
      }
      
      setUserId(uid);
      
      const { data: chatsData } = await supabase
        .from('chats')
        .select('id, job_id, client_id, professional_id, last_message_at, created_at')
        .or(`client_id.eq.${uid},professional_id.eq.${uid}`)
        .order('last_message_at', { ascending: false })
        .limit(50);
      
      setChats(chatsData || []);
      
      // Load profiles
      if (chatsData && chatsData.length > 0) {
        const userIds = new Set<string>([uid]);
        chatsData.forEach((chat: Chat) => {
          if (chat.client_id !== uid) userIds.add(chat.client_id);
          if (chat.professional_id !== uid) userIds.add(chat.professional_id);
        });
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, avatar_url')
          .in('id', Array.from(userIds));
        
        const profilesMap: Record<string, Profile> = {};
        (profilesData || []).forEach((profile: Profile) => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({ title: 'Ошибка загрузки чатов', variant: 'destructive' });
    }
  };

  const loadMessages = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('chat_messages')
        .select('id, sender_id, content, created_at, is_read')
        .eq('chat_id', id)
        .order('created_at', { ascending: true })
        .limit(500);
      
      setMessages(data || []);
      
      // Помечаем сообщения как прочитанные если они не наши
      if (userId && data) {
        const unreadMessages = data.filter(msg => !msg.is_read && msg.sender_id !== userId);
        if (unreadMessages.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadMessages.map(msg => msg.id));
        }
      }
      
      // Setup realtime subscription
      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `chat_id=eq.${id}` 
        }, (payload: any) => {
          setMessages(prev => [...prev, payload.new]);
          // Воспроизводим звук получения сообщения если это не наше сообщение
          if (payload.new.sender_id !== userId && shouldPlaySound('message')) {
            notificationSounds.playNotification('message');
          }
        })
        .subscribe();
      
      return () => supabase.removeChannel(channel);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupPresence = async () => {
    if (!id || !userId) return;
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const room = supabase.channel(`presence:chat:${id}`, { 
        config: { presence: { key: userId } } 
      });
      roomRef.current = room;

      const updateState = () => {
        const state = room.presenceState() as Record<string, any[]>;
        setPresence(state);
        const chat = chats.find(c => c.id === id);
        const otherId = chat ? (chat.client_id === userId ? chat.professional_id : chat.client_id) : null;
        const flat = Object.values(state).flat() as any[];
        setOtherOnline(Boolean(flat.find((p: any) => p.user_id === otherId)));
        const otherPresence = flat.find((p: any) => p.user_id === otherId);
        setOtherTyping(Boolean(otherPresence?.typing));
      };

      room
        .on('presence', { event: 'sync' }, updateState)
        .on('presence', { event: 'join' }, updateState)
        .on('presence', { event: 'leave' }, updateState)
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await room.track({ 
              user_id: userId, 
              chat_id: id, 
              online_at: new Date().toISOString(), 
              typing: false 
            });
          }
        });
    } catch (error) {
      console.error('Error setting up presence:', error);
    }
  };

  // Функция для отправки typing статуса
  const updateTypingStatus = async (typing: boolean) => {
    if (roomRef.current && userId) {
      try {
        await roomRef.current.track({ 
          user_id: userId, 
          chat_id: id, 
          online_at: new Date().toISOString(), 
          typing 
        });
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    }
  };

  // Обработка изменения текста с typing indicator
  const handleTextChange = async (newText: string) => {
    setText(newText);
    
    // Отправляем typing status только если текст не пустой и мы не печатаем уже
    if (newText.trim() && !isTyping) {
      setIsTyping(true);
      await updateTypingStatus(true);
    }
    
    // Очищаем предыдущий таймер
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер для отключения typing
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      await updateTypingStatus(false);
    }, 2000); // Останавливаем typing через 2 секунды
  };

  const sendMessage = async () => {
    if (!text.trim() || !userId || !id) return;
    
    // Останавливаем typing статус перед отправкой
    if (isTyping) {
      setIsTyping(false);
      await updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: newMessage, error } = await supabase
        .from('chat_messages')
        .insert({ 
          chat_id: id, 
          sender_id: userId, 
          message_type: 'text', 
          content: text 
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update chat timestamp
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', id);
      
      setText('');
      setMessages(prev => [...prev, newMessage]);
      
      // Воспроизводим звук отправки сообщения
      if (shouldPlaySound('message')) {
        notificationSounds.playNotification('message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Ошибка отправки сообщения', variant: 'destructive' });
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);
      await supabase.from('chats').delete().eq('id', chatId);
      
      setChats(prev => prev.filter(c => c.id !== chatId));
      
      if (String(id) === String(chatId)) {
        navigate('/messages');
      }
      
      toast({ title: 'Чат удален' });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({ title: 'Ошибка удаления чата', variant: 'destructive' });
    }
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить чат? Все сообщения будут удалены навсегда.')) {
      deleteChat(chatId);
    }
  };

  const selectedChat = chats.find(c => c.id === id);

  if (!id) {
    // Chat list view
    return (
      <div className="min-h-screen bg-[#E5E7EB]">
        <MobileHeader 
          title="Сообщения"
          showBack={false}
          showNotifications
        />
        
        <div 
          className="px-4 pt-4"
          style={{ 
            paddingTop: 72 + safeAreaInsets.top + 16,
            paddingBottom: bottomNavHeight + safeAreaInsets.bottom + 16 
          }}
        >
          {chats.length === 0 ? (
            <MobileCard className="p-8 text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Нет сообщений</h3>
              <p className="text-gray-600">Ваши чаты появятся здесь</p>
            </MobileCard>
          ) : (
            <div className="space-y-3">
              {chats.map((chat, index) => {
                const otherUserId = chat.client_id === userId ? chat.professional_id : chat.client_id;
                const otherProfile = profiles[otherUserId];
                const displayName = otherProfile?.full_name || 
                                  (otherProfile?.first_name && otherProfile?.last_name ? 
                                     `${otherProfile.first_name} ${otherProfile.last_name}` : 
                                     'Пользователь');
                
                const initials = displayName
                  .split(' ')
                  .filter(n => n.length > 0)
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <motion.div
                    key={chat.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MobileCard
                      pressable
                      onPress={() => navigate(`/messages/${chat.id}`)}
                      className="p-4 group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage 
                            src={otherProfile?.avatar_url || ''} 
                            alt={displayName}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-semibold">
                            {initials || 'У'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">
                            {displayName}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Заказ #{String(chat.job_id).slice(0, 8)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(chat.last_message_at || chat.created_at).toLocaleString('ru', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 rounded-lg bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-xl shadow-xl">
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteChat(chat.id, e)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Удалить чат
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </MobileCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    );
  }

  // Chat detail view
  const otherUserId = selectedChat ? 
    (selectedChat.client_id === userId ? selectedChat.professional_id : selectedChat.client_id) : 
    null;
  const otherProfile = otherUserId ? profiles[otherUserId] : null;
  const displayName = otherProfile?.full_name || 
                     (otherProfile?.first_name && otherProfile?.last_name ? 
                        `${otherProfile.first_name} ${otherProfile.last_name}` : 
                        'Пользователь');

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex flex-col">
      {/* Custom header for chat */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 bg-[#E5E7EB]"
        style={{ paddingTop: `env(safe-area-inset-top)` }}
      >
        <div className="px-4 py-2 bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/messages')}
                className="w-10 h-10 flex items-center justify-center bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl text-gray-700 hover:bg-[#E5E7EB]"
              >
                <ArrowLeft size={16} />
              </Button>
              
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherProfile?.avatar_url || ''} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-semibold text-sm">
                  {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="font-semibold text-gray-800">{displayName}</div>
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  <Circle className={`w-2 h-2 fill-current transition-colors duration-200 ${
                    otherOnline ? 'text-green-500' : 'text-gray-400'
                  }`} />
                  {otherTyping ? (
                    <span className="text-primary animate-pulse font-medium">Печатает…</span>
                  ) : (
                    <span className={`transition-colors duration-200 ${
                      otherOnline ? 'text-green-600 font-medium' : 'text-gray-500'
                    }`}>
                      {otherOnline ? 'В сети' : 'Не в сети'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 px-4 pt-4 pb-4 overflow-y-auto space-y-4"
        style={{ 
          paddingTop: 72 + safeAreaInsets.top + 16,
          paddingBottom: 80 + safeAreaInsets.bottom 
        }}
      >
        {messages.map((message) => {
          const senderProfile = profiles[message.sender_id];
          const senderName = senderProfile?.full_name || 
                           (senderProfile?.first_name && senderProfile?.last_name ? 
                              `${senderProfile.first_name} ${senderProfile.last_name}` : 
                              'Пользователь');
          const isOwn = message.sender_id === userId;

          return (
            <motion.div
              key={message.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {!isOwn && (
                <div 
                  className="w-8 h-8 rounded-full p-0.5 flex-shrink-0 mt-1"
                  style={{ 
                    background: 'var(--surface-raised)',
                    boxShadow: 'var(--shadow-raised)'
                  }}
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={senderProfile?.avatar_url || ''} alt={senderName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold text-xs">
                      {senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              
              <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                <div 
                  className={`p-4 rounded-2xl ${
                    isOwn 
                      ? 'text-white rounded-br-md ml-auto' 
                      : 'text-gray-800 rounded-bl-md'
                  }`}
                  style={isOwn ? {
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--brand-3)))',
                    boxShadow: 'var(--shadow-raised)'
                  } : {
                    background: 'var(--surface-elevated)',
                    boxShadow: 'var(--shadow-raised)'
                  }}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-2 ${
                    isOwn ? 'text-white/70' : 'text-gray-500'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString('ru', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              
              {isOwn && (
                <div 
                  className="w-8 h-8 rounded-full p-0.5 flex-shrink-0 mt-1 order-3"
                  style={{ 
                    background: 'var(--surface-raised)',
                    boxShadow: 'var(--shadow-raised)'
                  }}
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={senderProfile?.avatar_url || ''} alt={senderName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-semibold text-xs">
                      {senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div 
        className="fixed bottom-16 left-0 right-0 px-4 py-4 z-40"
        style={{ 
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(145deg, #E8ECF0, #D6DCE5)',
          boxShadow: '0 -8px 25px rgba(0,0,0,0.15)'
        }}
      >
        <div className="flex gap-3 items-end">
          <div 
            className="flex-1 bg-white rounded-2xl p-1"
            style={{ 
              boxShadow: 'inset 8px 8px 16px #D1D5DB, inset -8px -8px 16px #FFFFFF'
            }}
          >
            <input
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Написать сообщение..."
              className="w-full border-0 bg-transparent text-base min-h-[48px] px-4 py-3 rounded-[16px] focus:outline-none placeholder:text-gray-500"
              style={{ fontSize: '16px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="w-12 h-12 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
            style={{ 
              background: text.trim() 
                ? 'linear-gradient(135deg, #7C3AED, #A855F7)' 
                : 'linear-gradient(145deg, #E8ECF0, #D6DCE5)',
              boxShadow: text.trim() 
                ? '8px 8px 16px #BCBDC1, -8px -8px 16px #FFFFFF' 
                : 'inset 6px 6px 12px #D1D5DB, inset -6px -6px 12px #FFFFFF',
              color: text.trim() ? 'white' : '#7C3AED'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MobileMessages);