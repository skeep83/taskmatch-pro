import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";

const Auth = () => {
  const { t } = useI18n();
  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Auth`} description="Sign in or create an account" canonical="/auth" />
      <section className="max-w-xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-6">Войти</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className="w-full border rounded-md px-3 py-2 bg-background" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">Пароль</label>
            <input type="password" className="w-full border rounded-md px-3 py-2 bg-background" placeholder="••••••••" />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" className="btn-hero">Войти</button>
            <button type="button" className="btn-ghost">Создать аккаунт</button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Auth;
