import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [hasClient, setHasClient] = useState<boolean>(true);
  const [supabaseUrl, setSupabaseUrl] = useState<string>("");
  const [supabaseAnon, setSupabaseAnon] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        setHasClient(!!supabase?.auth);
      } catch {
        setHasClient(false);
      }
    })();
  }, []);
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    if (!email || !password) {
      toast({ title: "Проверьте поля", description: "Введите email и пароль", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      if (!supabase?.auth) throw new Error("Supabase client is unavailable. Please ensure integration is active.");
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
          toast({ title: "Успешный вход", description: `Добро пожаловать, ${email}` });
          navigate("/", { replace: true });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // В большинстве проектов включено подтверждение email
        toast({ title: "Аккаунт создан", description: "Проверьте почту для подтверждения" });
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Ошибка", description: err?.message || "Не удалось выполнить действие", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Auth`} description="Sign in or create an account" canonical="/auth" />
      <section className="max-w-xl mx-auto card-surface">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">{mode === 'signin' ? 'Войти' : 'Создать аккаунт'}</h1>
        </header>
        {!hasClient && (
          <aside className="mb-6 p-4 border rounded-md">
            <p className="text-sm mb-3">Клиент Supabase не найден. Если интеграция подключена, обновите страницу. Либо укажите URL и Public anon key вручную (сохраняется в вашем браузере):</p>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="sb-url">Supabase URL</Label>
                <Input id="sb-url" placeholder="https://xyzcompany.supabase.co" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sb-anon">Public anon key</Label>
                <Input id="sb-anon" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value={supabaseAnon} onChange={(e) => setSupabaseAnon(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { localStorage.setItem('supabase.url', supabaseUrl.trim()); localStorage.setItem('supabase.anon', supabaseAnon.trim()); location.reload(); }}>Сохранить и обновить</Button>
                <Button type="button" variant="ghost" onClick={() => { setSupabaseUrl(''); setSupabaseAnon(''); localStorage.removeItem('supabase.url'); localStorage.removeItem('supabase.anon'); }}>Очистить</Button>
              </div>
            </div>
          </aside>
        )}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Создать аккаунт' : 'У меня уже есть аккаунт'}
            </Button>
          </div>
        </form>
        <aside className="mt-4 text-sm text-muted-foreground">
          <p>
            Отправляя форму, вы соглашаетесь с условиями сервиса. 2FA будет доступна после входа в настройках аккаунта.
          </p>
        </aside>
      </section>
    </main>
  );
};

export default Auth;
