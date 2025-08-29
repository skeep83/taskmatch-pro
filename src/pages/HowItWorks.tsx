import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Link } from "react-router-dom";
import { useState } from "react";
import { 
  Search, MessageSquare, CreditCard, Star, Users, Shield, Zap, CheckCircle,
  ArrowRight, Sparkles, Globe, Clock, Award, TrendingUp, Heart, Target,
  ChevronDown, Play, Phone, Mail, MapPin, Eye, Lock, Coins
} from "lucide-react";
import servicesHero from "@/assets/services-hero.jpg";
import securityImg from "@/assets/features/security.jpg";
import speedImg from "@/assets/features/speed.jpg";
import qualityImg from "@/assets/features/quality.jpg";
import availabilityImg from "@/assets/features/availability.jpg";
import guaranteesImg from "@/assets/features/guarantees.jpg";
import growthImg from "@/assets/features/growth.jpg";

const HowItWorks = () => {
  const { t } = useEnhancedI18n();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const steps = [
    {
      icon: Search,
      title: "Найдите специалиста",
      description: "Выберите категорию услуги и просмотрите анкеты проверенных специалистов в вашем районе. Изучите рейтинги, отзывы и портфолио.",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950/20 to-cyan-950/20",
      number: "01"
    },
    {
      icon: MessageSquare,
      title: "Создайте заказ",
      description: "Опишите задачу, загрузите фото, укажите бюджет и удобное время. Система автоматически уведомит подходящих специалистов.",
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50 dark:from-green-950/20 to-emerald-950/20",
      number: "02"
    },
    {
      icon: CreditCard,
      title: "Безопасная оплата",
      description: "Деньги блокируются в защищенном эскроу. Оплата переводится исполнителю только после успешного завершения работ.",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50 dark:from-purple-950/20 to-pink-950/20",
      number: "03"
    },
    {
      icon: Star,
      title: "Оценка качества",
      description: "После завершения работ оставьте отзыв и оценку. Это помогает другим клиентам выбрать лучших специалистов.",
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/20 to-orange-950/20",
      number: "04"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Безопасность",
      description: "Эскроу-платежи, проверка документов, страховка",
      gradient: "from-red-500 to-rose-500",
      stats: "99.8% безопасных сделок",
      image: securityImg
    },
    {
      icon: Zap,
      title: "Скорость",
      description: "Мгновенные отклики, быстрое выполнение заказов",
      gradient: "from-yellow-500 to-amber-500",
      stats: "< 15 мин средний отклик",
      image: speedImg
    },
    {
      icon: Users,
      title: "Качество",
      description: "Проверенные специалисты, система рейтингов",
      gradient: "from-blue-500 to-indigo-500",
      stats: "4.9/5 средний рейтинг",
      image: qualityImg
    },
    {
      icon: Globe,
      title: "Доступность",
      description: "Работаем в 50+ городах по всей стране",
      gradient: "from-green-500 to-teal-500",
      stats: "24/7 поддержка",
      image: availabilityImg
    },
    {
      icon: Award,
      title: "Гарантии",
      description: "Возврат средств, повторное выполнение",
      gradient: "from-purple-500 to-violet-500",
      stats: "100% гарантия качества",
      image: guaranteesImg
    },
    {
      icon: TrendingUp,
      title: "Рост",
      description: "Постоянно расширяем список услуг",
      gradient: "from-pink-500 to-rose-500",
      stats: "+200% роста в год",
      image: growthImg
    }
  ];

  const stats = [
    { icon: Users, number: "50K+", label: "Довольных клиентов" },
    { icon: Star, number: "25K+", label: "Выполненных заказов" },
    { icon: Shield, number: "99.8%", label: "Безопасных платежей" },
    { icon: Clock, number: "15 мин", label: "Средний отклик" }
  ];

  const faq = [
    {
      question: "Как гарантируется безопасность платежей?",
      answer: "Мы используем систему эскроу: деньги блокируются на специальном счете и переводятся исполнителю только после подтверждения выполнения работ клиентом. Также все транзакции защищены банковским шифрованием SSL."
    },
    {
      question: "Что делать, если работа выполнена некачественно?",
      answer: "У нас есть система разрешения споров. Вы можете подать жалобу, и наша команда модераторов разберет ситуацию в течение 24 часов. Предусмотрен возврат средств или бесплатное переделывание работ."
    },
    {
      question: "Как стать исполнителем на платформе?",
      answer: "Зарегистрируйтесь как специалист, пройдите верификацию документов (KYC), заполните профиль с портфолио и начинайте получать заказы. Первые 3 заказа без комиссии!"
    },
    {
      question: "Какую комиссию берет сервис?",
      answer: "Комиссия составляет 8-12% с суммы заказа в зависимости от категории услуги. Точная информация отображается при создании заказа. Для постоянных клиентов действуют скидки."
    },
    {
      question: "Что такое тендеры для бизнеса?",
      answer: "Корпоративные клиенты могут выставлять тендеры на крупные заказы. Специалисты подают заявки, а система автоматически выбирает лучшее предложение по алгоритму Vickrey auction."
    },
    {
      question: "Как работает система рейтингов?",
      answer: "После каждого заказа клиент и исполнитель оставляют взаимные отзывы. Рейтинг формируется на основе качества работы, соблюдения сроков, вежливости и других факторов."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <main className="min-h-screen">
      <Seo 
        title="Как это работает — ServiceHub" 
        description="Узнайте, как использовать ServiceHub для поиска специалистов и выполнения заказов. Простой и безопасный способ решить любые задачи."
        canonical="/how-it-works" 
      />
      
      {/* Hero Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="card-surface p-6 rounded-full">
              <Sparkles size={72} className="text-primary" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-gradient mb-8 leading-tight">
            Как работает<br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              ServiceHub
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-10">
            Революционная платформа для поиска профессионалов. 
            <br className="hidden md:block" />
            Простой, быстрый и безопасный способ решить любые задачи.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/catalog" className="bg-primary text-white hover:bg-primary/90 px-10 py-5 rounded-xl font-semibold text-xl transition-colors shadow-lg flex items-center gap-3">
              <Search size={24} />
              Найти специалиста
              <ArrowRight size={20} />
            </Link>
            
            <button className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-10 py-5 rounded-xl font-semibold text-xl transition-colors shadow-lg flex items-center gap-3">
              <Play size={20} />
              Смотреть видео
            </button>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="card-surface p-6 text-center">
              <stat.icon 
                size={48} 
                className="mx-auto mb-3 text-primary"
              />
              <div className="text-3xl font-bold text-primary mb-2">{stat.number}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary font-medium mb-6">
            <Target size={20} />
            Простые шаги
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Всего 4 простых шага
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            От поиска специалиста до завершения работ — весь процесс максимально упрощен
          </p>
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div 
                  className={`card-surface p-8 text-center relative overflow-hidden border-0 transition-all duration-500 bg-gradient-to-br ${step.bgGradient}`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Step Number */}
                  <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{step.number}</span>
                  </div>
                  
                  {/* Icon with Gradient Background */}
                  <div className="relative mb-8">
                    <div className={`relative w-20 h-20 mx-auto rounded-full bg-gradient-to-r ${step.gradient} p-0.5`}>
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <step.icon 
                          size={48}
                          className="text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4 text-gradient-subtle">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step.description}
                  </p>
                  
                  {/* Arrow for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="text-primary/50" size={24} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-secondary/10 text-secondary font-medium mb-6">
            <Heart size={20} />
            Наши преимущества
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Почему выбирают ServiceHub
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Мы создали платформу, которая решает все проблемы традиционного поиска услуг
          </p>
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="card-surface group p-8 text-center transition-all duration-500 hover:shadow-2xl"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="mb-6">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} shadow-lg`}>
                    <feature.icon 
                      size={56}
                      className="text-white"
                    />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-3 text-gradient-subtle">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {feature.description}
                </p>
                <div className="text-sm font-semibold text-primary bg-primary/10 rounded-full px-4 py-2">
                  {feature.stats}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent/10 text-accent font-medium mb-6">
            <Eye size={20} />
            Часто задаваемые вопросы
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Ответы на ваши вопросы
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Все, что нужно знать о работе с ServiceHub
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-4">
          {faq.map((item, index) => (
            <div
              key={index}
              className="card-surface overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-primary/5 transition-colors"
              >
                <h3 className="text-lg font-semibold text-primary">
                  {item.question}
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-primary transition-transform ${
                    openFAQ === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${
                openFAQ === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto py-20 px-6">
        <div className="card-surface relative p-16 text-center max-w-6xl mx-auto overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10"></div>
          
          <div className="relative">
            <div className="flex justify-center mb-8">
              <div className="flex -space-x-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Users className="text-primary" size={24} />
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Star className="text-primary" size={24} />
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Shield className="text-primary" size={24} />
                  </div>
                </div>
              </div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-gradient">
              Готовы начать?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам довольных клиентов и специалистов. 
              Первый заказ — без комиссии!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
              <Link to="/catalog" className="bg-primary text-white hover:bg-primary/90 px-10 py-5 rounded-xl font-semibold text-xl transition-colors shadow-lg flex items-center gap-3">
                <Search size={24} />
                Найти специалиста
                <ArrowRight size={20} />
              </Link>
              <Link to="/auth" className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-10 py-5 rounded-xl font-semibold text-xl transition-colors shadow-lg flex items-center gap-3">
                <Users size={24} />
                Стать исполнителем
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock size={16} />
                100% безопасные платежи
              </div>
              <div className="flex items-center gap-2">
                <Coins size={16} />
                Первый заказ без комиссии
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} />
                24/7 поддержка
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HowItWorks;