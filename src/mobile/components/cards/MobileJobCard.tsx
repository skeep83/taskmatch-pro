import React from 'react';
import { MapPin, Clock, DollarSign, User, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MobileCard } from '../ui/MobileCard';
import { Badge } from '@/components/ui/badge';

interface MobileJobCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    budget_min?: number;
    budget_max?: number;
    location?: string;
    created_at: string;
    category_name?: string;
    client_name?: string;
    client_rating?: number;
    urgency?: 'low' | 'medium' | 'high';
    status?: string;
  };
  onPress?: () => void;
  className?: string;
}

export function MobileJobCard({ job, onPress, className }: MobileJobCardProps) {
  const urgencyColors = {
    low: 'bg-green-500/10 text-green-700 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    high: 'bg-red-500/10 text-red-700 border-red-500/20'
  };

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
            {job.title}
          </h3>
          {job.category_name && (
            <Badge variant="secondary" className="text-xs">
              {job.category_name}
            </Badge>
          )}
        </div>
        
        {job.urgency && (
          <Badge 
            variant="outline" 
            className={cn("ml-2 text-xs", urgencyColors[job.urgency])}
          >
            {job.urgency === 'high' ? 'Срочно' : 
             job.urgency === 'medium' ? 'Средне' : 'Обычно'}
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
        {job.description}
      </p>

      {/* Info row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          {job.location && (
            <div className="flex items-center">
              <MapPin size={14} className="mr-1" />
              <span className="truncate max-w-[100px]">{job.location}</span>
            </div>
          )}
          
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            <span>{new Date(job.created_at).toLocaleDateString('ru')}</span>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        {/* Budget */}
        <div className="flex items-center text-primary font-semibold">
          <DollarSign size={16} className="mr-1" />
          <span>
            {job.budget_min && job.budget_max 
              ? `${job.budget_min}-${job.budget_max} MDL`
              : job.budget_min 
                ? `от ${job.budget_min} MDL`
                : 'Договорная'}
          </span>
        </div>

        {/* Client info */}
        {job.client_name && (
          <div className="flex items-center text-sm text-muted-foreground">
            <User size={14} className="mr-1" />
            <span className="truncate max-w-[80px]">{job.client_name}</span>
            {job.client_rating && (
              <div className="flex items-center ml-2">
                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                <span>{job.client_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status indicator */}
      {job.status && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <Badge 
            variant={job.status === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {job.status === 'active' ? 'Активен' : 
             job.status === 'completed' ? 'Завершен' : 
             job.status === 'in_progress' ? 'В работе' : job.status}
          </Badge>
        </div>
      )}
    </MobileCard>
  );
}