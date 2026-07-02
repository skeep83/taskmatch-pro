import { useEnhancedI18n } from "@/i18n/enhanced";
import { Link } from "react-router-dom";

const Footer = () => {
  const { t } = useEnhancedI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full mt-16 bg-neo neo-inset-2">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="text-lg font-display font-bold mb-3">ServiceHub</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("footer.about")}
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-foreground/80">{t("footer.clients")}</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/catalog" className="hover:text-primary transition-colors">{t("footer.catalog")}</Link></li>
              <li><Link to="/job/new" className="hover:text-primary transition-colors">{t("footer.create_job")}</Link></li>
              <li><Link to="/how-it-works" className="hover:text-primary transition-colors">{t("footer.how")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-foreground/80">{t("footer.pros")}</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/feed" className="hover:text-primary transition-colors">{t("footer.feed")}</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">{t("footer.signup")}</Link></li>
              <li><Link to="/hall-of-fame" className="hover:text-primary transition-colors">{t("footer.top_pros")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-foreground/80">{t("footer.companies")}</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/tenders" className="hover:text-primary transition-colors">{t("footer.tenders")}</Link></li>
              <li><Link to="/dashboard/business" className="hover:text-primary transition-colors">{t("footer.biz_cabinet")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>© {year} ServiceHub. {t("footer.rights")}</p>
          <div className="opacity-70">v1.0.0</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
