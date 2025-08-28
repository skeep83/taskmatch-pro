import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { FloatingCard } from "@/components/ui/floating-card";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
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
  const { t } = useEnhancedI18n();

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
                  <NeumorphicIcon icon={Rocket} size={56} variant="square" />
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
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Безопасные платежи</span>
                </div>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Мгновенные отклики</span>
                </div>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Проверенные специалисты</span>
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
                <div 
                  className="card-surface absolute -top-6 -left-6 p-4 w-56"
                  style={{ animationDelay: '600ms' }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">25K+</div>
                    <div className="text-sm text-muted-foreground">Выполненных заказов</div>
                  </div>
                </div>

                <div 
                  className="card-surface absolute -bottom-6 -right-6 p-4 w-56"
                  style={{ animationDelay: '800ms' }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent mb-1">4.9★</div>
                    <div className="text-sm text-muted-foreground">Средний рейтинг</div>
                  </div>
                </div>

                <div 
                  className="card-surface absolute -top-6 -right-6 p-4 w-48"
                  style={{ animationDelay: '700ms' }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500 mb-1">98%</div>
                    <div className="text-sm text-muted-foreground">Довольных клиентов</div>
                  </div>
                </div>
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
              <div 
                key={c.key} 
                className="card-surface p-6 text-center cursor-pointer group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4">
                  <NeumorphicIcon 
                    icon={IconCmp} 
                    size={112}
                    variant="square"
                    className="group-hover:scale-110 transition-transform mx-auto" 
                    delayMs={index * 100}
                  />
                </div>
                <div className="font-semibold group-hover:text-primary transition-colors">
                  {c.label}
                </div>
              </div>
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
            <div 
              key={index} 
              className="bg-white dark:bg-white/5 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-white/10 text-left animate-fade-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={20}
                    className="text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed text-lg">
                "{testimonial.text}"
              </p>
              <div className="font-semibold text-primary text-lg">
                {testimonial.author}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;