import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { AmbientBackground } from "@/components/AmbientBackground";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { ResponsiveComponent } from "@/components/ResponsiveComponent";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Link } from "react-router-dom";
import {
  Wrench, Zap, Sparkles, Paintbrush, Package, Cog,
  ShieldCheck, MessageSquare, Star, Building2, User, Briefcase,
  ClipboardList, Users, CheckCircle2, ArrowRight, type LucideIcon,
} from "lucide-react";
import { HeroShowcase } from "@/components/HeroShowcase";
import { Reveal } from "@/components/Reveal";

const categories: { key: string; labelKey: string; icon: LucideIcon }[] = [
  { key: "plumbing", labelKey: "landing.cat_plumbing", icon: Wrench },
  { key: "electric", labelKey: "landing.cat_electric", icon: Zap },
  { key: "cleaning", labelKey: "landing.cat_cleaning", icon: Sparkles },
  { key: "appliance", labelKey: "landing.cat_appliance", icon: Cog },
  { key: "painting", labelKey: "landing.cat_painting", icon: Paintbrush },
  { key: "moving", labelKey: "landing.cat_moving", icon: Package },
];

const steps = [
  { icon: ClipboardList, titleKey: "landing.step1_title", textKey: "landing.step1_text" },
  { icon: Users, titleKey: "landing.step2_title", textKey: "landing.step2_text" },
  { icon: CheckCircle2, titleKey: "landing.step3_title", textKey: "landing.step3_text" },
];

const audiences = [
  { icon: User, titleKey: "landing.aud1_title", textKey: "landing.aud1_text", ctaKey: "landing.aud1_cta", to: "/job/new" },
  { icon: Briefcase, titleKey: "landing.aud2_title", textKey: "landing.aud2_text", ctaKey: "landing.aud2_cta", to: "/auth" },
  { icon: Building2, titleKey: "landing.aud3_title", textKey: "landing.aud3_text", ctaKey: "landing.aud3_cta", to: "/tenders" },
];

const trustChips = [
  { icon: ShieldCheck, labelKey: "landing.trust_pay" },
  { icon: MessageSquare, labelKey: "landing.trust_chat" },
  { icon: Star, labelKey: "landing.trust_ratings" },
];

const DesktopIndex = () => {
  const { t } = useEnhancedI18n();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <SignatureGradient />
      <AmbientBackground />
      <Seo title={t("seo.home.title")} description={t("seo.home.desc")} canonical="/" jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ServiceHub",
        url: "/",
        potentialAction: {"@type":"SearchAction","target":"/catalog?q={search_term_string}","query-input":"required name=search_term_string"}
      }} />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <div className="text-left lg:pr-8">
              <div className="mb-8 animate-fade-in">
                <div className="neo-chip inline-flex items-center gap-2 px-4 py-2 mb-6">
                  <Sparkles size={18} className="text-primary" />
                  <span className="text-sm font-medium text-primary">{t("landing.badge")}</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight">
                  <span className="text-gradient animate-gradient-shift">{t("hero.title")}</span>
                </h1>
                <p className="text-xl lg:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                  {t("hero.subtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <Link to="/catalog" className="neo-btn-primary btn-sheen px-8 py-4 text-lg">
                  {t("landing.cta_find")}
                  <ArrowRight size={20} />
                </Link>
                <Link to="/job/new" className="neo-btn px-8 py-4 text-lg">
                  {t("landing.cta_create")}
                </Link>
                <Link to="/tenders" className="neo-btn px-8 py-4 text-lg">
                  {t("landing.cta_business")}
                </Link>
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground animate-fade-in" style={{ animationDelay: "400ms" }}>
                {trustChips.map(({ icon: Icon, labelKey }) => (
                  <div key={labelKey} className="neo-chip px-5 py-3 flex items-center gap-3">
                    <Icon size={20} className="text-primary" />
                    <span className="text-sm font-medium text-foreground/80">{t(labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual — live product mockup */}
            <div className="relative animate-fade-in w-full pb-10" style={{ animationDelay: "300ms" }}>
              <HeroShowcase />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto py-24 px-6">
        <Reveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("section.categories")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landing.categories_desc")}
          </p>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((c, index) => (
            <Reveal key={c.key} delay={index * 70}>
            <Link
              to={`/catalog?category=${c.key}`}
              className="neo-card neo-card-interactive p-6 text-center group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-4">
                <NeumorphicIcon
                  icon={c.icon}
                  size={96}
                  variant="square"
                  className="group-hover:scale-105 transition-transform mx-auto"
                  delayMs={index * 100}
                />
              </div>
              <div className="font-semibold group-hover:text-primary transition-colors">
                {t(c.labelKey)}
              </div>
            </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto py-24 px-6">
        <Reveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("landing.how_title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landing.how_desc")}
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Reveal key={step.titleKey} delay={index * 120}>
            <div className="neo-card neo-aura p-8 text-left h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="neo-icon-well w-14 h-14">
                  <step.icon size={26} className="text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">{t("landing.step")} {index + 1}</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">{t(step.titleKey)}</h3>
              <p className="text-muted-foreground leading-relaxed">{t(step.textKey)}</p>
            </div>
            </Reveal>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/how-it-works" className="neo-btn px-6 py-3">
            {t("landing.how_more")}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Audiences */}
      <section className="container mx-auto py-24 px-6">
        <Reveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("landing.aud_title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landing.aud_desc")}
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          {audiences.map((a, index) => (
            <Reveal key={a.titleKey} delay={index * 120} className="h-full">
            <div className="neo-card neo-aura p-8 flex flex-col h-full">
              <div className="neo-icon-well w-16 h-16 mb-6">
                <a.icon size={28} className="text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{t(a.titleKey)}</h3>
              <p className="text-muted-foreground leading-relaxed mb-8 flex-1">{t(a.textKey)}</p>
              <Link to={a.to} className="neo-btn px-6 py-3 self-start">
                {t(a.ctaKey)}
                <ArrowRight size={18} />
              </Link>
            </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto py-24 px-6">
        <Reveal>
        <div className="neo-card neo-aura p-10 lg:p-14 text-center max-w-5xl mx-auto">
          <div className="neo-chip inline-flex items-center gap-2 px-4 py-2 mb-6">
            <Sparkles size={18} className="text-primary" />
            <span className="text-sm font-medium text-primary">{t("landing.final_badge")}</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("landing.final_title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            {t("landing.final_desc")}
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/catalog" className="neo-btn-primary btn-sheen px-8 py-4 text-lg">
              {t("landing.cta_find")}
              <ArrowRight size={20} />
            </Link>
            <Link to="/job/new" className="neo-btn px-8 py-4 text-lg">
              {t("landing.cta_create")}
            </Link>
            <Link to="/tenders" className="neo-btn px-8 py-4 text-lg">
              {t("landing.cta_business")}
            </Link>
          </div>
        </div>
        </Reveal>
      </section>
    </main>
  );
};

// Use ResponsiveComponent to automatically load mobile or desktop version
const IndexContent = () => (
  <ResponsiveComponent
    mobile={() => import("@/mobile/pages/MobileIndex")}
    desktop={() => Promise.resolve({ default: DesktopIndex })}
  />
);

export default function Index() {
  return <IndexContent />;
}
