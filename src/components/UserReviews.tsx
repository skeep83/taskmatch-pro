import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareQuote, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, ro as roLocale } from "date-fns/locale";

interface ReviewRow {
  id: string;
  score: number;
  comment: string | null;
  reply: string | null;
  photos: string[] | null;
  created_at: string;
  from_user_id: string;
  raterName?: string;
  raterAvatar?: string | null;
}

interface UserReviewsProps {
  userId: string;
  limit?: number;
  /** Hide the built-in header when the parent block provides its own */
  showHeader?: boolean;
}

/**
 * Public list of the latest reviews received by a user.
 * Flat inset rows — safe to embed inside any card without shadow-on-shadow.
 */
export const UserReviews = ({ userId, limit = 6, showHeader = true }: UserReviewsProps) => {
  const { t, language } = useEnhancedI18n();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<{ avg: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const dateLocale = language === "ro" ? roLocale : ruLocale;

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ data: rows }, { data: stat }] = await Promise.all([
          supabase
            .from("ratings")
            .select("id, score, comment, reply, photos, created_at, from_user_id")
            .eq("to_user_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit),
          supabase
            .from("user_rating_stats")
            .select("avg_rating, rating_count")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        const list = rows || [];
        const raterIds = [...new Set(list.map((r) => r.from_user_id))];
        let profileMap: Record<string, { name: string; avatar: string | null }> = {};
        if (raterIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name, avatar_url")
            .in("id", raterIds);
          profileMap = Object.fromEntries(
            (profiles || []).map((p) => [
              p.id,
              {
                name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || t("menu.user"),
                avatar: p.avatar_url,
              },
            ])
          );
        }
        if (!mounted) return;
        setReviews(list.map((r) => ({
          ...r,
          raterName: profileMap[r.from_user_id]?.name,
          raterAvatar: profileMap[r.from_user_id]?.avatar,
        })));
        if (stat) setStats({ avg: stat.avg_rating, count: stat.rating_count });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId, limit, t]);

  const submitReply = async (ratingId: string) => {
    const reply = (replyDrafts[ratingId] || "").trim();
    if (!reply) return;
    const { error } = await supabase.rpc("reply_to_rating", { _rating_id: ratingId, _reply: reply });
    if (error) {
      toast({ title: t("notifications.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("rate.reply_sent") });
    setReviews((prev) => prev.map((r) => (r.id === ratingId ? { ...r, reply } : r)));
    setReplyingTo(null);
  };

  if (loading) return null;

  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">{t("rate.reviews_title")}</h2>
          {stats && stats.count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <Star className="w-3 h-3 fill-current" />
              {stats.avg.toFixed(1)} · {stats.count}
            </span>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-neo neo-inset-2 px-4 py-5">
          <MessageSquareQuote className="w-5 h-5 text-muted-foreground/60 shrink-0" />
          <p className="text-sm text-muted-foreground">{t("rate.no_reviews")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const initials = (r.raterName || "•")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("") || "•";
            return (
              <div key={r.id} className="rounded-xl bg-neo neo-inset-2 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                    {r.raterAvatar
                      ? <img src={r.raterAvatar} alt={r.raterName} className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.raterName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: dateLocale })}
                    </div>
                  </div>
                  <StarRating rating={r.score} size="sm" readonly showValue={false} />
                </div>

                {r.comment && (
                  <p className="text-sm text-foreground/85 leading-relaxed mt-3">{r.comment}</p>
                )}

                {r.photos && r.photos.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {r.photos.slice(0, 4).map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightbox(url)}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-neo neo-2 hover:neo-4 transition-all shrink-0"
                        aria-label={t("reviews.view_photo")}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}

                {r.reply && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/40">
                    <div className="text-xs font-semibold text-primary mb-0.5">{t("rate.reply_label")}</div>
                    <p className="text-sm text-foreground/75 leading-relaxed">{r.reply}</p>
                  </div>
                )}

                {!r.reply && currentUserId === userId && (
                  replyingTo === r.id ? (
                    <div className="mt-3">
                      <Textarea
                        rows={2}
                        className="text-sm mb-2"
                        placeholder={t("rate.reply_placeholder")}
                        value={replyDrafts[r.id] || ""}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="rounded-lg" onClick={() => submitReply(r.id)} disabled={!(replyDrafts[r.id] || "").trim()}>
                          {t("rate.reply_send")}
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setReplyingTo(null)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(r.id)}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      {t("rate.reply_send")}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[130] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
