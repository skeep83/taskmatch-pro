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
  ChevronDown, Play, Phone, Mail, MapPin, Eye, Lock, Coins, Settings
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
      title: t("how_it_works.steps.step1.title"),
      description: t("how_it_works.steps.step1.description"),
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950/20 to-cyan-950/20",
      number: "01"
    },
    {
      icon: MessageSquare,
      title: t("how_it_works.steps.step2.title"),
      description: t("how_it_works.steps.step2.description"),
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50 dark:from-green-950/20 to-emerald-950/20",
      number: "02"
    },
    {
      icon: CreditCard,
      title: t("how_it_works.steps.step3.title"),
      description: t("how_it_works.steps.step3.description"),
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50 dark:from-purple-950/20 to-pink-950/20",
      number: "03"
    },
    {
      icon: Star,
      title: t("how_it_works.steps.step4.title"),
      description: t("how_it_works.steps.step4.description"),
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/20 to-orange-950/20",
      number: "04"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: t("how_it_works.features.security.title"),
      description: t("how_it_works.features.security.description"),
      gradient: "from-red-500 to-rose-500",
      stats: t("how_it_works.features.security.stats"),
      image: securityImg
    },
    {
      icon: Zap,
      title: t("how_it_works.features.speed.title"),
      description: t("how_it_works.features.speed.description"),
      gradient: "from-yellow-500 to-amber-500",
      stats: t("how_it_works.features.speed.stats"),
      image: speedImg
    },
    {
      icon: Users,
      title: t("how_it_works.features.quality.title"),
      description: t("how_it_works.features.quality.description"),
      gradient: "from-blue-500 to-indigo-500",
      stats: t("how_it_works.features.quality.stats"),
      image: qualityImg
    },
    {
      icon: Globe,
      title: t("how_it_works.features.availability.title"),
      description: t("how_it_works.features.availability.description"),
      gradient: "from-green-500 to-teal-500",
      stats: t("how_it_works.features.availability.stats"),
      image: availabilityImg
    },
    {
      icon: Award,
      title: t("how_it_works.features.guarantees.title"),
      description: t("how_it_works.features.guarantees.description"),
      gradient: "from-purple-500 to-violet-500",
      stats: t("how_it_works.features.guarantees.stats"),
      image: guaranteesImg
    },
    {
      icon: TrendingUp,
      title: t("how_it_works.features.growth.title"),
      description: t("how_it_works.features.growth.description"),
      gradient: "from-pink-500 to-rose-500",
      stats: t("how_it_works.features.growth.stats"),
      image: growthImg
    }
  ];

  const stats = [
    { icon: Users, number: "50K+", label: t("how_it_works.stats.happy_clients") },
    { icon: Star, number: "25K+", label: t("how_it_works.stats.completed_orders") },
    { icon: Shield, number: "99.8%", label: t("how_it_works.stats.secure_payments") },
    { icon: Clock, number: "15 мин", label: t("how_it_works.stats.avg_response") }
  ];

  const faq = [
    {
      question: t("how_it_works.faq.q1.question"),
      answer: t("how_it_works.faq.q1.answer")
    },
    {
      question: t("how_it_works.faq.q2.question"),
      answer: t("how_it_works.faq.q2.answer")
    },
    {
      question: t("how_it_works.faq.q3.question"),
      answer: t("how_it_works.faq.q3.answer")
    },
    {
      question: t("how_it_works.faq.q4.question"),
      answer: t("how_it_works.faq.q4.answer")
    },
    {
      question: t("how_it_works.faq.q5.question"),
      answer: t("how_it_works.faq.q5.answer")
    },
    {
      question: t("how_it_works.faq.q6.question"),
      answer: t("how_it_works.faq.q6.answer")
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <main className="min-h-screen">
      <Seo 
        title={t("how_it_works.title")}
        description={t("how_it_works.description")}
        canonical="/how-it-works" 
      />
      
      {/* Hero Section */}
      <section className="py-24">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="w-32 h-32 rounded-3xl bg-[#E5E7EB] shadow-[inset_12px_12px_24px_#D1D5DB,inset_-12px_-12px_24px_#F9FAFB] flex items-center justify-center relative">
                <div className="relative">
                  <Settings className="h-16 w-16 text-primary animate-spin-slow" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cyan-400 animate-pulse"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-primary animate-ping"></div>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gradient mb-8 leading-tight px-4">
              {t("how_it_works.hero.title")}<br />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {t("how_it_works.hero.subtitle")}
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-10 px-4">
              {t("how_it_works.hero.description")}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/catalog" className="btn-hero px-10 py-5 rounded-xl font-semibold text-xl flex items-center gap-3">
                <NeumorphicIcon icon={Search} size={24} variant="behance" />
                {t("how_it_works.hero.find_specialist")}
                <ArrowRight size={20} />
              </Link>
              
              <button className="btn-ghost px-10 py-5 rounded-xl font-semibold text-xl flex items-center gap-3">
                <NeumorphicIcon icon={Play} size={20} variant="behance" />
                {t("how_it_works.hero.watch_video")}
              </button>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="card-surface p-6 text-center">
                <NeumorphicIcon 
                  icon={stat.icon}
                  size={64} 
                  variant="behance"
                  className="mx-auto mb-3"
                />
                <div className="text-3xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="py-24">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary font-medium mb-6">
              <NeumorphicIcon icon={Target} size={24} variant="behance" />
              {t("how_it_works.steps.badge")}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-6 text-gradient leading-tight px-4">
              {t("how_it_works.steps.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              {t("how_it_works.steps.subtitle")}
            </p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative h-full">
                <div 
                  className="card-surface p-8 text-center relative overflow-hidden border-0 transition-all duration-500 h-full flex flex-col"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Step Number */}
                  <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{step.number}</span>
                  </div>
                  
                  {/* Icon with Neumorphic Style */}
                  <div className="relative mb-8">
                    <NeumorphicIcon 
                      icon={step.icon}
                      size={80}
                      variant="behance"
                      className="mx-auto"
                    />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4 text-gradient-subtle">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm flex-1">
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
      <section className="py-24">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary font-medium mb-6">
              <NeumorphicIcon icon={Heart} size={24} variant="behance" />
              {t("how_it_works.features.badge")}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-6 text-gradient leading-tight px-4 overflow-hidden">
              {t("how_it_works.features.title")}
            </h2>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              {t("how_it_works.features.subtitle")}
            </p>
          </div>
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
                  <NeumorphicIcon 
                    icon={feature.icon}
                    size={80}
                    variant="behance"
                    className="mx-auto transition-transform duration-500 hover:scale-110 hover:rotate-6"
                  />
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
      <section className="py-24">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary font-medium mb-6">
              <NeumorphicIcon icon={Eye} size={24} variant="behance" />
              {t("how_it_works.faq.badge")}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-6 text-gradient leading-tight px-4">
              {t("how_it_works.faq.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              {t("how_it_works.faq.subtitle")}
            </p>
          </div>
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
              <div className="flex gap-4">
                <NeumorphicIcon icon={Users} size={64} variant="behance" />
                <NeumorphicIcon icon={Star} size={64} variant="behance" />
                <NeumorphicIcon icon={Shield} size={64} variant="behance" />
              </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-6 text-gradient leading-tight px-4">
              {t("how_it_works.cta.title")}
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto px-4">
              {t("how_it_works.cta.subtitle")}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
              <Link to="/catalog" className="btn-hero px-10 py-5 rounded-xl font-semibold text-xl flex items-center gap-3">
                <NeumorphicIcon icon={Search} size={24} variant="behance" />
                {t("how_it_works.hero.find_specialist")}
                <ArrowRight size={20} />
              </Link>
              <Link to="/auth" className="btn-ghost px-10 py-5 rounded-xl font-semibold text-xl flex items-center gap-3">
                <NeumorphicIcon icon={Users} size={24} variant="behance" />
                {t("hero.cta_secondary")}
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock size={16} />
                {t("how_it_works.features.security.stats")}
              </div>
              <div className="flex items-center gap-2">
                <Coins size={16} />
                {t("how_it_works.faq.q3.answer").split('.')[0]}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} />
                {t("how_it_works.features.availability.stats")}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HowItWorks;