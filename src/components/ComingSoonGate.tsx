import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, ArrowRight, Loader2, Sparkles, ShieldCheck, Star, MessageSquare } from "lucide-react";

const STORAGE_KEY = "sh_gate_pass";

const sha256Hex = async (text: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const parse = (v: unknown): unknown => (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v);

/**
 * Pre-launch gate. When enabled in admin settings, visitors see a
 * polished coming-soon screen; testers unlock the site with a password
 * (SHA-256 compared client-side, remembered in localStorage).
 */
export const ComingSoonGate = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<"loading" | "locked" | "open">("loading");
  const [hash, setHash] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("key, value")
          .eq("category", "site");
        const map: Record<string, unknown> = {};
        (data || []).forEach((r) => { map[r.key] = parse(r.value); });
        const enabled = map.coming_soon_enabled === true;
        const h = String(map.site_password_hash || "");
        setHash(h);
        if (!enabled || !h) { setState("open"); return; }
        setState(localStorage.getItem(STORAGE_KEY) === h ? "open" : "locked");
      } catch {
        setState("open"); // never lock users out on a settings error
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setChecking(true);
    setError(false);
    const h = await sha256Hex(input.trim());
    if (h === hash) {
      localStorage.setItem(STORAGE_KEY, h);
      setState("open");
    } else {
      setError(true);
    }
    setChecking(false);
  };

  if (state === "open") return <>{children}</>;
  if (state === "loading") return <div className="min-h-screen bg-neo" />;

  return (
    <div className="min-h-screen bg-neo flex items-center justify-center px-4 relative overflow-hidden">
      {/* soft ambient blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="neo-card p-8 md:p-10 text-center">
          <div className="neo-icon-well w-16 h-16 mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-4">
            Скоро запуск · În curând
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-3">ServiceHub</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Маркетплейс услуг Молдовы: проверенные специалисты, безопасные сделки и отзывы с фото.
          </p>
          <p className="text-xs text-muted-foreground/80 leading-relaxed mt-1.5">
            Piața serviciilor din Moldova: specialiști verificați, tranzacții sigure și recenzii cu fotografii.
          </p>

          <div className="flex items-center justify-center gap-5 mt-6 mb-8 text-muted-foreground">
            <span className="flex flex-col items-center gap-1.5 text-[11px]"><span className="neo-icon-well w-9 h-9"><ShieldCheck className="w-4 h-4 text-primary" /></span>Эскроу</span>
            <span className="flex flex-col items-center gap-1.5 text-[11px]"><span className="neo-icon-well w-9 h-9"><Star className="w-4 h-4 text-primary" /></span>Рейтинги</span>
            <span className="flex flex-col items-center gap-1.5 text-[11px]"><span className="neo-icon-well w-9 h-9"><MessageSquare className="w-4 h-4 text-primary" /></span>Чат</span>
          </div>

          <form onSubmit={submit}>
            <label className="block text-xs font-medium text-muted-foreground mb-2 text-left">
              Доступ для тестировщиков · Acces pentru testeri
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError(false); }}
                  placeholder="Пароль"
                  autoComplete="off"
                  className="w-full bg-neo neo-inset-4 border-none rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                type="submit"
                disabled={checking || !input.trim()}
                aria-label="Войти"
                className="neo-btn-primary w-12 h-12 !p-0 rounded-xl inline-flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive mt-2 text-left">Неверный пароль · Parolă incorectă</p>}
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          © {new Date().getFullYear()} ServiceHub
        </p>
      </div>
    </div>
  );
};
