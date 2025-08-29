import { useState, useEffect } from "react";
import { Zap, Star, Clock, Camera, MessageSquare, TrendingUp, Shield, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const tips = [
  {
    icon: Clock,
    title: "Быстрые отклики",
    description: "Отвечайте на заказы в течение 30 минут для повышения рейтинга",
    color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600"
  },
  {
    icon: Camera,
    title: "Качественные фото",
    description: "Добавьте фото работ в портфолио для привлечения клиентов",
    color: "bg-green-50 dark:bg-green-950/20 text-green-600"
  },
  {
    icon: Star,
    title: "Отличный сервис",
    description: "Поддерживайте высокий рейтинг - это ключ к успеху",
    color: "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600"
  },
  {
    icon: MessageSquare,
    title: "Активное общение",
    description: "Регулярно общайтесь с клиентами в чате заказа",
    color: "bg-purple-50 dark:bg-purple-950/20 text-purple-600"
  },
  {
    icon: TrendingUp,
    title: "Рост доходов",
    description: "Участвуйте в тендерах для получения крупных заказов",
    color: "bg-orange-50 dark:bg-orange-950/20 text-orange-600"
  },
  {
    icon: Shield,
    title: "Безопасность",
    description: "Пройдите верификацию KYC для доверия клиентов",
    color: "bg-red-50 dark:bg-red-950/20 text-red-600"
  },
  {
    icon: Award,
    title: "Профессионализм",
    description: "Соблюдайте сроки и качество для получения повторных заказов",
    color: "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600"
  }
];

export const ProTipsCarousel = () => {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const tip = tips[currentTip];
  const Icon = tip.icon;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-8 w-8 text-primary" />
          <h3 className="font-bold">Полезные советы</h3>
        </div>
        
        <div className={`p-4 rounded-lg transition-all duration-500 ${tip.color}`}>
          <div className="flex items-start gap-3">
            <Icon className="h-6 w-6 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-2">{tip.title}</p>
              <p className="text-sm text-muted-foreground">{tip.description}</p>
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex gap-1 mt-4">
          {tips.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                index === currentTip ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};