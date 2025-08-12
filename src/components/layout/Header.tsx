import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";

export const Header = () => {
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="w-full glass-nav sticky top-0 z-20">
      <nav className="container mx-auto flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2" aria-label={t("app.name")}> 
          <div className="h-8 w-8 rounded-md" style={{background: "var(--gradient-primary)"}} />
          <span className="font-semibold">{t("app.name")}</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/catalog" className="text-sm hover:opacity-80 transition-opacity">{t("nav.catalog")}</Link>
          <Link to="/job/new" className="text-sm hover:opacity-80 transition-opacity">{t("nav.find_pro")}</Link>
          <Link to="/dashboard" className="text-sm hover:opacity-80 transition-opacity">Кабинет</Link>
          <Link to="/pro/dashboard" className="text-sm hover:opacity-80 transition-opacity">PRO</Link>
          <Link to="/messages" className="text-sm hover:opacity-80 transition-opacity">Сообщения</Link>
        </div>
        <div className="flex items-center gap-3">
          <button aria-label="RU" className={`text-sm px-2 py-1 rounded-md border ${locale==='ru' ? 'opacity-100' : 'opacity-60'}`} onClick={() => setLocale('ru')}>
            {t("lang.ru")}
          </button>
          <button aria-label="RO" className={`text-sm px-2 py-1 rounded-md border ${locale==='ro' ? 'opacity-100' : 'opacity-60'}`} onClick={() => setLocale('ro')}>
            {t("lang.ro")}
          </button>
          <Link to="/auth" className="btn-ghost">{t("nav.sign_in")}</Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
