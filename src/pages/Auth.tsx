import { Seo } from "@/components/Seo";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, User, Shield, Eye, EyeOff } from "lucide-react";
import authBg from "@/assets/auth-bg.jpg";

const Auth = () => {
  const { t } = useEnhancedI18n();
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
          if (roleList.includes("pro")) navigate("/dashboard/pro", { replace: true });
          else if (roleList.includes("business")) navigate("/dashboard/business", { replace: true });
          else navigate("/dashboard/client", { replace: true });
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
          if (desiredRole === "pro") navigate("/dashboard/pro", { replace: true });
          else if (desiredRole === "business") navigate("/dashboard/business", { replace: true });
          else navigate("/dashboard/client", { replace: true });
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

  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${authBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      
      <Seo title={`${t('app.name')} — Auth`} description="Sign in or create an account" canonical="/auth" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-lg mx-auto">
          <GlassMorphism intensity="strong" variant="bordered" className="p-8 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mb-6">
                <AnimatedIcon 
                  icon={mode === 'signin' ? Lock : Shield} 
                  size={48} 
                  className="text-primary animate-pulse-glow"
                />
              </div>
              <h1 className="text-3xl font-display font-bold mb-2 text-gradient">
                {mode === 'signin' ? 'Добро пожаловать!' : 'Создать аккаунт'}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'signin' 
                  ? 'Войдите в свой аккаунт ServiceHub' 
                  : 'Присоединяйтесь к ServiceHub сегодня'
                }
              </p>
            </div>

            <form className="space-y-6" onSubmit={onSubmit}>
              {/* Email Field */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                  <AnimatedIcon icon={Mail} size={16} />
                  Email адрес
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  autoComplete="email" 
                  required 
                  className="h-12 px-4 text-lg border-2 border-border/50 focus:border-primary/50 transition-all"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Label htmlFor="password" className="flex items-center gap-2 font-medium">
                  <AnimatedIcon icon={Lock} size={16} />
                  Пароль
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} 
                    required 
                    className="h-12 px-4 pr-12 text-lg border-2 border-border/50 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <AnimatedIcon icon={showPassword ? EyeOff : Eye} size={20} />
                  </button>
                </div>
              </div>

              {/* Role Selection for Signup */}
              {mode === 'signup' && (
                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <Label htmlFor="role" className="flex items-center gap-2 font-medium">
                    <AnimatedIcon icon={User} size={16} />
                    Тип аккаунта
                  </Label>
                  <select 
                    id="role" 
                    name="role" 
                    defaultValue="client" 
                    className="w-full h-12 rounded-xl border-2 border-border/50 bg-background/80 px-4 text-lg focus:border-primary/50 transition-all"
                  >
                    <option value="client">Клиент — заказываю услуги</option>
                    <option value="pro">Специалист — выполняю заказы</option>
                    <option value="business">Бизнес — корпоративный аккаунт</option>
                  </select>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col gap-4 pt-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="h-12 text-lg btn-hero w-full"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Подождите…
                    </div>
                  ) : (
                    mode === 'signin' ? 'Войти в аккаунт' : 'Создать аккаунт'
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="h-12 text-lg"
                >
                  {mode === 'signin' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border/30 text-center animate-fade-in" style={{ animationDelay: '500ms' }}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Продолжая, вы соглашаетесь с нашими{' '}
                <span className="text-primary hover:underline cursor-pointer">условиями использования</span>
                {' '}и{' '}
                <span className="text-primary hover:underline cursor-pointer">политикой конфиденциальности</span>
              </p>
            </div>
          </GlassMorphism>
        </div>
      </div>
    </main>
  );
};

export default Auth;
