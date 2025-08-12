import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

const Messages = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) {
        toast({ title: "Требуется вход", description: "Пожалуйста, войдите" });
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
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Сообщения`} description="Чаты и сообщения" canonical="/messages" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Сообщения</h1>
        <div className="grid md:grid-cols-3 gap-4">
          <aside className="md:col-span-1 border rounded-md overflow-hidden">
            <ul className="divide-y">
              {chats.length === 0 && <li className="p-3 text-sm text-muted-foreground">Нет чатов</li>}
              {chats.map((c) => (
                <li key={c.id}>
                  <button className={`w-full text-left p-3 hover:bg-muted ${String(c.id)===String(id)?'bg-muted':''}`} onClick={() => navigate(`/messages/${c.id}`)}>
                    <div className="text-sm">Чат #{String(c.id).slice(0,8)}</div>
                    <div className="text-xs text-muted-foreground">{c.last_message_at ? new Date(c.last_message_at).toLocaleString() : new Date(c.created_at).toLocaleString()}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <article className="md:col-span-2 border rounded-md flex flex-col min-h-[420px]">
            {!id ? (
              <div className="p-6 text-sm text-muted-foreground">Выберите чат слева</div>
            ) : (
              <>
                <div className="p-3 border-b text-sm">{selectedChat ? `Чат #${String(selectedChat.id).slice(0,8)}` : 'Чат'}</div>
                <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                  {messages.map((m) => (
                    <div key={m.id} className={`max-w-[80%] p-2 rounded-md ${m.sender_id===userId? 'ml-auto bg-primary/10' : 'bg-muted'}`}>
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                      <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input value={text} onChange={(e)=>setText(e.target.value)} className="flex-1 border rounded-md px-3 py-2 bg-background" placeholder="Напишите сообщение…" />
                  <button className="btn-hero" onClick={send}>Отправить</button>
                </div>
              </>
            )}
          </article>
        </div>
      </section>
    </main>
  );
};

export default Messages;
