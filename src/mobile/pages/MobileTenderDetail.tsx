import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useMobile } from "@/mobile/providers/MobileProvider";
import { MobileHeader } from "@/mobile/components/navigation/MobileHeader";
import { MobileCard } from "@/mobile/components/ui/MobileCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Euro, Clock3, Image as ImageIcon, Gavel } from "lucide-react";

const MobileTenderDetail = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatPrice } = useCurrency();
  const { safeAreaInsets } = useMobile();

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
          title: 'Ошибка',
          description: error?.message || 'Не удалось загрузить тендер',
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
    if (isOwnTender) return 'Это ваш собственный тендер.';
    if (isClosed) return 'Тендер уже закрыт.';
    if (isExpired) return 'Срок подачи предложений уже истёк.';
    return '';
  }, [tender, isOwnTender, isClosed, isExpired]);

  const placeBid = async () => {
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;

      if (!uid) {
        toast({
          title: 'Требуется вход',
          description: 'Сначала войдите в аккаунт специалиста.',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      if (!tender) {
        toast({ title: 'Тендер не найден', variant: 'destructive' });
        return;
      }

      if (tender.client_id === uid) {
        toast({
          title: 'Нельзя откликнуться на свой тендер',
          description: 'Это ваш собственный тендер.',
          variant: 'destructive'
        });
        return;
      }

      if (tender.status !== 'open') {
        toast({
          title: 'Тендер уже закрыт',
          description: 'Отклики по этому тендеру больше не принимаются.',
          variant: 'destructive'
        });
        return;
      }

      if (tender.deadline && new Date(tender.deadline).getTime() <= Date.now()) {
        toast({
          title: 'Срок подачи истёк',
          description: 'Отклики по этому тендеру больше не принимаются.',
          variant: 'destructive'
        });
        return;
      }

      if (price === '' || Number(price) <= 0) {
        toast({
          title: 'Укажите цену',
          description: 'Введите цену предложения в обычной валюте, например 500.',
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
        title: 'Предложение отправлено',
        description: 'Ваш отклик по тендеру успешно отправлен.'
      });
      setPrice('');
      setNote('');
    } catch (e: any) {
      console.error(e);
      const message = String(e?.message || '');
      const duplicateBid = e?.code === '23505' || /duplicate key/i.test(message);
      const unauthorized = /not authorized|row-level security|violates row-level security|JWT|auth/i.test(message);

      toast({
        title: duplicateBid ? 'Предложение уже отправлено' : 'Ошибка',
        description: duplicateBid
          ? 'Вы уже отправили предложение по этому тендеру.'
          : unauthorized
            ? 'Сначала войдите в аккаунт специалиста и повторите попытку.'
            : (message || 'Не удалось отправить предложение'),
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
      <Seo title={`${t('app.name')} — Тендер`} description="Детали тендера" canonical={`/tenders/${id}`} />
      <MobileHeader title="Тендер" showBack={true} showNotifications={true} />

      <div className="px-4 pb-24 space-y-4" style={{ paddingTop: `${80 + safeAreaInsets.top}px` }}>
        {loading ? (
          <MobileCard className="text-center py-10">
            <p className="text-lg font-semibold">Загрузка…</p>
          </MobileCard>
        ) : !tender ? (
          <MobileCard className="space-y-3">
            <h1 className="text-xl font-semibold">Тендер не найден</h1>
            <p className="text-sm text-muted-foreground">Возможно, он был удалён или уже недоступен.</p>
          </MobileCard>
        ) : (
          <>
            <MobileCard className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold">{tender.title || `Тендер #${String(tender.id).slice(0, 8)}`}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{tender.description}</p>
                </div>
                <Badge className={tender.status === 'open' ? 'bg-green-500/15 text-green-700' : 'bg-muted text-foreground'}>
                  {tender.status || 'unknown'}
                </Badge>
              </div>

              <div className="grid gap-3 text-sm">
                {typeof tender.budget_max_cents === 'number' && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] flex items-center justify-center">
                      <Euro className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Максимальный бюджет</div>
                      <div className="font-semibold">{formatPrice(tender.budget_max_cents)}</div>
                    </div>
                  </div>
                )}
                {tender.deadline && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E5E7EB] shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] flex items-center justify-center">
                      <Clock3 className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Срок подачи</div>
                      <div className="font-semibold">{new Date(tender.deadline).toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                )}
              </div>
            </MobileCard>

            {photos.length > 0 && (
              <MobileCard className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <h2 className="text-lg font-semibold">Вложения</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo, index) => (
                    <a
                      key={photo.path}
                      href={photo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border bg-muted/30"
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
              </MobileCard>
            )}

            {availabilityMessage && (
              <MobileCard>
                <p className="text-sm">{availabilityMessage}</p>
              </MobileCard>
            )}

            <MobileCard className="space-y-4">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Отклик на тендер</h2>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border px-4 py-3 bg-background"
                  type="number"
                  min={0}
                  step="1"
                  placeholder="Цена, MDL"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={cannotBid || submitting}
                />
                <textarea
                  className="w-full rounded-xl border px-4 py-3 bg-background min-h-28"
                  placeholder="Комментарий (опционально)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={cannotBid || submitting}
                />
                <Button className="w-full rounded-xl" onClick={placeBid} disabled={cannotBid || submitting}>
                  {submitting ? 'Отправка…' : 'Откликнуться'}
                </Button>
              </div>
            </MobileCard>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileTenderDetail;
