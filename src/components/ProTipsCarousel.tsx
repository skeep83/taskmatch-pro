import { Card, CardContent } from "@/components/ui/card";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { 
  Shield, 
  Clock, 
  MessageSquare, 
  Star, 
  CheckCircle,
  CreditCard,
  AlertTriangle,
  Lightbulb
} from "lucide-react";

const tips = [
  {
    icon: Shield,
    title: "Безопасность платежей",
    description: "Ваши средства находятся в эскроу до завершения работ. Это гарантирует безопасность сделки.",
    color: "text-green-600"
  },
  {
    icon: Clock,
    title: "Время ответа",
    description: "Специалисты обычно отвечают в течение 15 минут. Следите за уведомлениями.",
    color: "text-blue-600"
  },
  {
    icon: MessageSquare,
    title: "Общение со специалистом",
    description: "Обсуждайте детали работы в чате. Это поможет избежать недопониманий.",
    color: "text-purple-600"
  },
  {
    icon: Star,
    title: "Оценка качества",
    description: "После завершения работ оставьте отзыв. Это поможет другим клиентам.",
    color: "text-yellow-600"
  },
  {
    icon: CheckCircle,
    title: "Подтверждение работ",
    description: "Проверьте результат перед подтверждением завершения. У вас есть гарантия качества.",
    color: "text-green-600"
  },
  {
    icon: CreditCard,
    title: "Способы оплаты",
    description: "Принимаем карты, электронные кошельки и банковские переводы.",
    color: "text-indigo-600"
  },
  {
    icon: AlertTriangle,
    title: "Срочные заказы",
    description: "Для срочных работ выберите соответствующий приоритет при создании заказа.",
    color: "text-red-600"
  },
  {
    icon: Lightbulb,
    title: "Подготовка к работе",
    description: "Опишите задачу максимально подробно и добавьте фото для лучшего понимания.",
    color: "text-amber-600"
  }
];

export function ProTipsCarousel() {
  return (
    <div className="card-surface p-8">
      <h2 className="text-2xl font-semibold mb-6 text-center">Полезные советы</h2>
      <Carousel className="w-full max-w-5xl mx-auto">
        <CarouselContent>
          {tips.map((tip, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <Card className="h-full bg-gradient-to-br from-background to-background/50 border-0 shadow-lg">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-white/10 ${tip.color}`}>
                      <tip.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg">{tip.title}</h3>
                  </div>
                  <p className="text-muted-foreground flex-1 leading-relaxed">
                    {tip.description}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
}