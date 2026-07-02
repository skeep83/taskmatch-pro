import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { ResponsiveComponent } from "@/components/ResponsiveComponent";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Link } from "react-router-dom";
import { Wrench, Zap, Sparkles, Paintbrush, Package, Cog, ShieldCheck, Rocket, Award, type LucideIcon } from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";

const categories = [
  { key: "plumbing", label: "Сантехника" },
  { key: "electric", label: "Электрика" },
  { key: "cleaning", label: "Уборка" },
  { key: "appliance", label: "Бытовая техника" },
  { key: "painting", label: "Покраска" },
  { key: "moving", label: "Переезды" },
];

const landingSteps = [
  {
    step: 'Шаг 1',
    title: 'Выберите понятный вход в сервис',
    text: 'Начните с каталога, создания заказа или бизнес-контура — в зависимости от того, что вам нужно прямо сейчас.'
  },
  {
    step: 'Шаг 2',
    title: 'Получите отклики и сравните варианты',
    text: 'После публикации заказа можно сравнить предложения, профили и отзывы, а не принимать решение вслепую.'
  },
  {
    step: 'Шаг 3',
    title: 'Доведите задачу до результата внутри платформы',
    text: 'Статусы, сообщения и подтверждение завершения лучше сохранять в карточке заказа, а не в разрозненных каналах.'
  }
];

const DesktopIndex = () => {
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
                  <Rocket size={24} className="text-primary" />
                  <span className="text-sm font-medium text-primary">Платформа заказа услуг</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight">
                  <span className="text-gradient animate-gradient-shift">{t("hero.title")}</span>
                </h1>
                <p className="text-xl lg:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                  {t("hero.subtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Link to="/catalog" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
                  🔍 Найти исполнителя
                </Link>
                <Link to="/auth" className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
                  💼 Я исполнитель
                </Link>
                <Link to="/tenders" className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
                  🏢 Для компании
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center gap-3">
                  <ShieldCheck size={24} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Оплата по сценарию заказа</span>
                </div>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center gap-3">
                  <Zap size={24} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Отклики по задаче</span>
                </div>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center gap-3">
                  <Award size={24} className="text-amber-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Профили и отзывы</span>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="relative animate-fade-in max-w-[612px] w-full mx-auto" style={{ animationDelay: '300ms', maxHeight: '408px' }}>
              <div className="relative hero-image-container">
                <img
                  src={heroDashboard}
                  alt="ServiceHub Platform"
                  className="w-full h-auto rounded-3xl shadow-2xl animate-float-slow"
                  loading="eager"
                  fetchPriority="high"
                  width="612"
                  height="408"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 50vw, 612px"
                  decoding="async"
                  style={{
                    maxWidth: '612px',
                    width: '100%',
                    height: 'auto',
                    objectFit: 'cover',
                    aspectRatio: '612/408',
                    maxHeight: '408px'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-3xl" />

                {/* Floating Stats Cards */}
                <div
                  className="card-surface absolute -top-6 -left-6 p-4 w-56"
                  style={{ animationDelay: '600ms' }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">Каталог</div>
                    <div className="text-sm text-muted-foreground">Поиск исполнителя по категории</div>
                  </div>
                </div>

                <div
                  className="card-surface absolute -bottom-6 -right-6 p-4 w-56"
                  style={{ animationDelay: '800ms' }}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent mb-1">Отклики</div>
                    <div className="text-sm text-muted-foreground">После публикации заказа</div>
                  </div>
                </div>

                <div
                  className="card-surface absolute -top-6 -right-6 p-4 w-48"
                  style={{ animationDelay: '700ms' }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500 mb-1">Чат</div>
                    <div className="text-sm text-muted-foreground">Контекст внутри заказа</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works / role orientation */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Начните с понятного сценария
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Landing должен сразу объяснять человеку, какой у него первый шаг: найти исполнителя, создать заказ или перейти в бизнес-контур.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {landingSteps.map((step) => (
            <div key={step.title} className="card-surface p-8 text-left">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
                {step.step}
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">{step.title}</h3>
              <p className="text-foreground/80 leading-relaxed text-lg">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("section.categories")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Найдите подходящего исполнителя по категории или начните с создания заказа
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((c, index) => {
            const iconsByKey: Record<string, LucideIcon> = {
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

      {/* Home Scenarios Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Как используют ServiceHub
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Не рейтинги и обещания, а три базовых сценария текущего продукта
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Поиск исполнителя',
              text: 'Откройте каталог, выберите категорию, сравните профили, отзывы и примеры работ перед тем, как создавать заказ.'
            },
            {
              title: 'Создание заказа',
              text: 'Опишите задачу, приложите детали и дождитесь откликов. Доступность исполнителей зависит от категории и времени публикации.'
            },
            {
              title: 'Согласование в заказе',
              text: 'Дальнейшее общение, уточнения и рабочий контекст лучше вести внутри заказа, а не через разрозненные внешние каналы.'
            }
          ].map((scenario, index) => (
            <div
              key={scenario.title}
              className="card-surface p-8 text-left"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
                Сценарий {index + 1}
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">{scenario.title}</h3>
              <p className="text-foreground/80 leading-relaxed text-lg">{scenario.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto py-24 px-6">
        <div className="card-surface p-10 lg:p-14 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
            Готовы начать?
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Выберите ближайший следующий шаг
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Не обязательно разбираться во всех разделах сразу. Начните с действия, которое ближе всего к вашей задаче сегодня.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/catalog" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
              Найти исполнителя
            </Link>
            <Link to="/job/new" className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
              Создать заказ
            </Link>
            <Link to="/tenders" className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
              Для компании
            </Link>
          </div>
        </div>
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