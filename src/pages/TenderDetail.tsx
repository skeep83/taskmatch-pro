import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";

const TenderDetail = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatPrice } = useCurrency();

  const [tender, setTender] = useState<any | null>(null);
  const [price, setPrice] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Array<{ path: string; url: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [{ data: tenderData, error }, { data: sessionData }] = await Promise.all([
          (supabase as any)
            .from('tenders')
            .select('*')
            .eq('id', id)
            .maybeSingle(),
          supabase.auth.getSession(),
        ]);

        if (error) throw error;
        setTender(tenderData || null);
        setCurrentUserId(sessionData.session?.user?.id || null);

        if (id) {
          const bucket = supabase.storage.from('evidence');
          const { data: listedPhotos, error: listError } = await bucket.list(`tender/${id}`, {
            limit: 8,
            sortBy: { column: 'name', order: 'asc' },
          });

          if (listError) throw listError;

          const filePaths = (listedPhotos || [])
            .filter((file) => file.name && !file.name.endsWith('/'))
            .map((file) => `tender/${id}/${file.name}`);

          if (filePaths.length > 0) {
            const signed = await Promise.all(
              filePaths.map(async (path) => {
                const { data, error: signedError } = await bucket.createSignedUrl(path, 60 * 60);
                if (signedError || !data?.signedUrl) return null;
                return { path, url: data.signedUrl };
              })
            );
            setPhotos(signed.filter(Boolean) as Array<{ path: string; url: string }>);
          } else {
            setPhotos([]);
          }
        } else {
          setPhotos([]);
        }
      } catch (error: any) {
        console.error('Error loading tender:', error);
        toast({
          title: t("notifications.error"),
          description: error?.message || t("ui.ne_udalos_zagruzit_tender"),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toast]);

  const isOwnTender = Boolean(currentUserId && tender?.client_id === currentUserId);
  const isExpired = Boolean(tender?.deadline && new Date(tender.deadline).getTime() <= Date.now());
  const isClosed = tender?.status && tender.status !== 'open';
  const cannotBid = !tender || isOwnTender || isExpired || isClosed;

  const availabilityMessage = useMemo(() => {
    if (!tender) return '';
    if (isOwnTender) return t("ui.eto_vash_sobstvennyi_tender");
    if (isClosed) return t("ui.tender_uzhe_zakryt");
    if (isExpired) return t("ui.srok_podachi_predlozhenii_uzhe");
    return '';
  }, [tender, isOwnTender, isClosed, isExpired]);

  const placeBid = async () => {
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;

      if (!uid) {
        toast({
          title: t("messages.login_required"),
          description: t("ui.snachala_voidite_v_akkaunt_3"),
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      if (!tender) {
        toast({ title: t("ui.tender_ne_naiden"), variant: 'destructive' });
        return;
      }

      if (tender.client_id === uid) {
        toast({
          title: t("ui.nelzia_otkliknutsia_na_svoi"),
          description: t("ui.eto_vash_sobstvennyi_tender"),
          variant: 'destructive'
        });
        return;
      }

      if (tender.status !== 'open') {
        toast({
          title: t("ui.tender_uzhe_zakryt_2"),
          description: t("ui.otkliki_po_etomu_tenderu"),
          variant: 'destructive'
        });
        return;
      }

      if (tender.deadline && new Date(tender.deadline).getTime() <= Date.now()) {
        toast({
          title: t("ui.srok_podachi_istek"),
          description: t("ui.otkliki_po_etomu_tenderu"),
          variant: 'destructive'
        });
        return;
      }

      if (price === '' || Number(price) <= 0) {
        toast({
          title: t("ui.ukazhite_cenu"),
          description: t("ui.vvedite_cenu_predlozheniia_v"),
          variant: 'destructive'
        });
        return;
      }

      setSubmitting(true);
      const priceCents = Math.round(Number(price) * 100);
      const { error } = await (supabase as any)
        .from('bids')
        .insert({ tender_id: id, pro_id: uid, price_cents: priceCents, note: note.trim() || null });

      if (error) throw error;

      toast({
        title: t("ui.predlozhenie_otpravleno_2"),
        description: t("ui.vash_otklik_po_tenderu")
      });
      setPrice('');
      setNote('');
    } catch (e: any) {
      console.error(e);
      const message = String(e?.message || '');
      const duplicateBid = e?.code === '23505' || /duplicate key/i.test(message);
      const unauthorized = /not authorized|row-level security|violates row-level security|JWT|auth/i.test(message);

      toast({
        title: duplicateBid ? t("ui.predlozhenie_uzhe_otpravleno") : t("notifications.error"),
        description: duplicateBid
          ? t("ui.vy_uzhe_otpravili_predlozhenie_4")
          : unauthorized
            ? t("ui.snachala_voidite_v_akkaunt_2")
            : (message || t("ui.ne_udalos_otpravit_predlozhenie")),
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Тендер`} description={t("ui.detali_tendera")} canonical={`/tenders/${id}`} />
      <section className="max-w-3xl mx-auto card-surface">
        {loading ? (
          <h1 className="text-xl">{t("ui.zagruzka")}</h1>
        ) : !tender ? (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">{t("ui.tender_ne_naiden")}</h1>
            <p className="text-sm text-muted-foreground">{t("ui.vozmozhno_on_byl_udalen")}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-4">{tender.title || `Тендер #${String(tender.id).slice(0, 8)}`}</h1>
            <p className="text-sm mb-4 whitespace-pre-wrap">{tender.description}</p>

            <div className="grid gap-2 text-sm text-muted-foreground mb-4">
              {typeof tender.budget_max_cents === 'number' && (
                <div>Максимальный бюджет: {formatPrice(tender.budget_max_cents)}</div>
              )}
              {tender.deadline && (
                <div>Срок подачи: {new Date(tender.deadline).toLocaleString('ru-RU')}</div>
              )}
              {tender.status && (
                <div>Статус: {tender.status}</div>
              )}
            </div>

            {photos.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">{t("ui.vlozheniia")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <a
                      key={photo.path}
                      href={photo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border bg-muted/30"
                    >
                      <img
                        src={photo.url}
                        alt={`Вложение тендера ${index + 1}`}
                        className="h-32 w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {availabilityMessage && (
              <div className="p-3 rounded-md border mb-4 text-sm bg-muted/40">
                {availabilityMessage}
              </div>
            )}

            <div className="p-4 border rounded-md mb-4 grid sm:grid-cols-3 gap-3">
              <input
                className="border rounded-md px-3 py-2 bg-background"
                type="number"
                min={0}
                step="1"
                placeholder={t("ui.cena_mdl")}
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={cannotBid || submitting}
              />
              <input
                className="border rounded-md px-3 py-2 bg-background sm:col-span-2"
                placeholder={t("ui.kommentarii_opc")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={cannotBid || submitting}
              />
              <button className="btn-hero disabled:opacity-60" onClick={placeBid} disabled={cannotBid || submitting}>
                {submitting ? t("ui.otpravka_2") : t("dash.pro.respond")}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default TenderDetail;
