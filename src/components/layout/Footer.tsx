import { useEnhancedI18n } from "@/i18n/enhanced";

const Footer = () => {
  const { t } = useEnhancedI18n();
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto py-8 flex items-center justify-between text-sm">
        <p>{t("footer.rights")}</p>
        <div className="opacity-70">v1.0.0</div>
      </div>
    </footer>
  );
};

export default Footer;
