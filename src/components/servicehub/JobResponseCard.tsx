import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Shield, MessageCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobResponse {
  id: string;
  provider: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    responseTime: number; // в минутах
    verificationLevel: 'basic' | 'verified' | 'premium';
  };
  price: number;
  currency: string;
  estimatedHours?: number;
  warranty: number; // в днях
  eta: string;
  comment: string;
  portfolioSamples?: string[]; // URLs изображений
  createdAt: Date;
  status: 'pending' | 'selected' | 'declined';
}

interface JobResponseCardProps {
  response: JobResponse;
  isOwner: boolean;
  onSelect?: (responseId: string) => void;
  onMessage?: (providerId: string) => void;
  onViewProfile?: (providerId: string) => void;
  className?: string;
}

export const JobResponseCard: React.FC<JobResponseCardProps> = ({
  response,
  isOwner,
  onSelect,
  onMessage,
  onViewProfile,
  className
}) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price / 100);
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    return `${days} дн`;
  };

  const getVerificationBadge = (level: string) => {
    switch (level) {
      case 'premium':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">Премиум</Badge>;
      case 'verified':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Проверен</Badge>;
      default:
        return null;
    }
  };

  const timeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
  };

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 transition-all duration-200",
      response.status === 'selected' && "ring-2 ring-green-500/20 border-green-200 dark:border-green-800",
      response.status === 'declined' && "opacity-60",
      className
    )}>
      {/* Header - Провайдер */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar 
            className="h-12 w-12 cursor-pointer" 
            onClick={() => onViewProfile?.(response.provider.id)}
          >
            <AvatarImage src={response.provider.avatar} />
            <AvatarFallback>{response.provider.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary transition-colors"
                onClick={() => onViewProfile?.(response.provider.id)}
              >
                {response.provider.name}
              </h3>
              {getVerificationBadge(response.provider.verificationLevel)}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-500 fill-current" />
                <span className="font-medium">{response.provider.rating}</span>
                <span>({response.provider.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Отвечает за {formatResponseTime(response.provider.responseTime)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatPrice(response.price, response.currency)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo(response.createdAt)}
          </div>
        </div>
      </div>

      {/* Детали предложения */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {response.estimatedHours && (
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Clock size={16} className="mx-auto mb-1 text-gray-600 dark:text-gray-400" />
            <div className="text-sm font-medium">{response.estimatedHours} ч</div>
            <div className="text-xs text-gray-500">Время работы</div>
          </div>
        )}
        
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Shield size={16} className="mx-auto mb-1 text-gray-600 dark:text-gray-400" />
          <div className="text-sm font-medium">{response.warranty} дн</div>
          <div className="text-xs text-gray-500">Гарантия</div>
        </div>

        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Calendar size={16} className="mx-auto mb-1 text-gray-600 dark:text-gray-400" />
          <div className="text-sm font-medium">{response.eta}</div>
          <div className="text-xs text-gray-500">Готов выехать</div>
        </div>
      </div>

      {/* Комментарий */}
      {response.comment && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {response.comment}
          </p>
        </div>
      )}

      {/* Примеры работ */}
      {response.portfolioSamples && response.portfolioSamples.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {response.portfolioSamples.slice(0, 3).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Пример работы ${index + 1}`}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
              />
            ))}
            {response.portfolioSamples.length > 3 && (
              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                +{response.portfolioSamples.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Действия */}
      <div className="flex gap-2">
        {isOwner && response.status === 'pending' && (
          <Button 
            onClick={() => onSelect?.(response.id)}
            className="flex-1"
          >
            Выбрать исполнителя
          </Button>
        )}
        
        {response.status === 'selected' && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 px-4 py-2">
            Выбран
          </Badge>
        )}

        {response.status === 'declined' && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200 px-4 py-2">
            Отклонён
          </Badge>
        )}

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onMessage?.(response.provider.id)}
          className="gap-1"
        >
          <MessageCircle size={16} />
          Сообщение
        </Button>
      </div>
    </div>
  );
};