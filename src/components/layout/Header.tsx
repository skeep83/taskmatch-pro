import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";

export const Header = () => {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthed(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
    navigate("/");
  };

  return (
    <header className="w-full glass-nav sticky top-0 z-50">
      <nav className="container mx-auto flex items-center justify-between py-4 px-6">
        <Link to="/" className="flex items-center gap-3 group" aria-label={t("app.name")}> 
          <div 
            className="h-10 w-10 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" 
            style={{background: "var(--gradient-primary)"}} 
          />
          <span className="text-xl font-display font-bold text-gradient">{t("app.name")}</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/how-it-works" className="text-sm font-medium hover:text-primary transition-colors story-link">
            Как это работает
          </Link>
          <Link to="/catalog" className="text-sm font-medium hover:text-primary transition-colors story-link">
            {t("nav.catalog")}
          </Link>
          <Link to="/job/new" className="text-sm font-medium hover:text-primary transition-colors story-link">
            {t("nav.find_pro")}
          </Link>
          <Link to="/feed" className="text-sm font-medium hover:text-primary transition-colors story-link">
            {t("nav.feed")}
          </Link>
          <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors story-link">
            {t("nav.dashboard")}
          </Link>
          <Link to="/pro/dashboard" className="text-sm font-medium hover:text-primary transition-colors story-link">
            {t("nav.pro")}
          </Link>
          <Link to="/messages" className="text-sm font-medium hover:text-primary transition-colors story-link">
            {t("nav.messages")}
          </Link>
          <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors story-link">
            {t("nav.admin")}
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <button 
              aria-label="RU" 
              className={`text-sm px-3 py-1.5 rounded-md font-medium transition-all ${
                locale==='ru' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`} 
              onClick={() => setLocale('ru')}
            >
              {t("lang.ru")}
            </button>
            <button 
              aria-label="RO" 
              className={`text-sm px-3 py-1.5 rounded-md font-medium transition-all ${
                locale==='ro' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`} 
              onClick={() => setLocale('ro')}
            >
              {t("lang.ro")}
            </button>
          </div>
          
          {authed ? (
            <button onClick={signOut} className="btn-ghost">
              {t("nav.sign_out")}
            </button>
          ) : (
            <Link to="/auth" className="btn-hero">
              {t("nav.sign_in")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
