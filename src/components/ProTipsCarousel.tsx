import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Lightbulb, 
  MessageSquare, 
  Clock, 
  Star, 
  Users, 
  Zap,
  Target,
  Award
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const proTips = [
  {
    icon: Clock,
    title: "Быстрое реагирование",
    description: "Отвечайте на заказы в течение 15 минут, чтобы повысить шансы на получение работы",
    color: "text-blue-500",
    bgColor: "bg-blue-50"
  },
  {
    icon: MessageSquare,
    title: "Качественное общение",
    description: "Задавайте уточняющие вопросы и будьте вежливы в переписке с клиентами",
    color: "text-green-500",
    bgColor: "bg-green-50"
  },
  {
    icon: Star,
    title: "Портфолио работ",
    description: "Загружайте фото выполненных работ - это увеличивает доверие клиентов",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50"
  },
  {
    icon: Target,
    title: "Точные предложения",
    description: "Делайте реалистичные ценовые предложения с учетом сложности работы",
    color: "text-purple-500",
    bgColor: "bg-purple-50"
  },
  {
    icon: Users,
    title: "Профессионализм",
    description: "Приходите вовремя и выполняйте работу качественно - это гарантирует хорошие отзывы",
    color: "text-orange-500",
    bgColor: "bg-orange-50"
  },
  {
    icon: Zap,
    title: "Активность",
    description: "Регулярно заходите в приложение и отмечайте свою доступность",
    color: "text-red-500",
    bgColor: "bg-red-50"
  },
  {
    icon: Award,
    title: "Гарантии качества",
    description: "Предлагайте гарантию на свою работу - это выделяет вас среди конкурентов",
    color: "text-indigo-500",
    bgColor: "bg-indigo-50"
  }
];

export const ProTipsCarousel = () => {
  return (
    <div className="card-surface p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Полезные советы</h3>
      </div>
      
      <Carousel className="w-full">
        <CarouselContent>
          {proTips.map((tip, index) => (
            <CarouselItem key={index}>
              <Card className="border-0 shadow-none bg-gradient-to-br from-white/50 to-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full ${tip.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <tip.icon className={`w-6 h-6 ${tip.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg mb-2 text-foreground">
                        {tip.title}
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex justify-center gap-2 mt-4">
          <CarouselPrevious className="relative left-0 top-0 translate-y-0" />
          <CarouselNext className="relative right-0 top-0 translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
};