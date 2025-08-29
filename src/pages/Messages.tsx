import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Phone, Paperclip, Send, Circle, Clock, CheckCircle2, Shield } from "lucide-react";
import messagesImage from "@/assets/messages-chat.jpg";

const Messages = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();

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
    })();
  }, [navigate, toast]);

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

      // Realtime subscription
      const channel = (supabase as any).channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${id}` }, (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
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
      const { error } = await (supabase as any)
        .from("chat_messages")
        .insert({ chat_id: id, sender_id: userId, message_type: 'text', content: text });
      if (error) throw error;
      setText("");
      await (supabase as any).from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" });
    }
  };

  const selectedChat = useMemo(() => chats.find((c) => String(c.id) === String(id)) || null, [chats, id]);

  return (
    <main className="min-h-screen">
      <Seo title={`${t('app.name')} — Сообщения`} description="Чаты и сообщения" canonical="/messages" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={messagesImage} alt="Messages" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-purple-600/80" />
        </div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-in">
              {t("messages.title")}
            </h1>
            <p className="text-xl text-white/90 mb-6">
              {t("messages.subtitle")}
            </p>
            <div className="flex gap-4">
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <Shield className="w-5 h-5 text-green-300" />
                  <span>Защищенные чаты</span>
                </div>
              </FloatingCard>
              <FloatingCard className="p-3 bg-white/20 backdrop-blur-sm border-white/30">
                <div className="flex items-center gap-2 text-white">
                  <Video className="w-5 h-5 text-blue-300" />
                  <span>Видео-оценка</span>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6 h-[600px]">
            
            {/* Chat List */}
            <GlassMorphism className="lg:col-span-1 p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Circle className="w-4 h-4 text-green-500 fill-current" />
                Активные чаты
              </h2>
              <div className="space-y-2 overflow-y-auto max-h-[500px]">
                {chats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-sm">Нет активных чатов</p>
                  </div>
                )}
                {chats.map((c) => {
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
                    <FloatingCard 
                      key={c.id} 
                      className={`p-3 cursor-pointer transition-all hover:scale-[1.02] ${
                        String(c.id) === String(id) ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => navigate(`/messages/${c.id}`)}
                    >
                       <div className="flex items-center gap-3">
                         <Avatar className="w-10 h-10">
                           <AvatarImage src={otherProfile?.avatar_url || ''} alt={displayName} />
                           <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold text-sm">
                             {initials}
                           </AvatarFallback>
                         </Avatar>
                         <div className="flex-1 min-w-0">
                           <div className="font-medium text-sm truncate">
                             {displayName}
                           </div>
                           <div className="text-xs text-muted-foreground truncate">
                             Заказ #{jobNumber}
                           </div>
                           <div className="text-xs text-muted-foreground flex items-center gap-1">
                             <Clock className="w-3 h-3" />
                             {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : new Date(c.created_at).toLocaleString()}
                           </div>
                         </div>
                       </div>
                    </FloatingCard>
                  );
                })}
              </div>
            </GlassMorphism>

            {/* Chat Messages */}
            <GlassMorphism className="lg:col-span-3 flex flex-col">
              {!id ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold mb-2">Выберите чат</h3>
                    <p className="text-muted-foreground">Выберите чат из списка слева для начала общения</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                   <div className="p-4 border-b border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-3">
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
                             <Avatar className="w-10 h-10">
                               <AvatarImage src={otherProfile?.avatar_url || ''} alt={displayName} />
                               <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold">
                                 {initials}
                               </AvatarFallback>
                             </Avatar>
                             <div>
                               <div className="font-medium">{displayName}</div>
                               <div className="text-xs text-muted-foreground">
                                 Заказ #{String(selectedChat.job_id || selectedChat.tender_id || selectedChat.id).slice(0, 8)}
                               </div>
                               <div className="text-xs text-muted-foreground flex items-center gap-1">
                                 <Circle className={`w-2 h-2 fill-current ${otherOnline ? 'text-green-500' : 'text-gray-400'}`} />
                                 {otherTyping ? 'Печатает…' : (otherOnline ? 'В сети' : 'Не в сети')}
                               </div>
                             </div>
                           </>
                         );
                       })() : (
                         <>
                           <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                             {String(id).slice(0, 2).toUpperCase()}
                           </div>
                           <div>
                             <div className="font-medium">Чат</div>
                           </div>
                         </>
                       )}
                     </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-2xl ${
                          m.sender_id === userId 
                            ? 'bg-primary text-primary-foreground rounded-br-md' 
                            : 'bg-muted rounded-bl-md'
                        }`}>
                          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                          <div className={`text-xs mt-1 flex items-center gap-1 ${
                            m.sender_id === userId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                            {m.sender_id === userId && m.is_read && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-white/10">
                    <div className="flex gap-3 items-end">
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 relative">
                        <input
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && send()}
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                          placeholder="Напишите сообщение..."
                        />
                      </div>
                      <Button onClick={send} className="flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </GlassMorphism>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Messages;
