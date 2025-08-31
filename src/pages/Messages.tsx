import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Video, Phone, Paperclip, Send, Circle, Clock, CheckCircle2, Shield } from "lucide-react";
import { createChatNotification, markChatNotificationsAsRead } from "@/utils/chatNotifications";
import { notificationSounds } from "@/utils/notificationSounds";
import { useSoundSettings } from "@/hooks/useSoundSettings";

const Messages = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { settings } = useSoundSettings();

  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [text, setText] = useState("");
  const [presence, setPresence] = useState<Record<string, any>>({});
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const roomRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) {
        toast({ title: t("messages.login_required"), description: t("messages.please_login") });
        navigate("/auth");
        return;
      }
      setUserId(uid);
      const { data } = await (supabase as any)
        .from("chats")
        .select("id, job_id, tender_id, client_id, professional_id, last_message_at, created_at")
        .or(`client_id.eq.${uid},professional_id.eq.${uid}`)
        .order("last_message_at", { ascending: false })
        .limit(50);
      setChats(data || []);

      // Load profiles for chat participants
      if (data && data.length > 0) {
        const userIds = new Set<string>();
        userIds.add(uid); // Add current user to load their profile too
        data.forEach((chat: any) => {
          if (chat.client_id !== uid) userIds.add(chat.client_id);
          if (chat.professional_id !== uid) userIds.add(chat.professional_id);
        });

        if (userIds.size > 0) {
          const { data: profilesData } = await (supabase as any)
            .from("profiles")
            .select("id, full_name, first_name, last_name, avatar_url")
            .in("id", Array.from(userIds));
          
          const profilesMap: Record<string, any> = {};
          (profilesData || []).forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
          setProfiles(profilesMap);
        }
      }

      // Handle URL parameters for creating/opening chats
      const userParam = searchParams.get('user');
      const jobParam = searchParams.get('job');
      
      if (userParam && !id) {
        // Find or create chat with specific user
        const existingChat = data?.find((chat: any) => 
          (chat.client_id === userParam && chat.professional_id === uid) ||
          (chat.professional_id === userParam && chat.client_id === uid)
        );
        
        if (existingChat) {
          navigate(`/messages/${existingChat.id}`, { replace: true });
        } else if (jobParam) {
          // Create new chat for job
          await createChatForJob(uid, userParam, jobParam);
        }
      }
    })();
  }, [navigate, toast, searchParams, id]);

  const createChatForJob = async (clientId: string, professionalId: string, jobId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: newChat, error } = await (supabase as any)
        .from("chats")
        .insert({
          job_id: jobId,
          client_id: clientId,
          professional_id: professionalId,
          status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;
      if (newChat) {
        navigate(`/messages/${newChat.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({ title: "Ошибка", description: "Не удалось создать чат", variant: "destructive" });
    }
  };

  useEffect(() => {
    (async () => {
      if (!id) { setMessages([]); return; }
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase as any)
        .from("chat_messages")
        .select("id, sender_id, content, file_url, created_at, is_read")
        .eq("chat_id", id)
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages(data || []);

      // Load profiles for message senders
      const senderIds = new Set((data || []).map((msg: any) => msg.sender_id));
      if (senderIds.size > 0) {
        const { data: messageProfiles } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, first_name, last_name, avatar_url")
          .in("id", Array.from(senderIds));
        
        if (messageProfiles) {
          setProfiles(prev => {
            const updated = { ...prev };
            messageProfiles.forEach((profile: any) => {
              updated[profile.id] = profile;
            });
            return updated;
          });
        }
      }

      // Realtime subscription with notification handling
      const channel = (supabase as any).channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${id}` }, async (payload: any) => {
          const newMessage = payload.new;
          setMessages((prev) => [...prev, newMessage]);
          
          // Load sender profile if not already loaded
          if (!profiles[newMessage.sender_id]) {
            const { data: senderProfile } = await (supabase as any)
              .from("profiles")
              .select("id, full_name, first_name, last_name, avatar_url")
              .eq("id", newMessage.sender_id)
              .single();
            
            if (senderProfile) {
              setProfiles(prev => ({ ...prev, [senderProfile.id]: senderProfile }));
            }
          }
          
          // Play sound and show notification if message is from another user
          if (newMessage.sender_id !== userId && settings.enabled && settings.messageSound) {
            try {
              await notificationSounds.playNotification('message');
            } catch (error) {
              console.warn('Could not play notification sound:', error);
            }
          }
          
          // Mark chat notifications as read when user is viewing the chat
          if (document.visibilityState === 'visible') {
            await markChatNotificationsAsRead(id);
          }
        })
        .subscribe();

      return () => { (supabase as any).removeChannel(channel); };
    })();
  }, [id]);

  // Presence: track participants in this chat
  useEffect(() => {
    (async () => {
      if (!id || !userId) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const room = (supabase as any).channel(`presence:chat:${id}`, { config: { presence: { key: userId } } });
      roomRef.current = room;

      const updateState = () => {
        const state = room.presenceState() as Record<string, any[]>;
        setPresence(state);
        const chat = chats.find((c) => String(c.id) === String(id));
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
            await room.track({ user_id: userId, chat_id: id, online_at: new Date().toISOString(), typing: false });
          }
        });

      return () => { (supabase as any).removeChannel(room); roomRef.current = null; };
    })();
  }, [id, userId, chats]);

  const send = async () => {
    if (!text.trim() || !userId || !id) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Send message
      const { data: newMessage, error } = await (supabase as any)
        .from("chat_messages")
        .insert({ chat_id: id, sender_id: userId, message_type: 'text', content: text })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update chat timestamp
      await (supabase as any).from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id);
      
      // Send notification to other participant
      if (newMessage && selectedChat) {
        const receiverId = selectedChat.client_id === userId ? selectedChat.professional_id : selectedChat.client_id;
        const senderProfile = profiles[userId] || { full_name: 'Пользователь' };
        const senderName = senderProfile.full_name || 
                          (senderProfile.first_name && senderProfile.last_name ? 
                           `${senderProfile.first_name} ${senderProfile.last_name}` : 
                           'Пользователь');
        
        try {
          await createChatNotification(
            receiverId,
            senderName,
            text,
            id,
            newMessage.id,
            userId
          );
        } catch (notificationError) {
          console.warn('Failed to send notification:', notificationError);
        }
      }
      
      setText("");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" });
    }
  };

  const selectedChat = useMemo(() => chats.find((c) => String(c.id) === String(id)) || null, [chats, id]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Seo title={`${t('app.name')} — Сообщения`} description="Чаты и сообщения" canonical="/messages" />
      
      {/* Hero Section with Neumorphic Design */}
      <section className="relative min-h-[40vh] flex items-center overflow-hidden">
        {/* Background with subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.1),transparent_70%)]" />
        
        <div className="relative container mx-auto px-6 py-16 z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 animate-fade-in">
              <span className="text-gradient bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {t("messages.title")}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
              {t("messages.subtitle")}
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap gap-4 justify-center animate-fade-in" style={{ animationDelay: '400ms' }}>
              <FloatingCard className="p-4 bg-white/60 dark:bg-card/60 backdrop-blur-xl border-white/30" delay={600}>
                <div className="flex items-center gap-3 text-foreground">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">Защищенные чаты</span>
                </div>
              </FloatingCard>
              
              <FloatingCard className="p-4 bg-white/60 dark:bg-card/60 backdrop-blur-xl border-white/30" delay={800}>
                <div className="flex items-center gap-3 text-foreground">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-accent" />
                  </div>
                  <span className="font-medium">Видео-оценка</span>
                </div>
              </FloatingCard>
              
              <FloatingCard className="p-4 bg-white/60 dark:bg-card/60 backdrop-blur-xl border-white/30" delay={1000}>
                <div className="flex items-center gap-3 text-foreground">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium">Мгновенные ответы</span>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface Section */}
      <section className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8 h-[700px]">
            
            {/* Chat List - Neumorphic Card */}
            <div className="lg:col-span-1">
              <FloatingCard className="h-full p-6 backdrop-blur-xl bg-card/80 border-white/20" delay={200}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Circle className="w-5 h-5 text-green-500 fill-current" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Активные чаты</h2>
                </div>
                
                <div className="space-y-3 overflow-y-auto max-h-[580px] pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  {chats.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                        <span className="text-3xl">💬</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Нет активных чатов</p>
                    </div>
                  )}
                  
                  {chats.map((c, index) => {
                    const otherUserId = c.client_id === userId ? c.professional_id : c.client_id;
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
                    const jobNumber = String(c.job_id || c.tender_id || c.id).slice(0, 8);

                    return (
                      <div
                        key={c.id}
                        className={`group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
                          String(c.id) === String(id) 
                            ? 'bg-primary/10 border-2 border-primary/30' 
                            : 'bg-background/60 border border-border/50 hover:bg-background/80'
                        }`}
                        style={{ animationDelay: `${index * 100}ms` }}
                        onClick={() => navigate(`/messages/${c.id}`)}
                      >
                        {/* Gradient overlay for active chat */}
                        {String(c.id) === String(id) && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
                        )}
                        
                        <div className="relative p-4 flex items-center gap-3">
                          <Avatar className="w-12 h-12 flex-shrink-0 ring-2 ring-background shadow-lg">
                            <AvatarImage 
                              src={otherProfile?.avatar_url || ''} 
                              alt={displayName}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm">
                              {initials || 'У'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate text-foreground group-hover:text-primary transition-colors">
                              {displayName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                              Заказ #{jobNumber}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {c.last_message_at ? new Date(c.last_message_at).toLocaleString('ru', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                              }) : new Date(c.created_at).toLocaleString('ru', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </FloatingCard>
            </div>

            {/* Chat Messages - Main Chat Interface */}
            <div className="lg:col-span-3">
              <FloatingCard className="h-full backdrop-blur-xl bg-card/80 border-white/20 flex flex-col" delay={400}>
                {!id ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <span className="text-4xl">💬</span>
                      </div>
                      <h3 className="text-2xl font-display font-semibold mb-3 text-foreground">Выберите чат</h3>
                      <p className="text-muted-foreground leading-relaxed">Выберите чат из списка слева для начала общения с клиентами и специалистами</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Chat Header */}
                    <div className="p-6 border-b border-border/50 flex items-center justify-between bg-background/30 backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        {selectedChat ? (() => {
                          const otherUserId = selectedChat.client_id === userId ? selectedChat.professional_id : selectedChat.client_id;
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
                            <>
                              <Avatar className="w-12 h-12 ring-2 ring-background shadow-lg">
                                <AvatarImage src={otherProfile?.avatar_url || ''} alt={displayName} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg text-foreground">{displayName}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                                  Заказ #{String(selectedChat.job_id || selectedChat.tender_id || selectedChat.id).slice(0, 8)}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                  <Circle className={`w-2 h-2 fill-current ${otherOnline ? 'text-green-500' : 'text-gray-400'}`} />
                                  {otherTyping ? (
                                    <span className="text-primary animate-pulse">Печатает…</span>
                                  ) : (
                                    <span>{otherOnline ? 'В сети' : 'Не в сети'}</span>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })() : (
                          <>
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white font-semibold shadow-lg">
                              {String(id).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-lg text-foreground">Чат</div>
                              <div className="text-sm text-muted-foreground">Загрузка...</div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="hover:bg-accent/10 hover:text-accent">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                      {messages.map((m) => {
                        const senderProfile = profiles[m.sender_id];
                        const senderName = senderProfile?.full_name || 
                                          (senderProfile?.first_name && senderProfile?.last_name ? 
                                           `${senderProfile.first_name} ${senderProfile.last_name}` : 
                                           'Пользователь');
                        const senderInitials = senderName
                          .split(' ')
                          .filter(n => n.length > 0)
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);
                        
                        return (
                          <div key={m.id} className={`flex gap-4 ${m.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                            {m.sender_id !== userId && (
                              <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-background shadow-md">
                                <AvatarImage src={senderProfile?.avatar_url || ''} alt={senderName} />
                                <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-white font-semibold text-sm">
                                  {senderInitials}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div className={`max-w-[70%] ${m.sender_id === userId ? 'order-2' : ''}`}>
                              {m.sender_id !== userId && (
                                <div className="text-xs font-medium text-muted-foreground mb-2 px-1">{senderName}</div>
                              )}
                              
                              <div className={`relative rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
                                m.sender_id === userId 
                                  ? 'bg-gradient-to-r from-primary to-primary/90 text-white rounded-br-md ml-auto' 
                                  : 'bg-background/80 border border-border/50 text-foreground rounded-bl-md'
                              }`}>
                                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                                <div className={`text-xs mt-2 flex items-center gap-2 ${
                                  m.sender_id === userId ? 'text-white/70 justify-end' : 'text-muted-foreground'
                                }`}>
                                  <span>{new Date(m.created_at).toLocaleTimeString('ru', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}</span>
                                  {m.sender_id === userId && m.is_read && (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {m.sender_id === userId && (
                              <Avatar className="w-10 h-10 flex-shrink-0 order-3 ring-2 ring-background shadow-md">
                                <AvatarImage src={senderProfile?.avatar_url || ''} alt={senderName} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm">
                                  {senderInitials}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Message Input */}
                    <div className="p-6 border-t border-border/50 bg-background/30 backdrop-blur-sm">
                      <div className="flex gap-3 items-end">
                        <Button variant="ghost" size="sm" className="mb-2 hover:bg-accent/10 hover:text-accent">
                          <Paperclip className="w-4 h-4" />
                        </Button>
                        
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send();
                              }
                            }}
                            placeholder="Написать сообщение..."
                            className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:outline-none text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                        
                        <Button 
                          onClick={send}
                          disabled={!text.trim()}
                          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-6 py-3"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </FloatingCard>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Messages;