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
              Платформа заказа услуг: проверенные специалисты, безопасные сделки и общение внутри заказа.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-foreground/80">Заказчикам</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/catalog" className="hover:text-primary transition-colors">Каталог услуг</Link></li>
              <li><Link to="/job/new" className="hover:text-primary transition-colors">Создать заказ</Link></li>
              <li><Link to="/how-it-works" className="hover:text-primary transition-colors">Как это работает</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-foreground/80">Специалистам</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/feed" className="hover:text-primary transition-colors">Лента заказов</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Регистрация</Link></li>
              <li><Link to="/hall-of-fame" className="hover:text-primary transition-colors">Лучшие специалисты</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3 text-foreground/80">Компаниям</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/tenders" className="hover:text-primary transition-colors">Тендеры</Link></li>
              <li><Link to="/dashboard/business" className="hover:text-primary transition-colors">Бизнес-кабинет</Link></li>
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
