import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
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

const categories: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "plumbing", label: "Сантехника", icon: Wrench },
  { key: "electric", label: "Электрика", icon: Zap },
  { key: "cleaning", label: "Уборка", icon: Sparkles },
  { key: "appliance", label: "Бытовая техника", icon: Cog },
  { key: "painting", label: "Покраска", icon: Paintbrush },
  { key: "moving", label: "Переезды", icon: Package },
];

const steps = [
  {
    icon: ClipboardList,
    title: "Опишите задачу",
    text: "Создайте заказ за пару минут: категория, описание, бюджет и удобное время. Фотографии помогут специалистам точнее оценить работу.",
  },
  {
    icon: Users,
    title: "Сравните отклики",
    text: "Специалисты откликаются с ценой и сроками. Смотрите профили, рейтинги и отзывы — выбирайте не вслепую.",
  },
  {
    icon: CheckCircle2,
    title: "Завершите и оцените",
    text: "Общение, статусы и подтверждение результата — внутри карточки заказа. После завершения оставьте отзыв.",
  },
];

const audiences = [
  {
    icon: User,
    title: "Заказчикам",
    text: "Быстрый подбор проверенных специалистов, прозрачные цены и общение внутри платформы.",
    cta: "Создать заказ",
    to: "/job/new",
  },
  {
    icon: Briefcase,
    title: "Специалистам",
    text: "Поток заказов рядом с вами, честные отклики, портфолио и рейтинг, который работает на вас.",
    cta: "Стать исполнителем",
    to: "/auth",
  },
  {
    icon: Building2,
    title: "Компаниям",
    text: "Тендеры, команда с ролями, инвойсы и аналитика — бизнес-кабинет для регулярных задач.",
    cta: "Открыть бизнес-кабинет",
    to: "/tenders",
  },
];

const trustChips = [
  { icon: ShieldCheck, label: "Оплата через платформу" },
  { icon: MessageSquare, label: "Чат внутри заказа" },
  { icon: Star, label: "Рейтинги и отзывы" },
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

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <div className="text-left lg:pr-8">
              <div className="mb-8 animate-fade-in">
                <div className="neo-chip inline-flex items-center gap-2 px-4 py-2 mb-6">
                  <Sparkles size={18} className="text-primary" />
                  <span className="text-sm font-medium text-primary">Платформа заказа услуг</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight">
                  <span className="text-gradient animate-gradient-shift">{t("hero.title")}</span>
                </h1>
                <p className="text-xl lg:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                  {t("hero.subtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <Link to="/catalog" className="neo-btn-primary px-8 py-4 text-lg">
                  Найти исполнителя
                  <ArrowRight size={20} />
                </Link>
                <Link to="/job/new" className="neo-btn px-8 py-4 text-lg">
                  Создать заказ
                </Link>
                <Link to="/tenders" className="neo-btn px-8 py-4 text-lg">
                  Для компаний
                </Link>
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground animate-fade-in" style={{ animationDelay: "400ms" }}>
                {trustChips.map(({ icon: Icon, label }) => (
                  <div key={label} className="neo-chip px-5 py-3 flex items-center gap-3">
                    <Icon size={20} className="text-primary" />
                    <span className="text-sm font-medium text-foreground/80">{label}</span>
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
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            {t("section.categories")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Выберите категорию — или сразу создайте заказ, если знаете, что нужно
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((c, index) => (
            <Link
              key={c.key}
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
                {c.label}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Как это работает
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Три шага от задачи до результата — всё внутри платформы
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="neo-card p-8 text-left">
              <div className="flex items-center gap-4 mb-6">
                <div className="neo-icon-well w-14 h-14">
                  <step.icon size={26} className="text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Шаг {index + 1}</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/how-it-works" className="neo-btn px-6 py-3">
            Подробнее о процессе
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Audiences */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Кому подходит ServiceHub
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Один сервис для заказчиков, специалистов и компаний
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {audiences.map((a) => (
            <div key={a.title} className="neo-card p-8 flex flex-col">
              <div className="neo-icon-well w-16 h-16 mb-6">
                <a.icon size={28} className="text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{a.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-8 flex-1">{a.text}</p>
              <Link to={a.to} className="neo-btn px-6 py-3 self-start">
                {a.cta}
                <ArrowRight size={18} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto py-24 px-6">
        <div className="neo-card p-10 lg:p-14 text-center max-w-5xl mx-auto">
          <div className="neo-chip inline-flex items-center gap-2 px-4 py-2 mb-6">
            <Sparkles size={18} className="text-primary" />
            <span className="text-sm font-medium text-primary">Готовы начать?</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Ваш следующий шаг — один клик
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Найдите исполнителя в каталоге или опишите задачу — первые отклики обычно приходят в течение часа.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/catalog" className="neo-btn-primary px-8 py-4 text-lg">
              Найти исполнителя
              <ArrowRight size={20} />
            </Link>
            <Link to="/job/new" className="neo-btn px-8 py-4 text-lg">
              Создать заказ
            </Link>
            <Link to="/tenders" className="neo-btn px-8 py-4 text-lg">
              Для компаний
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
