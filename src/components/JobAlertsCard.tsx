import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { categoryLabel } from "@/lib/categoryLabel";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { BellRing, Loader2 } from "lucide-react";

interface Category { id: string; key: string; label_ru: string | null; label_ro: string | null }

/**
 * Saved job filters for pros: instant notification when a matching job is posted.
 * Matching runs in a DB trigger, so alerts work even when the app is closed.
 */
export const JobAlertsCard = ({ userId }: { userId: string }) => {
  const { t, language } = useEnhancedI18n();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: cats }, { data: alert }, { data: proCats }] = await Promise.all([
        supabase.from("categories").select("id, key, label_ru, label_ro").order("label_ru"),
        supabase.from("job_alerts").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("pro_categories").select("category_id").eq("user_id", userId),
      ]);
      if (!mounted) return;
      setCategories(cats || []);
      if (alert) {
        setEnabled(alert.enabled);
        setSelected(alert.category_ids || []);
        setCity(alert.city || "");
        setMinBudget(alert.min_budget_cents ? String(alert.min_budget_cents / 100) : "");
      } else {
        // sensible default: the pro's own service categories
        setSelected((proCats || []).map((r) => r.category_id));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const save = async (nextEnabled?: boolean) => {
    setSaving(true);
    const en = nextEnabled ?? enabled;
    const { error } = await supabase.from("job_alerts").upsert({
      user_id: userId,
      enabled: en,
      category_ids: selected,
      city: city.trim() || null,
      min_budget_cents: minBudget ? Math.round(Number(minBudget) * 100) : null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast({ title: t("notifications.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("alerts.saved") });
  };

  const toggleCategory = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (loading) return null;

  return (
    <div className="neo-card p-6">
      <div className="flex items-start gap-3">
        <div className="neo-icon-well w-10 h-10 shrink-0">
          <BellRing className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold leading-tight">{t("alerts.title")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t("alerts.hint")}</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => { setEnabled(v); void save(v); }}
              aria-label={t("alerts.title")}
            />
          </div>

          {enabled && (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">{t("alerts.categories")}</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const active = selected.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          active ? "bg-primary text-primary-foreground neo-2" : "bg-neo neo-inset-1 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {categoryLabel(c, language)}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t("alerts.categories_hint")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium mb-1.5">{t("alerts.city")}</div>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("alerts.city_placeholder")} />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1.5">{t("alerts.min_budget")}</div>
                  <Input
                    type="number"
                    min="0"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="neo-btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("alerts.save")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
