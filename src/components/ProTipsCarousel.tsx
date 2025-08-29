import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { 
  Clock, 
  Star, 
  MessageSquare, 
  Camera, 
  CheckCircle, 
  Target,
  TrendingUp,
  Shield
} from 'lucide-react';

const tips = [
  {
    id: 1,
    icon: Clock,
    title: "Быстрый отклик",
    description: "Отвечайте на заказы в течение 15 минут. Клиенты выбирают активных специалистов.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    id: 2,
    icon: Star,
    title: "Качество работы",
    description: "Выполняйте работу на высшем уровне. Хорошие отзывы приведут к новым заказам.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10"
  },
  {
    id: 3,
    icon: MessageSquare,
    title: "Общение",
    description: "Поддерживайте связь с клиентом на всех этапах выполнения заказа.",
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  },
  {
    id: 4,
    icon: Camera,
    title: "Фото до/после",
    description: "Делайте фотографии работы. Это повышает доверие и демонстрирует качество.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    id: 5,
    icon: CheckCircle,
    title: "Точность сроков",
    description: "Приходите вовремя и выполняйте работу в указанные сроки.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  {
    id: 6,
    icon: Target,
    title: "Честная цена",
    description: "Предлагайте справедливые цены. Завышенные расценки отпугивают клиентов.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  {
    id: 7,
    icon: TrendingUp,
    title: "Развитие навыков",
    description: "Изучайте новые техники и инструменты. Профессиональный рост увеличивает доходы.",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10"
  },
  {
    id: 8,
    icon: Shield,
    title: "Гарантия качества",
    description: "Предлагайте гарантию на свою работу. Это повышает доверие клиентов.",
    color: "text-red-500",
    bgColor: "bg-red-500/10"
  }
];

export function ProTipsCarousel() {
  return (
    <div className="card-surface p-6 mb-8">
      <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
        <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
        Полезные советы и рекомендации
      </h3>
      
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {tips.map((tip) => (
            <CarouselItem key={tip.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full ${tip.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <tip.icon className={`w-6 h-6 ${tip.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2 leading-tight">{tip.title}</h4>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                    {tip.description}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}