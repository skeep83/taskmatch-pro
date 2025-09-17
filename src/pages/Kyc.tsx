import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Kyc = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>('id_card');

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { navigate('/auth'); return; }
      setUserId(uid);
      const { data } = await (supabase as any)
        .from('kyc_documents')
        .select('id, doc_type, file_url, status, created_at, reviewed_at')
        .order('created_at', { ascending: false })
        .limit(50);
      setDocs(data || []);
    })();
  }, [navigate]);

  const refreshDocs = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any)
      .from('kyc_documents')
      .select('id, doc_type, file_url, status, created_at, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setDocs(data || []);
  };

  const upload = async () => {
    try {
      if (!userId || !file) return;
      setUploading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split('.').pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uerr } = await supabase.storage.from('kyc').upload(path, file, { upsert: false, contentType: file.type });
      if (uerr) throw uerr;
      const { data: { publicUrl } } = supabase.storage.from('kyc').getPublicUrl(path);
      const fileUrl = publicUrl || path;
      const { error: ierr } = await (supabase as any)
        .from('kyc_documents')
        .insert({ user_id: userId, doc_type: docType, file_url: fileUrl });
      if (ierr) throw ierr;
      toast({ title: 'Документ загружен' });
      setFile(null);
      await refreshDocs();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка загрузки', description: e?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — KYC`} description="Загрузка документов KYC" canonical="/kyc" />
      <section className="max-w-3xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Верификация KYC</h1>
        <div className="p-4 border rounded-md mb-6">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <select className="border rounded-md px-3 py-2 bg-background" value={docType} onChange={(e)=>setDocType(e.target.value)}>
              <option value="id_card">ID / Паспорт</option>
              <option value="selfie">Селфи</option>
              <option value="license">Лицензия</option>
            </select>
            <input type="file" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="text-sm" />
            <button className="btn-hero" disabled={uploading || !file} onClick={upload}>{uploading ? 'Загрузка…' : 'Загрузить'}</button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Файлы будут использоваться для проверки и не публикуются.</p>
        </div>
        <h2 className="text-lg font-medium mb-2">Мои документы</h2>
        <ul className="space-y-3">
          {docs.length === 0 && <li className="text-sm text-muted-foreground">Пока нет документов</li>}
          {docs.map((d) => (
            <li key={d.id} className="p-3 rounded-md border flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">{d.doc_type}</p>
                <p className="text-xs text-muted-foreground">Статус: {d.status} • {new Date(d.created_at).toLocaleString()}</p>
              </div>
              <a className="text-xs underline" href={d.file_url} target="_blank" rel="noopener noreferrer">Открыть</a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default Kyc;
