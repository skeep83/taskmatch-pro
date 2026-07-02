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
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [roleValue, setRoleValue] = useState<"client" | "pro" | "business">("client");

  const redirectAfterAuth = (path: string) => {
    window.location.replace(path);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const email = emailValue.trim();
    const password = passwordValue;
    const desiredRole = roleValue;

    if (!email || !password) {
      toast({ title: t("auth.error.fields"), description: t("auth.error.email_password"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
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
              const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
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
          // Redirect by role priority: admin -> pro -> business -> client
          const { data: roles2 } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
          const roleList = (roles2 || []).map((r: any) => r.role);
          toast({ title: t("auth.success.welcome"), description: `Добро пожаловать, ${email}` });
          if (roleList.some((role: string) => ['admin', 'superadmin', 'ops', 'kyc', 'finance', 'dispute_manager', 'content', 'risk', 'city_manager', 'tender'].includes(role))) redirectAfterAuth("/admin");
          else if (roleList.includes("pro")) redirectAfterAuth("/dashboard/pro");
          else if (roleList.includes("business")) redirectAfterAuth("/dashboard/business");
          else redirectAfterAuth("/dashboard/client");
        }
      } else {
        const { data: signupData, error: signupError } = await supabase.functions.invoke('public-signup', {
          body: {
            email,
            password,
            role: desiredRole,
          },
        });

        if (signupError) throw signupError;

        if (signupData?.session?.access_token && signupData?.session?.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: signupData.session.access_token,
            refresh_token: signupData.session.refresh_token,
          });
          if (sessionError) throw sessionError;

          localStorage.removeItem("desired_role");
          setPendingConfirmationEmail(null);
          toast({ title: t("auth.success.account_created"), description: t("dash.pro.welcome") });
          if (desiredRole === "pro") redirectAfterAuth("/dashboard/pro");
          else if (desiredRole === "business") redirectAfterAuth("/dashboard/business");
          else redirectAfterAuth("/dashboard/client");
        } else {
          const redirectUrl = `${window.location.origin}/`;
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectUrl },
          });
          if (error) throw error;
          if (data.session?.user?.id) {
            await supabase.from("user_roles").insert({ user_id: data.session.user.id, role: desiredRole });
            toast({ title: t("auth.success.account_created"), description: t("auth.success.role_assigned") });
            if (desiredRole === "pro") redirectAfterAuth("/dashboard/pro");
            else if (desiredRole === "business") redirectAfterAuth("/dashboard/business");
            else redirectAfterAuth("/dashboard/client");
          } else {
            localStorage.setItem("desired_role", desiredRole);
            setPendingConfirmationEmail(email);
            setMode("signin");
            setPasswordValue("");
            toast({
              title: t("auth.success.account_created"),
              description: t("ui.podtverdite_email_po_pismu"),
            });
          }
        }
      }
    } catch (err: any) {
      console.error(err);

      // Better error handling for authentication
      let errorMessage = err?.message || t("auth.error.action_failed");
      let errorTitle = t("notifications.error");

      if (err?.message?.includes("Invalid login credentials")) {
        errorTitle = t("ui.nevernye_dannye");
        errorMessage = t("ui.proverte_pravilnost_email_i");
      } else if (err?.message?.includes("Email not confirmed")) {
        errorTitle = t("ui.email_ne_podtverzhden");
        errorMessage = t("ui.proverte_pochtu_i_podtverdite");
      } else if (err?.message?.includes("User already registered")) {
        errorTitle = t("ui.polzovatel_uzhe_zaregistrirovan");
        errorMessage = t("ui.etot_email_uzhe_ispolzuetsia");
      } else if (err?.message?.includes("Password should be at least")) {
        errorTitle = t("ui.slabyi_parol");
        errorMessage = t("ui.parol_dolzhen_soderzhat_minimum");
      } else if (err?.message?.includes("email rate limit exceeded") || err?.code === "over_email_send_rate_limit") {
        errorTitle = t("ui.limit_pisem_ischerpan");
        errorMessage = t("ui.registraciia_vremenno_uperlas_v");
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!pendingConfirmationEmail) return;

    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingConfirmationEmail,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast({ title: t("ui.pismo_otpravleno_povtorno"), description: `Проверьте почту: ${pendingConfirmationEmail}` });
    } catch (err: any) {
      console.error(err);
      toast({ title: t("ui.ne_udalos_otpravit_pismo"), description: err?.message || t("ui.poprobuite_esche_raz_pozzhe"), variant: 'destructive' });
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
                {mode === 'signin' ? t("dash.pro.welcome") : t("auth.sign_up_btn")}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'signin'
                  ? t("auth.subtitle_sign_in")
                  : t("auth.subtitle_sign_up")
                }
              </p>
            </div>

            <form key={`${mode}-${pendingConfirmationEmail ?? 'none'}`} className="space-y-6" onSubmit={onSubmit}>
              {pendingConfirmationEmail && mode === 'signin' && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-3">
                  <div className="font-medium text-foreground">{t("ui.akkaunt_sozdan_podtverdite_email")}</div>
                  <div className="text-muted-foreground break-all">{pendingConfirmationEmail}</div>
                  <div className="text-muted-foreground">{t("ui.posle_podtverzhdeniia_vernites_siuda")}</div>
                  <Button type="button" variant="outline" className="w-full" onClick={resendConfirmation}>
                    Отправить письмо ещё раз
                  </Button>
                </div>
              )}

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
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
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
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
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
                    value={roleValue}
                    onChange={(e) => setRoleValue(e.target.value as "client" | "pro" | "business")}
                    className="w-full h-12 rounded-xl border-2 border-border/50 bg-background/80 px-4 text-lg focus:border-primary/50 transition-all"
                  >
                    <option value="client">{t("auth.account_client")}</option>
                    <option value="pro">{t("auth.account_pro")}</option>
                    <option value="business">{t("auth.account_business")}</option>
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
                      {t("auth.wait")}
                    </div>
                  ) : (
                    mode === 'signin' ? t("auth.sign_in_btn") : t("auth.sign_up_btn")
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setPendingConfirmationEmail(null);
                    setPasswordValue('');
                  }}
                  className="h-12 text-lg"
                >
                  {mode === 'signin' ? t("auth.toggle_sign_in") : t("auth.toggle_sign_up")}
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border/30 text-center animate-fade-in" style={{ animationDelay: '500ms' }}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Продолжая, вы соглашаетесь с нашими{' '}
                <span className="text-primary hover:underline cursor-pointer">{t("auth.terms_link")}</span>
                {' '}и{' '}
                <span className="text-primary hover:underline cursor-pointer">{t("auth.privacy_link")}</span>
              </p>
            </div>
          </GlassMorphism>
        </div>
      </div>
    </main>
  );
};

export default Auth;
