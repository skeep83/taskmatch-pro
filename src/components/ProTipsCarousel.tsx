import { useState, useEffect } from "react";
import { FloatingCard } from "@/components/ui/floating-card";
import { ChevronLeft, ChevronRight, Star, MessageSquare, Camera, Clock, Shield, CreditCard, RotateCcw, Phone, Award } from "lucide-react";

interface ProTipsCarouselProps {
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const PRO_TIPS = [
  {
    icon: Star,
    title: "Качественная работа",
    description: "Всегда выполняйте работу качественно. От этого зависит ваш рейтинг и количество заказов.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20"
  },
  {
    icon: Clock,
    title: "Быстрый отклик",
    description: "Отвечайте на заказы в течение 15-30 минут. Это повышает шансы получить заказ.",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20"
  },
  {
    icon: MessageSquare,
    title: "Общение с клиентом",
    description: "Поддерживайте постоянную связь с клиентом. Информируйте о ходе работ.",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20"
  },
  {
    icon: Camera,
    title: "Фото до и после",
    description: "Делайте фото до начала работ и после завершения. Это защищает от споров.",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20"
  },
  {
    icon: Shield,
    title: "Безопасность",
    description: "Соблюдайте технику безопасности. Используйте качественные инструменты и материалы.",
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20"
  },
  {
    icon: CreditCard,
    title: "Честная оплата",
    description: "Указывайте честные цены. Избегайте скрытых доплат - это портит репутацию.",
    color: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20"
  },
  {
    icon: Award,
    title: "Портфолио",
    description: "Регулярно обновляйте портфолио. Добавляйте лучшие работы с качественными фото.",
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20"
  },
  {
    icon: Phone,
    title: "Техподдержка",
    description: "При возникновении проблем обращайтесь в техподдержку. Мы всегда готовы помочь.",
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20"
  },
  {
    icon: RotateCcw,
    title: "Повторные заказы",
    description: "Стремитесь к повторным заказам. Довольные клиенты - лучший источник работы.",
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-950/20"
  }
];

export const ProTipsCarousel = ({ currentIndex, onIndexChange }: ProTipsCarouselProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-advance tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        nextTip();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, isAnimating]);

  const nextTip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      onIndexChange((currentIndex + 1) % PRO_TIPS.length);
      setIsAnimating(false);
    }, 150);
  };

  const prevTip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      onIndexChange((currentIndex - 1 + PRO_TIPS.length) % PRO_TIPS.length);
      setIsAnimating(false);
    }, 150);
  };

  const currentTip = PRO_TIPS[currentIndex];
  const IconComponent = currentTip.icon;

  return (
    <div className="relative h-64">
      {/* Navigation buttons */}
      <button
        onClick={prevTip}
        disabled={isAnimating}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all hover:scale-110 disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4 text-gray-600" />
      </button>

      <button
        onClick={nextTip}
        disabled={isAnimating}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all hover:scale-110 disabled:opacity-50"
      >
        <ChevronRight className="h-4 w-4 text-gray-600" />
      </button>

      {/* Tip Card */}
      <FloatingCard
        className={`h-full transition-all duration-300 ${
          isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
        }`}
        glow
        hover={false}
      >
        <div className={`h-full p-6 ${currentTip.bgColor} rounded-2xl`}>
          <div className="flex flex-col items-center text-center h-full">
            <div className="mb-4">
              <IconComponent className={`h-12 w-12 ${currentTip.color}`} />
            </div>
            
            <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
              {currentTip.title}
            </h3>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
              {currentTip.description}
            </p>
          </div>
        </div>
      </FloatingCard>

      {/* Dots indicator */}
      <div className="flex justify-center mt-4 gap-2">
        {PRO_TIPS.map((_, index) => (
          <button
            key={index}
            onClick={() => !isAnimating && onIndexChange(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-primary scale-125'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Tip counter */}
      <div className="text-center mt-2">
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} из {PRO_TIPS.length}
        </span>
      </div>
    </div>
  );
};