import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

const DashboardBusiness = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [biz, setBiz] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // form states
  const [companyName, setCompanyName] = useState("");
  const [vat, setVat] = useState("");
  const [idno, setIdno] = useState("");
  const [addr, setAddr] = useState("");
  const [mult, setMult] = useState<number>(1.0);

  const [memberUserId, setMemberUserId] = useState("");

  type OrderRow = { category_id: string | null; description: string; min?: number; max?: number; when?: string };
  const [rows, setRows] = useState<OrderRow[]>([{ category_id: null, description: "Уборка офиса", min: 1000, max: 2000 }]);

  const businessId = useMemo(() => biz?.id as string | undefined, [biz]);

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

      // find owned business account
      const { data: owned } = await (supabase as any)
        .from('business_accounts')
        .select('*')
        .eq('owner_id', uid)
        .maybeSingle();

      if (owned) {
        setBiz(owned);
        setCompanyName(owned.company_name);
        setVat(owned.vat_number || '');
        setIdno(owned.idno || '');
        setAddr(owned.legal_address || '');
        setMult(Number(owned.rate_multiplier || 1));
        const { data: mems } = await (supabase as any)
          .from('business_members')
          .select('id, user_id, role, created_at')
          .eq('business_id', owned.id)
          .order('created_at', { ascending: false });
        setMembers(mems || []);
      }

      setLoading(false);
    })();
  }, []);

  const createBusiness = async () => {
    try {
      if (!userId) return;
      if (!companyName.trim()) return toast({ title: 'Укажите название', variant: 'destructive' });
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await (supabase as any)
        .from('business_accounts')
        .insert({ owner_id: userId, company_name: companyName, vat_number: vat || null, idno: idno || null, legal_address: addr || null, rate_multiplier: mult || 1 })
        .select('*')
        .single();
      if (error) throw error;
      setBiz(data);
      toast({ title: 'Компания создана' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const saveCompany = async () => {
    try {
      if (!businessId) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any)
        .from('business_accounts')
        .update({ company_name: companyName, vat_number: vat || null, idno: idno || null, legal_address: addr || null, rate_multiplier: mult || 1 })
        .eq('id', businessId);
      if (error) throw error;
      toast({ title: 'Сохранено' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const addMember = async () => {
    try {
      if (!businessId || !memberUserId) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from('business_members').insert({ business_id: businessId, user_id: memberUserId, role: 'member' });
      if (error) throw error;
      const { data: mems } = await (supabase as any).from('business_members').select('id, user_id, role, created_at').eq('business_id', businessId).order('created_at', { ascending: false });
      setMembers(mems || []);
      setMemberUserId('');
      toast({ title: 'Добавлен' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const addRow = () => setRows((prev)=> [...prev, { category_id: null, description: '' }]);
  const updateRow = (idx:number, patch: Partial<OrderRow>) => setRows((prev)=> prev.map((r,i)=> i===idx ? { ...r, ...patch } : r));
  const removeRow = (idx:number) => setRows((prev)=> prev.filter((_,i)=>i!==idx));

  const createMassOrders = async () => {
    try {
      if (!userId || !businessId) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const valid = rows.filter(r=> r.category_id && r.description.trim());
      if (valid.length === 0) return toast({ title: 'Заполните задания', variant: 'destructive' });
      // insert jobs one by one to keep RLS simple
      for (const r of valid) {
        const payload: any = {
          client_id: userId,
          category_id: r.category_id,
          description: r.description,
          budget_min_cents: r.min || null,
          budget_max_cents: r.max || null,
          scheduled_at: r.when || null,
          status: 'new'
        };
        const { data: job, error: jerr } = await (supabase as any).from('jobs').insert(payload).select('id').single();
        if (jerr) throw jerr;
        const { error: berr } = await (supabase as any).from('business_jobs').insert({ business_id: businessId, job_id: job.id });
        if (berr) throw berr;
      }
      toast({ title: 'Заказы созданы' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const uploadContract = async (file: File) => {
    try {
      if (!businessId) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split('.').pop();
      const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
      const { error: uerr } = await supabase.storage.from('biz_docs').upload(path, file, { upsert: false, contentType: file.type });
      if (uerr) throw uerr;
      const { data: signed } = await supabase.storage.from('biz_docs').createSignedUrl(path, 60*60);
      const url = signed?.signedUrl || path;
      const { error: aerr } = await (supabase as any).from('business_accounts').update({ contract_url: url }).eq('id', businessId);
      if (aerr) throw aerr;
      setBiz((prev:any)=> ({ ...prev, contract_url: url }));
      toast({ title: 'Договор загружен' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const createInvoice = async () => {
    try {
      if (!businessId) return;
      const amountStr = prompt('Сумма счёта, $') || '';
      const amount = Math.round(Number(amountStr) * 100);
      if (!amount || amount <= 0) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from('biz_invoices').insert({ business_id: businessId, amount_cents: amount, status: 'sent' });
      if (error) throw error;
      toast({ title: 'Счёт создан' });
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading) return <main className="container mx-auto py-12"><section className="max-w-6xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Бизнес-кабинет`} description="Business dashboard" canonical="/business/dashboard" />
      <section className="max-w-6xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Бизнес-кабинет</h1>

        {!biz ? (
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-3">Создать компанию</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border rounded-md px-3 py-2 bg-background" placeholder="Название компании" value={companyName} onChange={(e)=>setCompanyName(e.target.value)} />
              <input className="border rounded-md px-3 py-2 bg-background" placeholder="VAT/NDS" value={vat} onChange={(e)=>setVat(e.target.value)} />
              <input className="border rounded-md px-3 py-2 bg-background" placeholder="IDNO/рег. номер" value={idno} onChange={(e)=>setIdno(e.target.value)} />
              <input className="border rounded-md px-3 py-2 bg-background md:col-span-2" placeholder="Юридический адрес" value={addr} onChange={(e)=>setAddr(e.target.value)} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm">Мультипликатор тарифа</label>
              <input className="border rounded-md px-3 py-2 bg-background w-32" type="number" min={0.1} step={0.1} value={mult} onChange={(e)=>setMult(Number(e.target.value))} />
              <button className="btn-hero" onClick={createBusiness}>Создать</button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3">Профиль компании</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-md px-3 py-2 bg-background" placeholder="Название компании" value={companyName} onChange={(e)=>setCompanyName(e.target.value)} />
                <input className="border rounded-md px-3 py-2 bg-background" placeholder="VAT/NDS" value={vat} onChange={(e)=>setVat(e.target.value)} />
                <input className="border rounded-md px-3 py-2 bg-background" placeholder="IDNO/рег. номер" value={idno} onChange={(e)=>setIdno(e.target.value)} />
                <input className="border rounded-md px-3 py-2 bg-background md:col-span-2" placeholder="Юридический адрес" value={addr} onChange={(e)=>setAddr(e.target.value)} />
                <div className="flex items-center gap-3 md:col-span-2">
                  <label className="text-sm">Мультипликатор тарифа</label>
                  <input className="border rounded-md px-3 py-2 bg-background w-32" type="number" min={0.1} step={0.1} value={mult} onChange={(e)=>setMult(Number(e.target.value))} />
                  <button className="btn-ghost" onClick={saveCompany}>Сохранить</button>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm block mb-1">Договор</label>
                  <input type="file" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) uploadContract(f); }} />
                  {biz.contract_url && <div className="text-xs mt-1"><a className="underline" href={biz.contract_url} target="_blank" rel="noreferrer">Открыть текущий договор</a></div>}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3">Сотрудники</h3>
              <div className="flex flex-wrap items-end gap-2 mb-3">
                <input className="border rounded-md px-3 py-2 bg-background" placeholder="user_id" value={memberUserId} onChange={(e)=>setMemberUserId(e.target.value)} />
                <button className="btn-ghost" onClick={addMember}>Добавить</button>
              </div>
              <ul className="space-y-2">
                {members.length===0 && <li className="text-sm text-muted-foreground">Сотрудников пока нет</li>}
                {members.map((m)=> (
                  <li key={m.id} className="p-3 border rounded-md text-sm">{m.user_id} • {m.role}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3">Массовые заказы</h3>
              <div className="space-y-3">
                {rows.map((r,idx)=> (
                  <div key={idx} className="grid md:grid-cols-5 gap-2">
                    <select className="border rounded-md px-3 py-2 bg-background" value={r.category_id || ''} onChange={(e)=>updateRow(idx,{ category_id: e.target.value || null })}>
                      <option value="">Категория</option>
                      {categories.map((c:any)=> (<option key={c.id} value={c.id}>{c.label_ru || c.key}</option>))}
                    </select>
                    <input className="border rounded-md px-3 py-2 bg-background md:col-span-2" placeholder="Описание" value={r.description} onChange={(e)=>updateRow(idx,{ description: e.target.value })} />
                    <input className="border rounded-md px-3 py-2 bg-background" type="number" min={0} placeholder="Мин, ¢" value={r.min ?? ''} onChange={(e)=>updateRow(idx,{ min: e.target.value===''? undefined : Number(e.target.value) })} />
                    <input className="border rounded-md px-3 py-2 bg-background" type="number" min={0} placeholder="Макс, ¢" value={r.max ?? ''} onChange={(e)=>updateRow(idx,{ max: e.target.value===''? undefined : Number(e.target.value) })} />
                    <input className="border rounded-md px-3 py-2 bg-background md:col-span-2" type="datetime-local" value={r.when || ''} onChange={(e)=>updateRow(idx,{ when: e.target.value })} />
                    <div className="flex items-center"><button className="text-xs underline" onClick={()=>removeRow(idx)}>Удалить</button></div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <button className="btn-ghost" onClick={addRow}>Добавить строку</button>
                  <button className="btn-hero" onClick={createMassOrders}>Создать заказы</button>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3">Счета (e‑инвойсы)</h3>
              <button className="btn-ghost mb-3" onClick={createInvoice}>Создать счёт</button>
              {/* Для простоты: показать последние 20 */}
              <BizInvoices businessId={businessId!} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

const BizInvoices: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any).from('biz_invoices').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(20);
    setItems(data || []);
  })(); }, [businessId]);

  const markPaid = async (id: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from('biz_invoices').update({ status: 'paid' }).eq('id', id);
      if (error) throw error;
      setItems((prev)=> prev.map((x)=> x.id===id ? { ...x, status: 'paid' } : x));
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <ul className="space-y-2">
      {items.length===0 && <li className="text-sm text-muted-foreground">Пока нет счетов</li>}
      {items.map((it)=> (
        <li key={it.id} className="p-3 border rounded-md flex items-center justify-between">
          <div className="text-sm">#{String(it.id).slice(0,8)} • {(it.amount_cents/100).toFixed(2)} {it.currency.toUpperCase()} • {it.status}</div>
          {it.status !== 'paid' && <button className="text-xs underline" onClick={()=>markPaid(it.id)}>Отметить оплаченным</button>}
        </li>
      ))}
    </ul>
  );
};

export default DashboardBusiness;
