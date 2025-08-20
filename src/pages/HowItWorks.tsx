import { Seo } from "@/components/Seo";
import { SignatureGradient } from "@/components/SignatureGradient";
import { FloatingCard } from "@/components/ui/floating-card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import { Search, MessageSquare, CreditCard, Star, Users, Shield, Zap, CheckCircle } from "lucide-react";

const HowItWorks = () => {
  const { t } = useI18n();

  const steps = [
    {
      icon: Search,
      title: "1. Найдите специалиста",
      description: "Выберите категорию услуги и просмотрите анкеты проверенных специалистов в вашем районе. Изучите рейтинги, отзывы и портфолио.",
      color: "text-blue-500"
    },
    {
      icon: MessageSquare,
      title: "2. Создайте заказ",
      description: "Опишите задачу, загрузите фото, укажите бюджет и удобное время. Система автоматически уведомит подходящих специалистов.",
      color: "text-green-500"
    },
    {
      icon: CreditCard,
      title: "3. Безопасная оплата",
      description: "Деньги блокируются в защищенном эскроу. Оплата переводится исполнителю только после успешного завершения работ.",
      color: "text-purple-500"
    },
    {
      icon: Star,
      title: "4. Оценка качества",
      description: "После завершения работ оставьте отзыв и оценку. Это помогает другим клиентам выбрать лучших специалистов.",
      color: "text-amber-500"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Безопасность",
      description: "Эскроу-платежи, проверка документов, страховка"
    },
    {
      icon: Zap,
      title: "Скорость",
      description: "Мгновенные отклики, быстрое выполнение заказов"
    },
    {
      icon: Users,
      title: "Качество",
      description: "Проверенные специалисты, система рейтингов"
    }
  ];

  const faq = [
    {
      question: "Как гарантируется безопасность платежей?",
      answer: "Мы используем систему эскроу: деньги блокируются на специальном счете и переводятся исполнителю только после подтверждения выполнения работ клиентом."
    },
    {
      question: "Что делать, если работа выполнена некачественно?",
      answer: "У нас есть система разрешения споров. Вы можете подать жалобу, и наша команда модераторов разберет ситуацию в течение 24 часов."
    },
    {
      question: "Как стать исполнителем на платформе?",
      answer: "Зарегистрируйтесь как специалист, пройдите верификацию документов (KYC), заполните профиль и начинайте получать заказы."
    },
    {
      question: "Какую комиссию берет сервис?",
      answer: "Комиссия составляет 8-12% с суммы заказа в зависимости от категории услуги. Точная информация отображается при создании заказа."
    },
    {
      question: "Что такое тендеры для бизнеса?",
      answer: "Корпоративные клиенты могут выставлять тендеры на крупные заказы. Специалисты подают заявки, а система автоматически выбирает лучшее предложение."
    }
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <SignatureGradient />
      <Seo 
        title="Как это работает — ServiceHub" 
        description="Узнайте, как использовать ServiceHub для поиска специалистов и выполнения заказов"
        canonical="/how-it-works" 
      />
      
      {/* Hero Section */}
      <section className="container mx-auto pt-20 pb-16">
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <AnimatedIcon icon={CheckCircle} size={48} className="text-primary" />
          </div>
          <h1 className="text-6xl font-display font-bold text-gradient mb-6">
            Как работает ServiceHub
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Простой и безопасный способ найти профессионалов для любых задач. 
            От поиска специалиста до завершения работ — всего за 4 шага.
          </p>
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="container mx-auto pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <FloatingCard 
              key={index}
              className="p-8 text-center"
              delay={index * 150}
              hover
            >
              <div className="mb-6">
                <AnimatedIcon 
                  icon={step.icon} 
                  size={48}
                  className={`${step.color} mx-auto`}
                  delayMs={index * 150}
                />
              </div>
              <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </FloatingCard>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto pb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold mb-6 text-gradient">
            Почему выбирают ServiceHub
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FloatingCard 
              key={index}
              className="p-8 text-center"
              delay={index * 200}
              hover
            >
              <div className="mb-6">
                <AnimatedIcon 
                  icon={feature.icon} 
                  size={40}
                  className="text-primary mx-auto"
                  delayMs={index * 200}
                />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </FloatingCard>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto pb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold mb-6 text-gradient">
            Часто задаваемые вопросы
          </h2>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-6">
          {faq.map((item, index) => (
            <FloatingCard 
              key={index}
              className="p-6"
              delay={index * 100}
              hover
            >
              <h3 className="text-lg font-semibold mb-3 text-primary">
                {item.question}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {item.answer}
              </p>
            </FloatingCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto pb-20">
        <FloatingCard className="p-12 text-center max-w-4xl mx-auto" delay={600}>
          <h2 className="text-3xl font-display font-bold mb-6">
            Готовы начать?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Присоединяйтесь к тысячам довольных клиентов и специалистов
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/catalog" className="btn-hero text-lg px-8 py-4">
              Найти специалиста
            </Link>
            <Link to="/auth" className="btn-ghost text-lg px-8 py-4">
              Стать исполнителем
            </Link>
          </div>
        </FloatingCard>
      </section>
    </main>
  );
};

export default HowItWorks;