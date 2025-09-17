import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Rocket, 
  Shield, 
  Clock, 
  Users, 
  CheckCircle,
  TrendingUp,
  Smartphone,
  Globe
} from "lucide-react";
import { SignatureGradient } from "@/components/SignatureGradient";
import { Seo } from "@/components/Seo";
import { Icon3D } from "@/components/ui/Icon3D";

// Images
import heroDashboard from "@/assets/hero-dashboard.jpg";
import anaChisinau from "@/assets/testimonials/ana-chisinau.jpg";
import ionBalti from "@/assets/testimonials/ion-balti.jpg";
import elenaCahul from "@/assets/testimonials/elena-cahul.jpg";

const features = [
  {
    icon: Shield,
    title: "Безопасные платежи",
    description: "Эскроу-система защищает ваши средства до полного завершения работ"
  },
  {
    icon: Clock,
    title: "Быстрые отклики",
    description: "Специалисты откликаются в течение нескольких минут"
  },
  {
    icon: Users,
    title: "Проверенные мастера",
    description: "Все специалисты проходят верификацию и имеют рейтинг"
  },
  {
    icon: CheckCircle,
    title: "Гарантия качества",
    description: "Система отзывов и гарантий на выполненные работы"
  },
  {
    icon: TrendingUp,
    title: "Умное ценообразование",
    description: "AI-алгоритмы помогают найти оптимальную цену"
  },
  {
    icon: Smartphone,
    title: "Мобильное приложение",
    description: "Управляйте заказами из любой точки мира"
  }
];

const categories = [
  { name: "Сантехника", iconKey: "pipeWrench" as const, count: 150 },
  { name: "Электрика", iconKey: "hammerWrench" as const, count: 120 },
  { name: "Уборка", iconKey: "broomBucket" as const, count: 200 },
  { name: "Ремонт", iconKey: "hammerWrench" as const, count: 180 },
  { name: "Грузоперевозки", iconKey: "truckBox" as const, count: 90 },
  { name: "Красота", iconKey: "camera" as const, count: 110 },
  { name: "Репетиторство", iconKey: "briefcase" as const, count: 75 },
  { name: "Фотография", iconKey: "camera" as const, count: 65 }
];

const testimonials = [
  { 
    text: "Заказал ремонт крана через ServiceHub. Мастер приехал быстро, работу выполнил качественно. Оплата через эскроу очень удобна!", 
    author: "Анна Попова", 
    location: "Кишинэу", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ru"
  },
  { 
    text: "Отличная платформа! Нашел здесь постоянных клиентов. Выплаты приходят моментально, никаких задержек.", 
    author: "Ион Морарь", 
    location: "Бэлць", 
    rating: 5,
    avatar: ionBalti,
    lang: "ru"
  },
  { 
    text: "Удобно заказывать уборку через приложение. Все прозрачно: цена, время, отзывы о клинере. Рекомендую!", 
    author: "Елена Руссу", 
    location: "Кахул", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ru"
  }
];

export default function Index() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  
  const filteredTestimonials = testimonials.filter(
    testimonial => testimonial.lang === currentLanguage
  );

  return (
    <div style={{ background: 'var(--background-neomorphic)' }}>
      <SignatureGradient />
      <Seo
        title={t("seo.home.title")}
        description={t("seo.home.desc")}
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ServiceHub",
          url: "/",
          potentialAction: {
            "@type": "SearchAction",
            target: "/catalog?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      
      {/* Hero Section */}
      <section className="hero-section section-spacing">
        <div className="main-container">
          <div className="responsive-grid lg:grid-cols-2 items-center gap-gap-lg">
            {/* Left Column - Text Content */}
            <div className="text-left">
              <div className="section-gap animate-fade-in">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Rocket size={24} className="text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-primary btn-no-wrap">Платформа нового поколения</span>
                </div>
                <h1 className="text-heading-xl font-display font-bold mb-6 max-w-heading">
                  <span className="text-gradient animate-gradient-shift">{t("hero.title")}</span>
                </h1>
                <p className="text-body-lg text-muted-foreground mb-8 max-w-text">
                  {t("hero.subtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-gap mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Link to="/catalog" className="btn-hero btn-no-wrap">
                  🔍 Найти специалиста
                </Link>
                <Link to="/auth" className="btn-ghost btn-no-wrap">
                  💼 Стать исполнителем
                </Link>
              </div>

              {/* Stats with proper spacing */}
              <div className="responsive-grid grid-cols-3 gap-gap text-center animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div>
                  <div className="text-heading-md font-bold text-primary">1000+</div>
                  <div className="text-sm text-muted-foreground btn-no-wrap">Специалистов</div>
                </div>
                <div>
                  <div className="text-heading-md font-bold text-primary">5000+</div>
                  <div className="text-sm text-muted-foreground btn-no-wrap">Выполненных работ</div>
                </div>
                <div>
                  <div className="text-heading-md font-bold text-primary">4.9</div>
                  <div className="text-sm text-muted-foreground btn-no-wrap">Средний рейтинг</div>
                </div>
              </div>
            </div>

            {/* Right Column - Dashboard Image */}
            <div className="relative animate-fade-in lg:animate-float-slow" style={{ animationDelay: '300ms' }}>
              <div className="relative hero-image-container mx-auto">
                <img 
                  src={heroDashboard} 
                  alt="ServiceHub Platform" 
                  className="img-responsive rounded-3xl shadow-2xl"
                  loading="eager"
                  fetchPriority="high"
                  width={612}
                  height={408}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 612px"
                />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/10 to-accent/10 pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="section-spacing">
        <div className="section-container">
          <div className="text-center section-gap">
            <h2 className="text-heading-lg font-display font-bold max-w-heading-lg mx-auto mb-4">
              Почему выбирают ServiceHub
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-text mx-auto">
              Современная платформа для безопасного поиска и заказа услуг с полной защитой интересов всех сторон
            </p>
          </div>

          <div className="responsive-grid lg:grid-cols-3 gap-gap">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="card-surface card-equal-height text-center animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="card-content">
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="card-title text-heading-sm font-semibold mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-body text-muted-foreground flex-1 max-w-text mx-auto">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Categories Section */}
      <section className="section-spacing bg-muted/10">
        <div className="section-container">
          <div className="text-center section-gap">
            <h2 className="text-heading-lg font-display font-bold max-w-heading-lg mx-auto mb-4">
              {t("section.categories")}
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-text mx-auto">
              Найдите нужного специалиста в любой из популярных категорий
            </p>
          </div>

          <div className="responsive-grid lg:grid-cols-4 gap-gap">
            {categories.map((category, index) => (
              <Link
                key={category.name}
                to={`/catalog?category=${encodeURIComponent(category.name)}`}
                className="card-surface card-equal-height text-center group animate-fade-in btn-no-wrap"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="card-content">
                  <div className="w-16 h-16 mx-auto mb-2 group-hover:animate-bounce-gentle">
                    <Icon3D name={category.iconKey} size="lg" loading="lazy" />
                  </div>
                  <h3 className="card-title text-heading-xs font-semibold mb-2">
                    {category.name}
                  </h3>
                  <p className="text-body-sm text-muted-foreground">
                    {category.count}+ мастеров
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="section-spacing">
        <div className="section-container">
          <div className="text-center section-gap">
            <h2 className="text-heading-lg font-display font-bold max-w-heading-lg mx-auto mb-4">
              {t("section.testimonials")}
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-text mx-auto">
              Отзывы наших довольных клиентов и специалистов
            </p>
          </div>

          <div className="responsive-grid lg:grid-cols-3 gap-gap">
            {filteredTestimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="card-surface card-equal-height animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="card-content">
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold btn-no-wrap">{testimonial.author}</div>
                      <div className="text-body-sm text-muted-foreground btn-no-wrap">{testimonial.location}</div>
                    </div>
                    <div className="flex flex-shrink-0">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Icon3D key={i} name="star" size="sm" className="text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-body text-muted-foreground flex-1 max-w-text">
                    "{testimonial.text}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="section-spacing bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="section-container">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-heading-lg font-display font-bold max-w-heading-lg mx-auto mb-6">
              Готовы начать?
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-text mx-auto section-gap">
              Присоединяйтесь к тысячам довольных пользователей ServiceHub уже сегодня
            </p>
            
            <div className="flex flex-col sm:flex-row gap-gap justify-center">
              <Link to="/catalog" className="btn-hero btn-no-wrap">
                Найти специалиста
              </Link>
              <Link to="/auth" className="btn-ghost btn-no-wrap">
                Стать исполнителем
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}