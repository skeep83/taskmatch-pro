import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import { Wrench, Zap, Sparkles, Paintbrush, Package, Cog, ShieldCheck, Crown } from "lucide-react";
import AnimatedIcon from "@/components/ui/animated-icon";

const categories = [
  { key: "plumbing", label: "Сантехника" },
  { key: "electric", label: "Электрика" },
  { key: "cleaning", label: "Уборка" },
  { key: "appliance", label: "Бытовая техника" },
  { key: "painting", label: "Покраска" },
  { key: "moving", label: "Переезды" },
];

const Index = () => {
  const { t } = useI18n();

  return (
    <main>
      <Seo title={t("seo.home.title")} description={t("seo.home.desc")} canonical="/" jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ServiceHub",
        url: "/",
        potentialAction: {"@type":"SearchAction","target":"/catalog?q={search_term_string}","query-input":"required name=search_term_string"}
      }} />
      <section className="relative overflow-hidden">
        <div className="container mx-auto py-20 md:py-28 text-center">
          <SignatureGradient />
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-balance animate-fade-in">
            <span className="text-gradient">{t("hero.title")}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in">
            {t("hero.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/job/new" className="btn-hero">{t("hero.cta_primary")}</Link>
            <Link to="/pro" className="btn-ghost">{t("hero.cta_secondary")}</Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-muted-foreground">
            <AnimatedIcon icon={ShieldCheck} delayMs={0} />
            <AnimatedIcon icon={Zap} delayMs={150} />
            <AnimatedIcon icon={Crown} delayMs={300} />
          </div>
        </div>
      </section>

      <section className="container mx-auto py-12">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">{t("section.categories")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((c) => {
            const iconsByKey: Record<string, any> = {
              plumbing: Wrench,
              electric: Zap,
              cleaning: Sparkles,
              appliance: Cog,
              painting: Paintbrush,
              moving: Package,
            };
            const IconCmp = iconsByKey[c.key] || Sparkles;
            return (
              <div key={c.key} className="card-surface text-center hover:shadow-lg transition-shadow hover-scale">
                <IconCmp className="mx-auto h-7 w-7 text-primary animate-float-slow" aria-hidden />
                <div className="text-sm font-medium mt-2">{c.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto py-12">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">{t("section.testimonials")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[1,2,3].map((i)=> (
            <article key={i} className="card-surface text-left">
              <p className="text-sm text-muted-foreground">“Отличный сервис, приехали вовремя, все починили, оплата через эскроу — спокойно и безопасно.”</p>
              <div className="mt-4 text-sm font-medium">Мария, Москва</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;
