import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { RoleSwitcher } from "@/components/RoleSwitcher";

export const Header = () => {
  const { t, changeLanguage, language } = useEnhancedI18n();
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
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0" aria-label={t("app.name")}> 
          <div 
            className="h-10 w-10 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" 
            style={{background: "var(--gradient-primary)"}} 
          />
          <span className="text-xl font-display font-bold text-gradient">{t("app.name")}</span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-6">
          <Link to="/how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
            {t("nav.how_it_works")}
          </Link>
          <Link to="/catalog" className="text-sm font-medium hover:text-primary transition-colors">
            {t("nav.catalog")}
          </Link>
          <Link to="/job/new" className="text-sm font-medium hover:text-primary transition-colors">
            {t("nav.find_pro")}
          </Link>
          <Link to="/feed" className="text-sm font-medium hover:text-primary transition-colors">
            {t("nav.feed")}
          </Link>
          <Link to="/messages" className="text-sm font-medium hover:text-primary transition-colors">
            {t("nav.messages")}
          </Link>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <button 
              aria-label="Русский" 
              className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${
                language==='ru' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`} 
              onClick={() => changeLanguage('ru')}
            >
              RU
            </button>
            <button 
              aria-label="Română" 
              className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${
                language==='ro' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`} 
              onClick={() => changeLanguage('ro')}
            >
              RO
            </button>
          </div>
          
          {authed && <NotificationCenter />}
          {authed && <RoleSwitcher />}
          
          {authed ? (
            <button onClick={signOut} className="btn-ghost text-sm">
              Выход
            </button>
          ) : (
            <Link to="/auth" className="btn-hero text-sm">
              Вход
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
