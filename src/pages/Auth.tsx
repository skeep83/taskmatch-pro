import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";
import { useState } from "react";
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

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const desiredRole = (String(fd.get("role") || "client") as "client" | "pro" | "business");

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
          // If a role was saved during signup confirmation, try to attach it now
          const pendingRole = (localStorage.getItem("desired_role") as "client" | "pro" | "business" | null);
          if (pendingRole) {
            try {
              // Ensure role exists
              const { data: roles } = await supabase.from("user_roles").select("role");
              const hasRole = (roles || []).some((r: any) => r.role === pendingRole);
              if (!hasRole) {
                await supabase.from("user_roles").insert({ user_id: data.user.id, role: pendingRole });
              }
            } catch {
              /* ignore attach errors */
            } finally {
              localStorage.removeItem("desired_role");
            }
          }
          // Redirect by role priority: pro -> business -> client
          const { data: roles2 } = await supabase.from("user_roles").select("role");
          const roleList = (roles2 || []).map((r: any) => r.role);
          toast({ title: "Успешный вход", description: `Добро пожаловать, ${email}` });
          if (roleList.includes("pro")) navigate("/pro/dashboard", { replace: true });
          else if (roleList.includes("business")) navigate("/business/dashboard", { replace: true });
          else navigate("/dashboard", { replace: true });
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        if (data.session?.user?.id) {
          // Email confirmation disabled: attach role immediately
          await supabase.from("user_roles").insert({ user_id: data.session.user.id, role: desiredRole });
          toast({ title: "Аккаунт создан", description: "Роль назначена. Добро пожаловать!" });
          if (desiredRole === "pro") navigate("/pro/dashboard", { replace: true });
          else if (desiredRole === "business") navigate("/business/dashboard", { replace: true });
          else navigate("/dashboard", { replace: true });
        } else {
          // Most setups require email confirmation
          localStorage.setItem("desired_role", desiredRole);
          toast({ title: "Аккаунт создан", description: "Проверьте почту для подтверждения" });
          navigate("/", { replace: true });
        }
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
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
          </div>
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="role">Роль аккаунта</Label>
              <select id="role" name="role" defaultValue="client" className="w-full h-10 rounded-md border bg-background px-3">
                <option value="client">Клиент</option>
                <option value="pro">Специалист</option>
                <option value="business">Бизнес</option>
              </select>
            </div>
          )}
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
