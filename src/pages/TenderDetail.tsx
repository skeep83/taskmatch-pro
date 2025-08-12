import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";

const TenderDetail = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { id } = useParams();
  const [tender, setTender] = useState<any | null>(null);
  const [price, setPrice] = useState<number | ''>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase as any).from('tenders').select('*').eq('id', id).maybeSingle();
      setTender(data || null);
    })();
  }, [id]);

  const placeBid = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { window.location.href = '/auth'; return; }
      if (price === '' || Number(price) <= 0) return toast({ title: 'Укажите цену', variant: 'destructive' });
      const { error } = await (supabase as any).from('bids').insert({ tender_id: id, pro_id: uid, price_cents: Number(price), note });
      if (error) throw error;
      toast({ title: 'Заявка отправлена' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Тендер`} description="Детали тендера" canonical={`/tenders/${id}`} />
      <section className="max-w-3xl mx-auto card-surface">
        {!tender ? (
          <h1 className="text-xl">Загрузка…</h1>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-4">{tender.title || `Тендер #${String(tender.id).slice(0,8)}`}</h1>
            <p className="text-sm mb-4">{tender.description}</p>
            <div className="p-4 border rounded-md mb-4 grid sm:grid-cols-3 gap-3">
              <input className="border rounded-md px-3 py-2 bg-background" type="number" min={0} placeholder="Цена, ¢" value={price} onChange={(e)=>setPrice(e.target.value===''? '' : Number(e.target.value))} />
              <input className="border rounded-md px-3 py-2 bg-background sm:col-span-2" placeholder="Комментарий (опц.)" value={note} onChange={(e)=>setNote(e.target.value)} />
              <button className="btn-hero" onClick={placeBid}>Подать заявку</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default TenderDetail;
