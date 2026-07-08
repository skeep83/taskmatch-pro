import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { categoryLabel } from "@/lib/categoryLabel";
import { StarRating } from "@/components/ui/star-rating";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useVerifiedUsers } from "@/hooks/useVerifiedUsers";
import { ArrowRight, Users, Briefcase, ShieldCheck } from "lucide-react";

interface Category { id: string; key: string; label_ru: string | null; label_ro: string | null }
interface ProRow { user_id: string; name: string; avatar: string | null; avg: number; count: number }

/**
 * Public SEO landing for a service category: /services/:key
 * Live counts, top verified pros, clear CTA.
 */
const CategoryLanding = () => {
  const { key } = useParams<{ key: string }>();
  const { t, language } = useEnhancedI18n();
  const [category, setCategory] = useState<Category | null>(null);
  const [jobsCount, setJobsCount] = useState(0);
  const [pros, setPros] = useState<ProRow[]>([]);
  const [loading, setLoading] = useState(true);
  const verified = useVerifiedUsers(pros.map((p) => p.user_id));

  useEffect(() => {
    if (!key) return;
    let mounted = true;
    (async () => {
      const { data: cat } = await supabase
        .from("categories").select("id, key, label_ru, label_ro").eq("key", key).maybeSingle();
      if (!mounted || !cat) { setLoading(false); return; }
      setCategory(cat);

      const [{ count }, { data: proCats }] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("category_id", cat.id),
        supabase.from("pro_categories").select("user_id").eq("category_id", cat.id).limit(50),
      ]);
      if (!mounted) return;
      setJobsCount(count || 0);

      const ids = [...new Set((proCats || []).map((r) => r.user_id))].slice(0, 12);
      if (ids.length) {
        const [{ data: profiles }, { data: stats }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, first_name, last_name, avatar_url").in("id", ids),
          supabase.from("user_rating_stats").select("user_id, avg_rating, rating_count").in("user_id", ids),
        ]);
        if (!mounted) return;
        const statMap = Object.fromEntries((stats || []).map((s) => [s.user_id, s]));
        const rows: ProRow[] = (profiles || []).map((p) => ({
          user_id: p.id,
          name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || t("menu.user"),
          avatar: p.avatar_url,
          avg: statMap[p.id]?.avg_rating || 0,
          count: statMap[p.id]?.rating_count || 0,
        })).sort((a, b) => b.avg - a.avg || b.count - a.count).slice(0, 6);
        setPros(rows);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [key, t]);

  useEffect(() => {
    if (category) {
      document.title = `${categoryLabel(category, language)} — ServiceHub`;
    }
    return () => { document.title = "ServiceHub — маркетплейс услуг"; };
  }, [category, language]);

  if (loading) return <div className="min-h-[50vh]" />;

  if (!category) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-3">{t("catland.not_found")}</h1>
        <Link to="/catalog" className="text-primary font-medium hover:underline">{t("catland.to_catalog")}</Link>
      </section>
    );
  }

  const label = categoryLabel(category, language);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">{t("catland.h1", { category: label })}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{t("catland.intro", { category: label.toLowerCase() })}</p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link to="/job/new" className="neo-btn-primary px-5 py-3 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
            {t("catland.cta_order")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/catalog" className="neo-btn px-5 py-3 rounded-xl text-sm font-semibold inline-flex items-center">
            {t("catland.cta_catalog")}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="neo-card p-5 flex items-center gap-3">
          <div className="neo-icon-well w-10 h-10 shrink-0"><Users className="w-5 h-5 text-primary" /></div>
          <div>
            <div className="text-xl font-bold">{pros.length}+</div>
            <div className="text-xs text-muted-foreground">{t("catland.stat_pros")}</div>
          </div>
        </div>
        <div className="neo-card p-5 flex items-center gap-3">
          <div className="neo-icon-well w-10 h-10 shrink-0"><Briefcase className="w-5 h-5 text-primary" /></div>
          <div>
            <div className="text-xl font-bold">{jobsCount}</div>
            <div className="text-xs text-muted-foreground">{t("catland.stat_jobs")}</div>
          </div>
        </div>
        <div className="neo-card p-5 flex items-center gap-3">
          <div className="neo-icon-well w-10 h-10 shrink-0"><ShieldCheck className="w-5 h-5 text-primary" /></div>
          <div>
            <div className="text-xl font-bold">{t("catland.stat_escrow_v")}</div>
            <div className="text-xs text-muted-foreground">{t("catland.stat_escrow")}</div>
          </div>
        </div>
      </div>

      {pros.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">{t("catland.top_pros", { category: label.toLowerCase() })}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pros.map((p) => (
              <Link key={p.user_id} to={`/pro/${p.user_id}`} className="neo-card neo-card-interactive p-4 flex items-center gap-3 block">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {p.avatar
                    ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    : p.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold truncate">{p.name}</span>
                    {verified.has(p.user_id) && <VerifiedBadge />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={p.avg} size="sm" readonly showValue={false} />
                    <span className="text-xs text-muted-foreground">
                      {p.count > 0 ? `${p.avg.toFixed(1)} · ${p.count}` : t("catalog.new_specialist")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="neo-card p-6">
        <h2 className="text-lg font-semibold mb-3">{t("catland.how_title")}</h2>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. {t("catland.how_1", { category: label.toLowerCase() })}</li>
          <li>2. {t("catland.how_2")}</li>
          <li>3. {t("catland.how_3")}</li>
          <li>4. {t("catland.how_4")}</li>
        </ol>
      </section>
    </div>
  );
};

export default CategoryLanding;
