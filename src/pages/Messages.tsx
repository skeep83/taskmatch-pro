import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Video, Phone, Paperclip, Send, Circle, Clock, CheckCircle2, Shield, Trash2, MoreVertical, AlertTriangle, ArrowLeft, X } from "lucide-react";
import { createChatNotification, markChatNotificationsAsRead } from "@/utils/chatNotifications";
import { notificationSounds } from "@/utils/notificationSounds";
import { useSoundSettings } from "@/hooks/useSoundSettings";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const roomRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, otherTyping]);

  const selectedChatId = id;

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) {
        toast({ title: t("messages.login_required"), description: t("messages.please_login") });
        navigate("/auth");
        return;
      }
      setUserId(uid);
      ;
      const { data } = await (supabase as any)
        .from("chats")
        .select("id, job_id, tender_id, client_id, professional_id, last_message_at, created_at")
        .or(`client_id.eq.${uid},professional_id.eq.${uid}`)
        .order("last_message_at", { ascending: false })
        .limit(50);
      ;
      setChats((data || []).filter(chat => chat.client_id !== chat.professional_id));

      // Load profiles for chat participants
      if (data && data.length > 0) {
        const userIds = new Set<string>();
        userIds.add(uid); // Add current user to load their profile too
        data.forEach((chat: any) => {
          if (chat.client_id !== uid) userIds.add(chat.client_id);
          if (chat.professional_id !== uid) userIds.add(chat.professional_id);
        });

        if (userIds.size > 0) {
          const { data: profilesData, error: profilesError } = await (supabase as any)
            .from("profiles")
            .select("id, full_name, first_name, last_name, avatar_url")
            .in("id", Array.from(userIds));

          ;

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

      ;

      if (userParam && userParam === uid) {
        toast({
          title: t("ui.nedostupno"),
          description: t("ui.nelzia_sozdat_chat_s"),
          variant: "destructive"
        });
        navigate('/messages', { replace: true });
        return;
      }

      if (userParam && !id) {
        // Find or create chat with specific user
        const existingChat = data?.find((chat: any) =>
          (chat.client_id === userParam && chat.professional_id === uid) ||
          (chat.professional_id === userParam && chat.client_id === uid) ||
          (chat.job_id === jobParam && (
            (chat.client_id === uid && chat.professional_id === userParam) ||
            (chat.professional_id === uid && chat.client_id === userParam)
          ))
        );

        ;

        if (existingChat) {
          ;
          navigate(`/messages/${existingChat.id}`, { replace: true });
        } else if (jobParam) {
          // Get job data to determine who is client and who is professional
          ;
          const { data: jobData } = await (supabase as any)
            .from("jobs")
            .select("client_id, pro_id")
            .eq("id", jobParam)
            .single();

          ;

          if (jobData) {
            let clientId, professionalId;

            ;
            ;

            // Current user is client, target user is professional
            if (jobData.client_id === uid && jobData.pro_id === userParam) {
              clientId = uid;
              professionalId = userParam;
              ;
            }
            // Current user is professional, target user is client
            else if (jobData.pro_id === uid && jobData.client_id === userParam) {
              clientId = userParam;
              professionalId = uid;
              ;
            }
            // Fallback: determine from user roles
            else {
              // Load user roles to determine client vs professional
              const { data: currentUserRoles } = await (supabase as any)
                .from("user_roles")
                .select("role")
                .eq("user_id", uid);

              const { data: targetUserRoles } = await (supabase as any)
                .from("user_roles")
                .select("role")
                .eq("user_id", userParam);

              const currentRoles = (currentUserRoles || []).map((r: any) => r.role);
              const targetRoles = (targetUserRoles || []).map((r: any) => r.role);

              // If current user has client role and target has pro role
              if (currentRoles.includes('client') && targetRoles.includes('pro')) {
                clientId = uid;
                professionalId = userParam;
              }
              // If current user has pro role and target has client role
              else if (currentRoles.includes('pro') && targetRoles.includes('client')) {
                clientId = userParam;
                professionalId = uid;
              }
              // Default fallback
              else {
                clientId = uid;
                professionalId = userParam;
              }
            }

            ;

            if (clientId && professionalId) {
              await createChatForJob(clientId, professionalId, jobParam);
            } else {
              ;
            }
          }
        } else {
          // Create chat without job context - need to determine roles
          const { data: currentUserRoles } = await (supabase as any)
            .from("user_roles")
            .select("role")
            .eq("user_id", uid);

          const { data: targetUserRoles } = await (supabase as any)
            .from("user_roles")
            .select("role")
            .eq("user_id", userParam);

          const currentRoles = (currentUserRoles || []).map((r: any) => r.role);
          const targetRoles = (targetUserRoles || []).map((r: any) => r.role);

          let clientId, professionalId;

          if (currentRoles.includes('client') && targetRoles.includes('pro')) {
            clientId = uid;
            professionalId = userParam;
          } else if (currentRoles.includes('pro') && targetRoles.includes('client')) {
            clientId = userParam;
            professionalId = uid;
          } else {
            // Default fallback
            clientId = uid;
            professionalId = userParam;
          }

          await createChatForJob(clientId, professionalId, null);
        }
      }
    })();
  }, [navigate, toast, searchParams, id]);

  const createChatForJob = async (clientId: string, professionalId: string, jobId: string | null) => {
    try {
      ;

      // Validate required parameters
      if (!clientId || !professionalId) {
        ;
        toast({
          title: t("notifications.error"),
          description: t("ui.nedostatochno_dannyh_dlia_sozdaniia"),
          variant: "destructive"
        });
        return;
      }

      if (clientId === professionalId) {
        toast({
          title: t("ui.nedostupno"),
          description: t("ui.nelzia_sozdat_chat_s"),
          variant: "destructive"
        });
        navigate('/messages', { replace: true });
        return;
      }


      let existingChatQuery = (supabase as any)
        .from("chats")
        .select("id")
        .eq("client_id", clientId)
        .eq("professional_id", professionalId)
        .limit(1);

      if (jobId) {
        existingChatQuery = existingChatQuery.eq("job_id", jobId);
      } else {
        existingChatQuery = existingChatQuery.is("job_id", null);
      }

      const { data: existingChats, error: existingChatError } = await existingChatQuery;
      if (existingChatError) {
        ;
      }

      const existingChat = existingChats?.[0];
      if (existingChat?.id) {
        navigate(`/messages/${existingChat.id}`, { replace: true });
        return;
      }

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

      ;

      if (error) throw error;
      if (newChat) {
        ;
        navigate(`/messages/${newChat.id}`, { replace: true });
      } else {
        ;
      }
    } catch (error) {
      ;
      toast({ title: t("notifications.error"), description: t("ui.ne_udalos_sozdat_chat"), variant: "destructive" });
    }
  };

  const deleteChat = async (chatId: string) => {
    try {

      // Delete chat messages first
      await (supabase as any)
        .from("chat_messages")
        .delete()
        .eq("chat_id", chatId);

      // Delete the chat
      const { error } = await (supabase as any)
        .from("chats")
        .delete()
        .eq("id", chatId);

      if (error) throw error;

      // Update local state
      setChats(prev => prev.filter(c => c.id !== chatId));

      // Navigate away if current chat was deleted
      if (String(id) === String(chatId)) {
        navigate("/messages");
      }

      toast({
        title: t("ui.chat_udalen"),
        description: t("ui.chat_i_vse_soobscheniia")
      });

    } catch (error) {
      ;
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_udalit_chat"),
        variant: "destructive"
      });
    }
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      deleteChat(chatToDelete);
    }
    setDeleteDialogOpen(false);
    setChatToDelete(null);
  };

  // Load messages + realtime subscription (proper cleanup, unique channel per chat)
  useEffect(() => {
    if (!id) { setMessages([]); return; }

    let cancelled = false;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("chat_messages")
        .select("id, sender_id, content, file_url, created_at, is_read")
        .eq("chat_id", id)
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      setMessages(data || []);

      // Mark incoming messages as read (receipt for the other side)
      if (userId) {
        void (supabase as any)
          .from("chat_messages")
          .update({ is_read: true })
          .eq("chat_id", id)
          .neq("sender_id", userId)
          .eq("is_read", false);
        void markChatNotificationsAsRead(id);
      }

      const senderIds = new Set((data || []).map((msg: any) => msg.sender_id));
      if (senderIds.size > 0) {
        const { data: messageProfiles } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, first_name, last_name, avatar_url")
          .in("id", Array.from(senderIds));
        if (!cancelled && messageProfiles) {
          setProfiles(prev => {
            const updated = { ...prev };
            messageProfiles.forEach((profile: any) => { updated[profile.id] = profile; });
            return updated;
          });
        }
      }
    };

    void load();

    const channel = (supabase as any).channel(`chat-messages:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${id}` }, async (payload: any) => {
        const newMessage = payload.new;
        setMessages((prev) => prev.some((message) => message.id === newMessage.id) ? prev : [...prev, newMessage]);

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

        if (newMessage.sender_id !== userId) {
          if (settings.enabled && settings.messageSound) {
            try { await notificationSounds.playNotification('message'); } catch { /* noop */ }
          }
          // Viewing the chat => immediately mark as read
          if (document.visibilityState === 'visible') {
            void (supabase as any)
              .from("chat_messages")
              .update({ is_read: true })
              .eq("id", newMessage.id);
            void markChatNotificationsAsRead(id);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${id}` }, (payload: any) => {
        const updated = payload.new;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      })
      .subscribe();

    return () => {
      cancelled = true;
      (supabase as any).removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  // Presence: online/typing of the other participant (proper cleanup)
  useEffect(() => {
    if (!id || !userId) return;

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

    return () => {
      (supabase as any).removeChannel(room);
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, chats]);

  // Broadcast typing state (throttled, auto-reset after 2s idle)
  const broadcastTyping = () => {
    const room = roomRef.current;
    if (!room || !userId || !id) return;
    void room.track({ user_id: userId, chat_id: id, online_at: new Date().toISOString(), typing: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      void room.track({ user_id: userId, chat_id: id, online_at: new Date().toISOString(), typing: false });
    }, 2000);
  };

  const send = async () => {
    if (!text.trim() || !userId || !id) return;

    const currentSelectedChat = chats.find(c => String(c.id) === String(id));
    if (!currentSelectedChat) {
      ;
      toast({ title: t("notifications.error"), description: t("ui.chat_ne_naiden"), variant: "destructive" });
      return;
    }

    if (currentSelectedChat.client_id === currentSelectedChat.professional_id) {
      toast({ title: t("ui.nedostupno"), description: t("ui.nelzia_otpravit_soobschenie_samomu"), variant: "destructive" });
      return;
    }

    try {

      ;

      // Send message
      const { data: newMessage, error } = await (supabase as any)
        .from("chat_messages")
        .insert({ chat_id: id, sender_id: userId, message_type: 'text', content: text })
        .select()
        .single();

      if (error) throw error;

      // Optimistic append (realtime will dedupe by id)
      if (newMessage) {
        setMessages((prev) => prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      void roomRef.current?.track({ user_id: userId, chat_id: id, online_at: new Date().toISOString(), typing: false });

      // Update chat timestamp
      await (supabase as any).from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id);

      // Clear input field
      setText("");

      // Send notification to other participant
      if (newMessage && currentSelectedChat) {
        const receiverId = currentSelectedChat.client_id === userId ? currentSelectedChat.professional_id : currentSelectedChat.client_id;
        const senderProfile = profiles[userId] || { full_name: t("menu.user") };
        const senderName = senderProfile.full_name || senderProfile.first_name || t("menu.user");
        const messagePreview = text.length > 50 ? text.substring(0, 50) + '...' : text;

        ;
        await createChatNotification(receiverId, senderName, messagePreview, id, newMessage.id, userId);
      }

    } catch (error) {
      ;
      toast({ title: t("notifications.error"), description: t("ui.ne_udalos_otpravit_soobschenie"), variant: "destructive" });
    }
  };

  const selectedChat = useMemo(() => {
    const chat = chats.find(c => String(c.id) === String(selectedChatId));
    ;
    return chat;
  }, [chats, selectedChatId]);

  const otherUser = useMemo(() => {
    if (!selectedChat || !userId) return null;
    const otherId = selectedChat.client_id === userId ? selectedChat.professional_id : selectedChat.client_id;
    return profiles[otherId] || null;
  }, [selectedChat, userId, profiles]);

  const renderProfileName = (profile: any) => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.first_name && profile?.last_name) return `${profile.first_name} ${profile.last_name}`;
    if (profile?.first_name) return profile.first_name;
    return t("menu.user");
  };

  const renderProfileInitials = (profile: any) => {
    const name = renderProfileName(profile);
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase())
      .join('');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-neomorphic)' }}>
      <Seo title={`${t('app.name')} — ${t('messages.title', t("nav.messages_tab"))}`} description="Chat messages" canonical="/messages" />

      <div className="flex h-screen">{/* Основной контейнер с neumorphic фоном */}
        {/* Chat List Sidebar */}
        <div className={cn(
          "border-r bg-muted/30 transition-all duration-300",
          selectedChatId ? "w-0 lg:w-80 overflow-hidden lg:overflow-visible" : "w-full lg:w-80"
        )}>
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t('messages.title', t("nav.messages_tab"))}</h1>
            {selectedChatId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/messages')}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t('messages.search_placeholder', t("ui.poisk_chatov"))}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">{t('messages.no_chats', t("ui.net_soobschenii"))}</p>
              </div>
            ) : (
              <div>
                {chats.map((chat) => {
                  const otherId = chat.client_id === userId ? chat.professional_id : chat.client_id;
                  const otherProfile = profiles[otherId];

                  return (
                    <div
                      key={chat.id}
                      className={cn(
                        "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                        String(selectedChatId) === String(chat.id) && "bg-primary/10 border-r-2 border-r-primary"
                      )}
                      onClick={() => navigate(`/messages/${chat.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherProfile?.avatar_url} />
                          <AvatarFallback>{renderProfileInitials(otherProfile)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">
                              {renderProfileName(otherProfile)}
                            </h3>
                            <div className="flex items-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('messages.delete_chat', t("ui.udalit_chat_2"))}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {chat.last_message_at ? new Date(chat.last_message_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          selectedChatId ? "flex" : "hidden lg:flex"
        )}>
          {selectedChatId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/messages')}
                    className="lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  <Avatar className="h-8 w-8">
                    <AvatarImage src={otherUser?.avatar_url} />
                    <AvatarFallback>{renderProfileInitials(otherUser)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h2 className="font-semibold">{renderProfileName(otherUser)}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Circle className={cn("h-2 w-2", otherOnline ? "text-green-500 fill-green-500" : "text-muted-foreground")} />
                      <span>
                        {otherTyping ? t("ui.pechataet") : otherOnline ? t("ui.v_seti") : t("ui.ne_v_seti")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 lg:pb-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {t('messages.no_messages', t("ui.net_soobschenii"))}
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_id === userId;
                    const senderProfile = profiles[message.sender_id];

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="h-6 w-6 mt-1">
                            <AvatarImage src={senderProfile?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {renderProfileInitials(senderProfile)}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={cn(
                            "max-w-[70%] px-3 py-2 rounded-lg",
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div
                            className={cn(
                              "flex items-center gap-1 mt-1 text-xs",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isOwn && (
                              <CheckCircle2 className={cn("h-3 w-3 ml-1", message.is_read ? "opacity-100" : "opacity-40")} />
                            )}
                          </div>
                        </div>

                        {isOwn && (
                          <Avatar className="h-6 w-6 mt-1">
                            <AvatarImage src={profiles[userId]?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {renderProfileInitials(profiles[userId])}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
                {otherTyping && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-9">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    {t("ui.pechataet")}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - ВСЕГДА ПОКАЗЫВАЕМ */}
              <div className="p-4 border-t bg-muted/30 fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto">
                <div className="max-w-full mx-auto">
                  <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
                      placeholder={t("ui.vvedite_soobschenie")}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background min-h-[44px]"
                      disabled={false}
                      autoFocus
                      onFocus={(e) => {
                        // Прокрутка к input полю на мобильных устройствах
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      }}
                    />
                    <Button
                      type="submit"
                      disabled={!text.trim()}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('messages.select_chat', t("messages.select_chat"))}
                </h3>
                <p className="text-muted-foreground">
                  {t('messages.select_chat_description', t("ui.vyberite_besedu_iz_spiska"))}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ui.udalit_chat")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ui.eto_deistvie_nelzia_otmenit")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;