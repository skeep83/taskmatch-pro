import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, X, ArrowLeft, Send, Maximize2 } from "lucide-react";
import { OPEN_CHAT_EVENT } from "@/lib/chatWidget";

interface ChatRow {
  id: string;
  client_id: string;
  professional_id: string;
  last_message_at: string | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
}

interface ProfileLite {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

const nameOf = (p?: ProfileLite | null, fallback = "—") =>
  p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(" ") || fallback;

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "•";

/**
 * Compact floating chat (bottom-right, desktop). Full-page /messages
 * stays available via the expand button and on mobile.
 */
export const ChatWidget = () => {
  const { t } = useEnhancedI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [activeChat, setActiveChat] = useState<ChatRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const hidden =
    location.pathname === "/messages" ||
    location.pathname.startsWith("/messages/") ||
    location.pathname === "/auth" ||
    location.pathname.startsWith("/admin");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) {
        setOpen(false);
        setActiveChat(null);
        setChats([]);
        setUnread(0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadChats = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("chats")
      .select("id, client_id, professional_id, last_message_at")
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(20);
    const rows = (data || []) as ChatRow[];
    setChats(rows);

    const otherIds = [...new Set(rows.map((c) => (c.client_id === userId ? c.professional_id : c.client_id)))];
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, avatar_url")
        .in("id", otherIds);
      setProfiles((prev) => {
        const next = { ...prev };
        (profs || []).forEach((p) => { next[p.id] = p; });
        return next;
      });
    }

    if (rows.length) {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .in("chat_id", rows.map((c) => c.id))
        .neq("sender_id", userId)
        .eq("is_read", false);
      setUnread(count || 0);
    }
  }, [userId]);

  useEffect(() => { void loadChats(); }, [loadChats]);

  // Refresh the list whenever the panel opens; Esc closes it
  useEffect(() => {
    if (open) void loadChats();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loadChats]);

  // External entry points (nav "Messages", job detail, FAB) open the widget
  useEffect(() => {
    const handler = async (e: Event) => {
      setOpen(true);
      const chatId = (e as CustomEvent<{ chatId?: string }>).detail?.chatId;
      if (chatId) {
        const { data } = await supabase
          .from("chats")
          .select("id, client_id, professional_id, last_message_at")
          .eq("id", chatId)
          .maybeSingle();
        if (data) void openChat(data as ChatRow);
      }
    };
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // realtime: refresh badge / active conversation on any new message
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-widget:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const m = payload.new as MessageRow & { chat_id: string };
        if (activeChat && m.chat_id === activeChat.id) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== userId && open) {
            void supabase.from("chat_messages").update({ is_read: true }).eq("id", m.id);
          }
        } else if (m.sender_id !== userId) {
          if (chats.some((c) => c.id === m.chat_id)) {
            setUnread((u) => u + 1);
          } else {
            // message in a conversation we have not loaded yet
            void loadChats();
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeChat?.id, open]);

  const openChat = async (chat: ChatRow) => {
    setActiveChat(chat);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, sender_id, content, created_at")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data || []) as MessageRow[]);
    if (userId) {
      void supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("chat_id", chat.id)
        .neq("sender_id", userId)
        .eq("is_read", false);
      void loadChats();
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, open]);

  const send = async () => {
    if (!text.trim() || !userId || !activeChat) return;
    const content = text.trim();
    setText("");
    const { data } = await supabase
      .from("chat_messages")
      .insert({ chat_id: activeChat.id, sender_id: userId, message_type: "text", content })
      .select()
      .single();
    if (data) setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
    void supabase.from("chats").update({ last_message_at: new Date().toISOString() }).eq("id", activeChat.id);
  };

  if (hidden) return null;

  const handleLauncherClick = () => {
    if (!userId) {
      navigate("/auth");
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={handleLauncherClick}
        aria-label={t("nav.messages_tab")}
        className="hidden md:flex fixed bottom-6 right-6 z-[120] w-14 h-14 rounded-full bg-neo neo-8 hover:neo-4 active:neo-inset-4 items-center justify-center transition-all duration-300"
      >
        {open ? <X className="w-6 h-6 text-foreground" /> : <MessageCircle className="w-6 h-6 text-primary" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="hidden md:flex fx-appear fixed bottom-24 right-6 z-[120] w-[380px] h-[560px] max-h-[calc(100vh-8rem)] neo-card flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-neo neo-inset-2 shrink-0">
            {activeChat ? (
              <>
                <button type="button" onClick={() => setActiveChat(null)} className="neo-icon-well w-8 h-8" aria-label={t("ui.nazad")}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-sm truncate flex-1 min-w-0">
                  {nameOf(profiles[activeChat.client_id === userId ? activeChat.professional_id : activeChat.client_id], t("menu.user"))}
                </span>
              </>
            ) : (
              <span className="font-semibold text-sm flex-1">{t("nav.messages_tab")}</span>
            )}
            <button
              type="button"
              onClick={() => navigate(activeChat ? `/messages/${activeChat.id}` : "/messages")}
              className="neo-icon-well w-8 h-8"
              aria-label={t("settings.open_full")}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          {!activeChat ? (
            <div className="flex-1 overflow-y-auto p-2">
              {chats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">{t("ui.vashi_chaty_poiaviatsia_zdes")}</p>
              ) : (
                chats.map((chat) => {
                  const other = profiles[chat.client_id === userId ? chat.professional_id : chat.client_id];
                  const name = nameOf(other, t("menu.user"));
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => void openChat(chat)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-neo hover:neo-2 transition-all text-left"
                    >
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarImage src={other?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">{initialsOf(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{name}</div>
                        {chat.last_message_at && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(chat.last_message_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${m.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-neo neo-inset-2"}`}>
                      {m.content}
                      <div className={`text-[10px] mt-0.5 ${m.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); void send(); }}
                className="p-3 bg-neo neo-inset-2 flex gap-2 shrink-0"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("ui.vvedite_soobschenie")}
                  className="flex-1 px-3 py-2 rounded-xl bg-neo neo-inset-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
                />
                <button type="submit" disabled={!text.trim()} className="neo-btn-primary w-10 h-10 !p-0 rounded-xl" aria-label="Send">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
