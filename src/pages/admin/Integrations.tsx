import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Map, Plug, Eye, EyeOff, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";

interface SettingRow { key: string; value: string }

const KNOWN_SERVICES: { key: string; name: string; description: string; placeholder: string; docs: string }[] = [
  {
    key: "google_maps_api_key",
    name: "Google Maps",
    description: "Карта выбора адреса в создании заказа, геокодирование адресов. Браузерный ключ — ограничьте его по домену в Google Cloud Console.",
    placeholder: "AIza...",
    docs: "https://console.cloud.google.com/apis/credentials",
  },
];

const parse = (v: unknown): string => {
  if (typeof v === "string") { try { return String(JSON.parse(v)); } catch { return v; } }
  return String(v ?? "");
};

/**
 * API service keys for the platform (category "integrations" in
 * platform_settings). Known services get first-class rows; anything
 * else can be added as a custom key for future integrations.
 */
const Integrations = () => {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<SettingRow[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .eq("category", "integrations");
      const map: Record<string, string> = {};
      const extras: SettingRow[] = [];
      (data || []).forEach((r) => {
        const v = parse(r.value);
        if (KNOWN_SERVICES.some((s) => s.key === r.key)) map[r.key] = v;
        else extras.push({ key: r.key, value: v });
      });
      setValues(map);
      setCustom(extras);
      setLoading(false);
    })();
  }, []);

  const save = async (key: string, value: string) => {
    setSaving(key);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ category: "integrations", key, value: JSON.stringify(value) }, { onConflict: "key" });
    setSaving(null);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Сохранено", description: `Ключ «${key}» обновлён.` });
  };

  const removeCustom = async (key: string) => {
    await supabase.from("platform_settings").delete().eq("category", "integrations").eq("key", key);
    setCustom((prev) => prev.filter((r) => r.key !== key));
    toast({ title: "Удалено" });
  };

  const addCustom = async () => {
    const key = newKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!key || !newValue.trim()) return;
    await save(key, newValue.trim());
    setCustom((prev) => [...prev.filter((r) => r.key !== key), { key, value: newValue.trim() }]);
    setNewKey("");
    setNewValue("");
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">API-сервисы</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ключи внешних сервисов. Значения категории «integrations» доступны фронтенду —
          храните здесь только браузерные (публичные) ключи; секретные ключи задавайте через
          <code className="mx-1 px-1.5 py-0.5 rounded bg-neo neo-inset-1 text-xs">supabase secrets set</code>.
        </p>
      </header>

      {KNOWN_SERVICES.map((svc) => {
        const val = values[svc.key] || "";
        const shown = visible[svc.key];
        return (
          <section key={svc.key} className="neo-card p-6">
            <div className="flex items-start gap-3">
              <div className="neo-icon-well w-10 h-10 shrink-0">
                <Map className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{svc.name}</h2>
                  {val && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2.5 py-0.5 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Подключено
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{svc.description}</p>
                <div className="flex gap-2 mt-3">
                  <div className="relative flex-1 min-w-0">
                    <Input
                      type={shown ? "text" : "password"}
                      value={val}
                      placeholder={svc.placeholder}
                      onChange={(e) => setValues((v) => ({ ...v, [svc.key]: e.target.value }))}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible((v) => ({ ...v, [svc.key]: !shown }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={shown ? "Скрыть" : "Показать"}
                    >
                      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button onClick={() => void save(svc.key, val)} disabled={saving === svc.key} className="rounded-xl shrink-0">
                    {saving === svc.key && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    Сохранить
                  </Button>
                </div>
                <a href={svc.docs} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
                  Консоль управления ключами
                </a>
              </div>
            </div>
          </section>
        );
      })}

      <section className="neo-card p-6">
        <div className="flex items-start gap-3">
          <div className="neo-icon-well w-10 h-10 shrink-0">
            <Plug className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Другие сервисы</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Произвольные ключи для будущих интеграций — станут доступны фронтенду сразу после сохранения.
            </p>

            {custom.length > 0 && (
              <div className="space-y-2 mt-3">
                {custom.map((row) => (
                  <div key={row.key} className="flex items-center gap-2 rounded-xl bg-neo neo-inset-2 px-3 py-2">
                    <span className="text-sm font-mono font-medium shrink-0">{row.key}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1 min-w-0 font-mono">{row.value}</span>
                    <button
                      type="button"
                      onClick={() => void removeCustom(row.key)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="service_api_key" className="sm:w-56 font-mono text-sm" />
              <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Значение" className="flex-1 font-mono text-sm" />
              <Button onClick={() => void addCustom()} disabled={!newKey.trim() || !newValue.trim()} variant="outline" className="rounded-xl shrink-0">
                <Plus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Integrations;
