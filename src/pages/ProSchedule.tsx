import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const weekdays = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

const ProSchedule = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [weekday, setWeekday] = useState<number>(1);
  const [start, setStart] = useState<string>('09:00');
  const [end, setEnd] = useState<string>('18:00');

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { navigate('/auth'); return; }
      setUserId(uid);
      const { data } = await (supabase as any).from('pro_availability').select('*').eq('user_id', uid).order('weekday');
      setItems(data || []);
    })();
  }, []);

  const addSlot = async () => {
    try {
      if (!userId) return;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      if (eh*60+em <= sh*60+sm) return toast({ title: 'Некорректное время', variant: 'destructive' });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from('pro_availability').insert({ user_id: userId, weekday, start_time: start+':00', end_time: end+':00' });
      if (error) throw error;
      const { data } = await (supabase as any).from('pro_availability').select('*').eq('user_id', userId).order('weekday');
      setItems(data || []);
      toast({ title: 'Добавлено' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from('pro_availability').delete().eq('id', id);
      if (error) throw error;
      setItems((prev)=>prev.filter((x)=>x.id!==id));
    } catch (e:any) {
      console.error(e);
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Расписание`} description="Pro schedule" canonical="/pro/schedule" />
      <section className="max-w-3xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Расписание</h1>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="text-sm">День</label>
            <select className="border rounded-md px-3 py-2 bg-background" value={weekday} onChange={(e)=>setWeekday(Number(e.target.value))}>
              {weekdays.map((w,idx)=>(<option key={idx} value={idx}>{w}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm">Начало</label>
            <input className="border rounded-md px-3 py-2 bg-background" type="time" value={start} onChange={(e)=>setStart(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Конец</label>
            <input className="border rounded-md px-3 py-2 bg-background" type="time" value={end} onChange={(e)=>setEnd(e.target.value)} />
          </div>
          <button className="btn-hero" onClick={addSlot}>Добавить</button>
        </div>
        <ul className="space-y-2">
          {items.length===0 && <li className="text-sm text-muted-foreground">Нет слотов</li>}
          {items.map((it)=> (
            <li key={it.id} className="p-3 border rounded-md flex items-center justify-between">
              <div className="text-sm">{weekdays[it.weekday]} • {String(it.start_time).slice(0,5)}–{String(it.end_time).slice(0,5)}</div>
              <button className="text-xs underline" onClick={()=>remove(it.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default ProSchedule;
