import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";

const Feed = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFeed = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await (supabase as any).functions.invoke("feed-get", { body: { page: 1, limit: 20 } });
    if (error) {
      console.error(error);
      toast({ title: "Ошибка загрузки ленты", variant: "destructive" });
      return;
    }
    setItems(data?.items || []);
  };

  useEffect(() => { loadFeed(); }, []);

  const createPost = async () => {
    try {
      setLoading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await (supabase as any).auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) { window.location.href = "/auth"; return; }
      if (!title && !content) { toast({ title: "Добавьте текст поста", variant: "destructive" }); return; }

      const { data: post, error: insErr } = await (supabase as any)
        .from("posts").insert({ author_id: uid, title, content, visibility: "public", is_published: true }).select("id").maybeSingle();
      if (insErr) throw insErr;

      if (files && files.length > 0 && post?.id) {
        const uploads = Array.from(files).slice(0, 6);
        for (const f of uploads) {
          const path = `${uid}/${post.id}/${Date.now()}-${f.name}`;
          const { error: upErr } = await (supabase as any).storage.from("posts").upload(path, f);
          if (upErr) throw upErr;
          const { data: pub } = (supabase as any).storage.from("posts").getPublicUrl(path);
          const url = pub?.publicUrl;
          if (url) {
            await (supabase as any).from("post_photos").insert({ post_id: post.id, file_url: url });
          }
        }
      }

      setTitle(""); setContent(""); (document.getElementById("files") as HTMLInputElement | null)?.value && ((document.getElementById("files") as HTMLInputElement).value = "");
      toast({ title: "Пост опубликован" });
      await loadFeed();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-10">
      <Seo title="ServiceHub — Лента" description="Лента кейсов и объявлений" canonical="/feed" />
      <section className="max-w-3xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Лента</h1>

        <div className="p-4 border rounded-md mb-6">
          <h2 className="text-lg font-medium mb-2">Новый пост</h2>
          <div className="grid gap-3">
            <input className="border rounded-md px-3 py-2 bg-background" placeholder="Заголовок (опц.)" value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="border rounded-md px-3 py-2 bg-background min-h-24" placeholder="Текст поста" value={content} onChange={e=>setContent(e.target.value)} />
            <input id="files" type="file" multiple accept="image/*" onChange={(e)=>setFiles(e.target.files)} />
            <button className="btn-hero" onClick={createPost} disabled={loading}>{loading?"Публикация…":"Опубликовать"}</button>
          </div>
        </div>

        <ul className="space-y-4">
          {items.map((it:any)=> (
            <li key={it.id} className="p-4 border rounded-md">
              {it.title && <h3 className="text-base font-medium mb-1">{it.title}</h3>}
              {it.content && <p className="text-sm mb-2 whitespace-pre-wrap">{it.content}</p>}
              {it.photos?.length>0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {it.photos.map((ph:any)=> (
                    <img key={ph.id} src={ph.file_url} alt="Фото поста" className="w-full h-48 object-cover rounded-md" loading="lazy" />
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">{new Date(it.created_at).toLocaleString()}</div>
            </li>
          ))}
          {items.length===0 && <li className="text-sm text-muted-foreground">Пока нет публикаций</li>}
        </ul>
      </section>
    </main>
  );
};

export default Feed;
