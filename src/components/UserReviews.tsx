import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { StarRating } from "@/components/ui/star-rating";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ReviewRow {
  id: string;
  score: number;
  comment: string | null;
  reply: string | null;
  created_at: string;
  from_user_id: string;
  raterName?: string;
}

/**
 * Public list of the latest reviews received by a user (pro, client or
 * business alike). Ratings are platform-wide trust signals: readable by
 * everyone (see mutual_ratings migration).
 */
export const UserReviews = ({ userId, limit = 6 }: { userId: string; limit?: number }) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<{ avg: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

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
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ data: rows }, { data: stat }] = await Promise.all([
          supabase
            .from("ratings")
            .select("id, score, comment, reply, created_at, from_user_id")
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
        // enrich with rater names
        const raterIds = [...new Set(list.map((r) => r.from_user_id))];
        let names: Record<string, string> = {};
        if (raterIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name")
            .in("id", raterIds);
          names = Object.fromEntries(
            (profiles || []).map((p) => [
              p.id,
              p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
            ])
          );
        }
        if (!mounted) return;
        setReviews(list.map((r) => ({ ...r, raterName: names[r.from_user_id] })));
        if (stat) setStats({ avg: stat.avg_rating, count: stat.rating_count });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId, limit]);

  if (loading) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-medium">{t("rate.reviews_title")}</h2>
        {stats && stats.count > 0 && (
          <span className="neo-chip px-3 py-1 text-xs font-medium text-foreground/80">
            ★ {stats.avg.toFixed(1)} · {stats.count}
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rate.no_reviews")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="neo-card p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium truncate">{r.raterName}</span>
                <StarRating rating={r.score} size="sm" readonly showValue={false} />
              </div>
              {r.comment && (
                <p className="text-sm text-foreground/80 leading-relaxed mb-2">{r.comment}</p>
              )}
              {r.reply && (
                <div className="bg-neo neo-inset-2 rounded-lg p-2.5 mb-2">
                  <div className="text-xs font-medium text-primary mb-0.5">{t("rate.reply_label")}</div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{r.reply}</p>
                </div>
              )}
              {!r.reply && currentUserId === userId && (
                <div className="mb-2">
                  <Textarea
                    rows={2}
                    className="text-sm mb-2"
                    placeholder={t("rate.reply_placeholder")}
                    value={replyDrafts[r.id] || ""}
                    onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => submitReply(r.id)} disabled={!(replyDrafts[r.id] || "").trim()}>
                    {t("rate.reply_send")}
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ruLocale })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
