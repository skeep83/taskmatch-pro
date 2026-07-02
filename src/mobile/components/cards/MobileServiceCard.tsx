import { default as React } from 'react';
import { Star, MapPin, Clock, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MobileCard } from '../ui/MobileCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MobileServiceCardProps {
  service: {
    id: string;
    title: string;
    description: string;
    price_min?: number;
    price_max?: number;
    provider_name: string;
    provider_rating: number;
    provider_avatar?: string;
    location?: string;
    category_name?: string;
    response_time?: string;
    verified?: boolean;
    available?: boolean;
  };
  onPress?: () => void;
  onBook?: () => void;
  className?: string;
}

export function MobileServiceCard({ service, onPress, onBook, className }: MobileServiceCardProps) {
  return (
    <MobileCard
      pressable
      onPress={onPress}
      className={cn("mb-4", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-tight mb-1 truncate">
            {service.title}
          </h3>
          {service.category_name && (
            <Badge variant="secondary" className="text-xs">
              {service.category_name}
            </Badge>
          )}
        </div>

        {service.verified && (
          <Badge
            variant="outline"
            className="ml-2 text-xs bg-green-500/10 text-green-700 border-green-500/20"
          >
            <Shield size={12} className="mr-1" />
            Профиль
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
        {service.description}
      </p>

      {/* Provider Info */}
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mr-3">
          {service.provider_avatar ? (
            <img
              src={service.provider_avatar}
              alt={service.provider_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-primary">
              {service.provider_name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{service.provider_name}</p>
          <div className="flex items-center">
            <Star size={12} className="text-yellow-500 fill-current mr-1" />
            <span className="text-sm text-muted-foreground">
              {service.provider_rating.toFixed(1)}
            </span>
            {service.response_time && (
              <>
                <span className="mx-2 text-muted-foreground">•</span>
                <Clock size={12} className="mr-1" />
                <span className="text-sm text-muted-foreground">
                  {service.response_time}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Location */}
      {service.location && (
        <div className="flex items-center mb-4 text-sm text-muted-foreground">
          <MapPin size={14} className="mr-1" />
          <span className="truncate">{service.location}</span>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        {/* Price */}
        <div className="text-primary font-semibold">
          {service.price_min && service.price_max
            ? `${service.price_min}-${service.price_max} MDL`
            : service.price_min
              ? `от ${service.price_min} MDL`
              : 'Договорная'}
        </div>

        {/* Book Button */}
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onBook?.();
          }}
          disabled={!service.available}
          className="rounded-full px-4 h-8"
        >
          {service.available ? 'Заказать' : 'Недоступен'}
        </Button>
      </div>

      {/* Availability indicator */}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
        <div className="flex items-center">
          <div className={cn(
            "w-2 h-2 rounded-full mr-2",
            service.available ? "bg-green-500" : "bg-gray-400"
          )} />
          <span className="text-xs text-muted-foreground">
            {service.available ? 'Доступен сейчас' : 'Занят'}
          </span>
        </div>
      </div>
    </MobileCard>
  );
}