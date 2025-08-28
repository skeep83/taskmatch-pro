import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { MediaViewer } from "@/components/media";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";

const ProPortfolio = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { window.location.href = '/auth'; return; }
      setUserId(uid);
      const { data } = await (supabase as any).from('portfolio_items').select('*').eq('pro_id', uid).order('created_at', { ascending: false });
      setItems(data || []);
    })();
  }, []);

  const refresh = async () => {
    if (!userId) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any).from('portfolio_items').select('*').eq('pro_id', userId).order('created_at', { ascending: false });
    setItems(data || []);
  };

  const addItem = async () => {
    try {
      if (!userId || !file) return;
      setUploading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split('.').pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uerr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: false, contentType: file.type });
      if (uerr) throw uerr;
      const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path);
      const image_url = publicUrl || path;
      const { error: ierr } = await (supabase as any).from('portfolio_items').insert({ pro_id: userId, title, description: desc, image_url });
      if (ierr) throw ierr;
      setTitle(''); setDesc(''); setFile(null);
      toast({ title: 'Добавлено' });
      await refresh();
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Портфолио`} description="Pro portfolio" canonical="/portfolio" />
      <section className="max-w-5xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Портфолио</h1>
        <div className="p-4 border rounded-md mb-6 grid md:grid-cols-3 gap-3">
          <input placeholder="Заголовок" value={title} onChange={(e)=>setTitle(e.target.value)} className="border rounded-md px-3 py-2 bg-background" />
          <input placeholder="Описание" value={desc} onChange={(e)=>setDesc(e.target.value)} className="border rounded-md px-3 py-2 bg-background" />
          <div className="flex items-center gap-2">
            <input type="file" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="text-sm" />
            <button className="btn-hero" disabled={uploading || !file} onClick={addItem}>{uploading? 'Загрузка…':'Добавить'}</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it)=> (
            <figure key={it.id} className="border rounded-md overflow-hidden">
              <MediaViewer 
                src={it.image_url} 
                alt={it.title || 'Работа'} 
                className="w-full h-48" 
                enableZoom 
              />
              <figcaption className="p-3">
                <div className="text-sm font-medium">{it.title}</div>
                {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
};

export default ProPortfolio;
