import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { FloatingCard } from "@/components/ui/floating-card";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";

import { useEnhancedI18n } from "@/i18n/enhanced";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Wrench, Zap, Sparkles, Paintbrush, Package, Cog, ShieldCheck, Crown, Star, Rocket, Award } from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";
import anaChisinau from "@/assets/testimonials/ana-chisinau.jpg";
import ionBalti from "@/assets/testimonials/ion-balti.jpg";
import elenaCahul from "@/assets/testimonials/elena-cahul.jpg";

const categories = [
  { key: "plumbing", label: "Сантехника" },
  { key: "electric", label: "Электрика" },
  { key: "cleaning", label: "Уборка" },
  { key: "appliance", label: "Бытовая техника" },
  { key: "painting", label: "Покраска" },
  { key: "moving", label: "Переезды" },
];

// Testimonials data
const testimonials = [
  // Romanian testimonials
  { 
    text: "Serviciu excelent! Am găsit rapid un instalator care a venit în aceeași zi. Plata prin escrow - siguranță totală.", 
    author: "Ana Popescu", 
    location: "Chișinău", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ro"
  },
  { 
    text: "Folosesc ServiceHub pentru căutarea electricianilor. Întotdeauna muncă de calitate și prețuri corecte. Recomand!", 
    author: "Ion Marin", 
    location: "Bălți", 
    rating: 5,
    avatar: ionBalti,
    lang: "ro"
  },
  { 
    text: "Platformă convenabilă pentru comandarea serviciilor pentru casă. Specialiștii sunt verificați, lucrează profesional.", 
    author: "Elena Rusu", 
    location: "Cahul", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ro"
  },
  { 
    text: "Am apelat pentru repararea mașinii de spălat. Meșterul a venit foarte repede și a rezolvat problema calitativ. Prețul corect!", 
    author: "Vasile Ionescu", 
    location: "Ungheni", 
    rating: 5,
    avatar: ionBalti,
    lang: "ro"
  },
  { 
    text: "Curățenie de apartament după renovare. Echipa a lucrat impecabil, totul curat și strălucitor. Mulțumesc!", 
    author: "Maria Gheorghiu", 
    location: "Orhei", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ro"
  },
  { 
    text: "Mutarea a fost organizată perfect. Băieții au lucrat rapid și cu grijă. Nimic nu s-a stricat. Recomand cu încredere!", 
    author: "Andrei Stanciu", 
    location: "Soroca", 
    rating: 5,
    avatar: ionBalti,
    lang: "ro"
  },
  { 
    text: "Instalarea aerului condiționat a mers fără probleme. Meșterul a fost punctual și foarte competent. Prețul rezonabil!", 
    author: "Cristina Lungu", 
    location: "Strășeni", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ro"
  },
  { 
    text: "Reparația televizorului a fost făcută rapid și eficient. Garanție de 6 luni - foarte serios și profesionist!", 
    author: "Nicolae Petre", 
    location: "Edineț", 
    rating: 5,
    avatar: ionBalti,
    lang: "ro"
  },
  { 
    text: "Vopsirea dormitorului - rezultat perfect! Culoarea exactă cum am cerut, finisaj impecabil. Recomand din suflet!", 
    author: "Lucia Mihai", 
    location: "Comrat", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ro"
  },
  { 
    text: "Montarea dulapului în bucătărie. Totul perfect, la timp, cu toate uneltele necesare. Mă voi întoarce cu siguranță!", 
    author: "Pavel Ciobanu", 
    location: "Florești", 
    rating: 5,
    avatar: ionBalti,
    lang: "ro"
  },
  { 
    text: "Curățenie generală după construcție. Echipa a muncit 8 ore non-stop. Casa arată ca nouă! Prețul foarte bun!", 
    author: "Daniela Sandu", 
    location: "Drochia", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ro"
  },
  { 
    text: "Repararea robinetului în baie. A venit în 30 de minute, a rezolvat rapid. Tariful transparent, fără surprize!", 
    author: "Gheorghe Rotaru", 
    location: "Leova", 
    rating: 5,
    avatar: ionBalti,
    lang: "ro"
  },
  { 
    text: "Transport mobilă la casă nouă. Băieții au fost foarte atenți, nimic zgâriat. Serviciu de top la prețuri accesibile!", 
    author: "Svetlana Botnaru", 
    location: "Anenii Noi", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ro"
  },
  { 
    text: "Montarea unui candelabru în living. Electricianul a fost foarte atent la detalii. Totul funcționează perfect!", 
    author: "Alexandru Moraru", 
    location: "Nisporeni", 
    rating: 5,
    avatar: ionBalti,
    lang: "ro"
  },
  // Russian testimonials
  { 
    text: "Отличный сервис! Быстро нашли сантехника, который приехал в тот же день. Оплата через эскроу — полная безопасность.", 
    author: "Марина Соколова", 
    location: "Кишинев", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ru"
  },
  { 
    text: "Использую ServiceHub для поиска электриков. Всегда качественная работа и честные цены. Рекомендую!", 
    author: "Дмитрий Петров", 
    location: "Бельцы", 
    rating: 5,
    avatar: ionBalti,
    lang: "ru"
  },
  { 
    text: "Удобная платформа для заказа услуг по дому. Специалисты проверенные, работают профессионально.", 
    author: "Елена Иванова", 
    location: "Кагул", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ru"
  },
  { 
    text: "Заказывал покраску квартиры. Мастер выполнил работу на высшем уровне, аккуратно и быстро. Очень доволен!", 
    author: "Сергей Волков", 
    location: "Орхей", 
    rating: 5,
    avatar: ionBalti,
    lang: "ru"
  },
  { 
    text: "Ремонт кондиционера прошёл отлично. Специалист приехал точно в срок, диагностировал и устранил поломку быстро.", 
    author: "Татьяна Козлова", 
    location: "Унгены", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ru"
  },
  { 
    text: "Генеральная уборка офиса была выполнена безупречно. Команда работала слаженно и качественно. Спасибо!", 
    author: "Алексей Морозов", 
    location: "Сорока", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ru"
  },
  { 
    text: "Установка стиральной машины прошла без проблем. Мастер приехал с нужными инструментами и подключил всё за час!", 
    author: "Ольга Федорова", 
    location: "Страшены", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ru"
  },
  { 
    text: "Ремонт холодильника выполнен качественно. Быстрая диагностика, замена деталей, гарантия 6 месяцев!", 
    author: "Василий Попов", 
    location: "Единцы", 
    rating: 5,
    avatar: ionBalti,
    lang: "ru"
  },
  { 
    text: "Монтаж кухонной мебели прошёл идеально. Всё ровно, красиво, функционально. Мастер настоящий профессионал!", 
    author: "Анна Сидорова", 
    location: "Комрат", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ru"
  },
  { 
    text: "Переезд с помощью ServiceHub — лучшее решение! Грузчики работали быстро и аккуратно. Ничего не повредили!", 
    author: "Игорь Белый", 
    location: "Флорешты", 
    rating: 5,
    avatar: ionBalti,
    lang: "ru"
  },
  { 
    text: "Уборка после ремонта превзошла ожидания. Убрали всю строительную пыль, вымыли окна. Квартира сияет!", 
    author: "Марианна Русу", 
    location: "Дрокия", 
    rating: 5,
    avatar: elenaCahul,
    lang: "ru"
  },
  { 
    text: "Замена проводки в старой квартире. Электрик работал очень аккуратно, объяснил каждый этап работы. Отлично!", 
    author: "Петр Костюк", 
    location: "Леова", 
    rating: 5,
    avatar: ionBalti,
    lang: "ru"
  },
  { 
    text: "Доставка и сборка мебели для детской комнаты. Всё сделано идеально, ребёнок счастлив! Быстро и качественно!", 
    author: "Наталья Григорьева", 
    location: "Новые Анены", 
    rating: 5,
    avatar: anaChisinau,
    lang: "ru"
  },
  { 
    text: "Монтаж люстры в гостиной. Электрик был очень внимателен к деталям, работал чисто. Результат превосходный!", 
    author: "Владимир Лазарев", 
    location: "Ниспорены", 
    rating: 5,
    avatar: ionBalti,
    lang: "ru"
  }
];

const Index = () => {
  const { t, language } = useEnhancedI18n();
  const [currentTestimonials, setCurrentTestimonials] = useState<typeof testimonials>([]);
  const [animatingCards, setAnimatingCards] = useState<boolean[]>([false, false, false]);

  console.log('Index component rendered, animatingCards:', animatingCards);

  // Initialize testimonials based on current language
  useEffect(() => {
    const filteredTestimonials = testimonials.filter(t => t.lang === language);
    setCurrentTestimonials(filteredTestimonials.slice(0, 3));
  }, [language]);

  // Auto-rotate individual testimonials with staggered timing
  useEffect(() => {
    const filteredTestimonials = testimonials.filter(t => t.lang === language);
    if (filteredTestimonials.length <= 3) return;

    const intervals: NodeJS.Timeout[] = [];

    // Create individual timers for each card with different delays
    [0, 1, 2].forEach((cardIndex) => {
      const interval = setInterval(() => {
        // Start fade out animation for this specific card
        setAnimatingCards(prev => {
          const newState = [...prev];
          newState[cardIndex] = true;
          return newState;
        });

        setTimeout(() => {
          // Replace testimonial for this card
          setCurrentTestimonials(prev => {
            const newTestimonials = [...prev];
            const availableTestimonials = filteredTestimonials.filter(
              (t, index) => !prev.some(current => current.author === t.author)
            );
            
            if (availableTestimonials.length > 0) {
              const randomTestimonial = availableTestimonials[
                Math.floor(Math.random() * availableTestimonials.length)
              ];
              newTestimonials[cardIndex] = randomTestimonial;
            }
            
            return newTestimonials;
          });

          // Start fade in animation
          setTimeout(() => {
            setAnimatingCards(prev => {
              const newState = [...prev];
              newState[cardIndex] = false;
              return newState;
            });
          }, 200);
        }, 800); // Wait for fade out animation
        
      }, 13000 + (cardIndex * 4000)); // 13s, 17s, 21s intervals

      intervals.push(interval);
    });

    return () => intervals.forEach(clearInterval);
  }, [language]);

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
                <Link to="/catalog" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
                  🔍 Найти специалиста
                </Link>
                <Link to="/auth" className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
                  💼 Стать исполнителем
                </Link>
                <Link to="/tenders" className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg">
                  🏢 Корпоративные тендеры
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center gap-3">
                  <ShieldCheck size={24} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Безопасные платежи</span>
                </div>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center gap-3">
                  <Zap size={24} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Мгновенные отклики</span>
                </div>
                <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center gap-3">
                  <Award size={24} className="text-amber-500" />
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
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  decoding="sync"
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
          {currentTestimonials.map((testimonial, index) => (
            <div 
              key={`testimonial-${index}-${testimonial.author}`}
              className={`card-surface p-8 text-left transform transition-all duration-1000 ease-in-out ${
                animatingCards[index]
                  ? 'opacity-0 translate-y-8 scale-95' 
                  : 'opacity-100 translate-y-0 scale-100'
              }`}
              style={{ 
                transitionDelay: `${index * 300}ms`
              }}
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
              <p className="text-foreground/80 mb-6 leading-relaxed text-lg italic">
                "{testimonial.text}"
              </p>
              <div className="flex items-center gap-4">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                />
                <div>
                  <div className="font-semibold text-primary text-lg">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;