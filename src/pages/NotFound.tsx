import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();
  const { t } = useEnhancedI18n();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <Seo title={`${t('app.name')} — ${t('common.page_not_found')}`} description={t('common.page_not_found')} canonical="/404" />
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-foreground mb-4">{t('common.page_not_found_message')}</p>
          <Link to="/" className="btn-ghost">{t('common.return_home')}</Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;
