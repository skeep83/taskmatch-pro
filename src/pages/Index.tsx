import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { FloatingCard } from "@/components/ui/floating-card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import { Wrench, Zap, Sparkles, Paintbrush, Package, Cog, ShieldCheck, Crown, Star, Rocket, Award } from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";

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
    <main className="relative min-h-screen overflow-hidden">
      <SignatureGradient />
      <Seo title={t("seo.home.title")} description={t("seo.home.desc")} canonical="/" jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ServiceHub",
        url: "/",
        potentialAction: {"@type":"SearchAction","target":"/catalog?q={search_term_string}","query-input":"required name=search_term_string"}
      }} />
      
      {/* Hero Section with Modern Design */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Text Content */}
            <div className="text-left lg:pr-8">
              <div className="mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <AnimatedIcon icon={Rocket} size={20} />
                  <span className="text-sm font-medium text-primary">Платформа нового поколения</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight">
                  <span className="text-gradient animate-gradient-shift">{t("hero.title")}</span>
                </h1>
                <p className="text-xl lg:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                  {t("hero.subtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Link to="/catalog" className="btn-hero text-lg px-8 py-4 animate-pulse-glow">
                  🔍 Найти специалиста
                </Link>
                <Link to="/auth" className="btn-ghost text-lg px-8 py-4 hover-scale">
                  💼 Стать исполнителем
                </Link>
                <Link to="/tenders" className="btn-ghost text-lg px-8 py-4 hover-scale">
                  🏢 Корпоративные тендеры
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-8 text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="flex items-center gap-2">
                  <AnimatedIcon icon={ShieldCheck} delayMs={0} />
                  <span className="text-sm font-medium">Безопасные платежи</span>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatedIcon icon={Zap} delayMs={150} />
                  <span className="text-sm font-medium">Мгновенные отклики</span>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatedIcon icon={Award} delayMs={300} />
                  <span className="text-sm font-medium">Проверенные специалисты</span>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="relative">
                <img 
                  src={heroDashboard} 
                  alt="ServiceHub Platform" 
                  className="w-full h-auto rounded-3xl shadow-2xl animate-float-slow"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-3xl" />
                
                {/* Floating Stats Cards */}
                <FloatingCard 
                  className="absolute -top-6 -left-6 p-4 w-56"
                  delay={600}
                  glow
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">25K+</div>
                    <div className="text-sm text-muted-foreground">Выполненных заказов</div>
                  </div>
                </FloatingCard>

                <FloatingCard 
                  className="absolute -bottom-6 -right-6 p-4 w-56"
                  delay={800}
                  glow
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent mb-1">4.9★</div>
                    <div className="text-sm text-muted-foreground">Средний рейтинг</div>
                  </div>
                </FloatingCard>

                <FloatingCard 
                  className="absolute -top-6 -right-6 p-4 w-48"
                  delay={700}
                  glow
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500 mb-1">98%</div>
                    <div className="text-sm text-muted-foreground">Довольных клиентов</div>
                  </div>
                </FloatingCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("section.categories")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Найдите нужного специалиста в любой сфере
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((c, index) => {
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
              <FloatingCard 
                key={c.key} 
                className="p-6 text-center cursor-pointer group"
                delay={index * 100}
                hover
              >
                <div className="mb-4">
                  <AnimatedIcon 
                    icon={IconCmp} 
                    size={40}
                    className="text-primary group-hover:scale-110 transition-transform" 
                    delayMs={index * 100}
                  />
                </div>
                <div className="font-semibold group-hover:text-primary transition-colors">
                  {c.label}
                </div>
              </FloatingCard>
            );
          })}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("section.testimonials")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Отзывы наших довольных клиентов
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { text: "Отличный сервис! Быстро нашли сантехника, который приехал в тот же день. Оплата через эскроу — полная безопасность.", author: "Мария, Москва", rating: 5 },
            { text: "Использую ServiceHub для поиска электриков. Всегда качественная работа и честные цены. Рекомендую!", author: "Дмитрий, СПб", rating: 5 },
            { text: "Удобная платформа для заказа услуг по дому. Специалисты проверенные, работают профессионально.", author: "Анна, Екатеринбург", rating: 5 }
          ].map((testimonial, index) => (
            <FloatingCard 
              key={index} 
              className="p-8 text-left"
              delay={index * 150}
              hover
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <AnimatedIcon 
                    key={i} 
                    icon={Star} 
                    size={16} 
                    className="text-amber-400"
                    delayMs={index * 150 + i * 50}
                  />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>
              <div className="font-semibold text-primary">
                {testimonial.author}
              </div>
            </FloatingCard>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;