import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

const ProProfile = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [radius, setRadius] = useState<number>(10);
  const [hourly, setHourly] = useState<number | ''>('');
  const [fixed, setFixed] = useState<number | ''>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { window.location.href = '/auth'; return; }
      setUserId(uid);
      // load categories
      const { data: cats } = await (supabase as any).from('categories').select('id, key, label_ru, label_ro').order('key');
      setCategories(cats || []);
      // load profile
      const { data: prof } = await (supabase as any).from('pro_profiles').select('*').eq('user_id', uid).maybeSingle();
      if (prof) {
        setBio(prof.bio || '');
        setRadius(prof.radius_km || 10);
        setHourly(prof.hourly_rate_cents || '');
        setFixed(prof.fixed_price_cents || '');
      }
      // load selected categories
      const { data: pc } = await (supabase as any).from('pro_categories').select('category_id').eq('user_id', uid);
      setSelected((pc || []).map((x: any) => x.category_id));
      setLoading(false);
    })();
  }, []);

  const toggleCat = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter(x => x!==id) : [...prev, id]);
  };

  const save = async () => {
    try {
      if (!userId) return;
      const { supabase } = await import("@/integrations/supabase/client");
      // upsert profile
      const payload: any = { user_id: userId, bio, radius_km: radius };
      if (hourly !== '') payload.hourly_rate_cents = Number(hourly);
      if (fixed !== '') payload.fixed_price_cents = Number(fixed);
      const { error: perr } = await (supabase as any).from('pro_profiles').upsert(payload, { onConflict: 'user_id' });
      if (perr) throw perr;
      // sync categories: delete missing, insert new
      const { data: existing } = await (supabase as any).from('pro_categories').select('category_id').eq('user_id', userId);
      const exist = new Set<string>((existing||[]).map((x:any)=>String(x.category_id)));
      const toAdd = selected.filter(id => !exist.has(id)).map(id => ({ user_id: userId, category_id: id }));
      const toRemove: string[] = [...exist].filter((id) => !selected.includes(id));
      if (toAdd.length) {
        const { error } = await (supabase as any).from('pro_categories').insert(toAdd);
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await (supabase as any).from('pro_categories').delete().eq('user_id', userId).in('category_id', toRemove);
        if (error) throw error;
      }
      toast({ title: 'Сохранено' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-4xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Профиль специалиста`} description="Pro profile" canonical="/pro/profile" />
      <section className="max-w-4xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Профиль специалиста</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm">О себе</label>
              <textarea value={bio} onChange={(e)=>setBio(e.target.value)} className="w-full border rounded-md px-3 py-2 bg-background min-h-[120px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Радиус (км)</label>
                <input type="number" min={1} value={radius} onChange={(e)=>setRadius(Number(e.target.value))} className="w-full border rounded-md px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="text-sm">Ставка, ¢/час</label>
                <input type="number" min={0} value={hourly} onChange={(e)=>setHourly(e.target.value===''? '' : Number(e.target.value))} className="w-full border rounded-md px-3 py-2 bg-background" />
              </div>
            </div>
            <div>
              <label className="text-sm">Фикс. цена, ¢ (опц.)</label>
              <input type="number" min={0} value={fixed} onChange={(e)=>setFixed(e.target.value===''? '' : Number(e.target.value))} className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
            <button className="btn-hero" onClick={save}>Сохранить</button>
          </div>
          <div>
            <h3 className="font-medium mb-2">Категории</h3>
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {categories.map((c:any)=> (
                <li key={c.id} className="flex items-center gap-2">
                  <input id={`cat-${c.id}`} type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggleCat(c.id)} />
                  <label htmlFor={`cat-${c.id}`} className="text-sm cursor-pointer">{c.label_ru || c.key}</label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ProProfile;
