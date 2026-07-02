import { default as React } from 'react';
import { MapPin, Clock, DollarSign, User, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { MobileCard } from '../ui/MobileCard';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEnhancedI18n } from "@/i18n/enhanced";

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
    client_avatar?: string;
    urgency?: 'low' | 'medium' | 'high';
    status?: string;
    job_photos?: Array<{ file_url: string }>;
  };
  onPress?: () => void;
  className?: string;
}

export function MobileJobCard({ job, onPress, className }: MobileJobCardProps) {
  const { t } = useEnhancedI18n();
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
      {/* Header with title, category and urgency */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-tight text-foreground mb-2">
            {job.title}
          </h3>
          <div className="flex items-center gap-2">
            {job.category_name && (
              <Badge variant="secondary" className="text-xs">
                {job.category_name}
              </Badge>
            )}
            {job.urgency && (
              <Badge
                variant="outline"
                className={cn("text-xs", urgencyColors[job.urgency])}
              >
                {job.urgency === 'high' ? t("dash.client.urg_urgent") :
                 job.urgency === 'medium' ? t("ui.sredne") : t("ui.obychno")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
        {job.description}
      </p>

      {/* Photos preview */}
      {job.job_photos && job.job_photos.length > 0 && (
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            {job.job_photos.slice(0, 3).map((photo, index) => (
              <div key={index} className="w-8 h-8 rounded border-2 border-white overflow-hidden shadow-sm">
                <img
                  src={`${SUPABASE_URL}/storage/v1/object/public/evidence/${photo.file_url}`}
                  alt={`Фото ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {job.job_photos.length} фото
          </span>
        </div>
      )}

      {/* Location and date */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {job.location && (
          <div className="flex items-center">
            <MapPin size={14} className="mr-1.5" />
            <span className="truncate max-w-[140px]">{job.location}</span>
          </div>
        )}

        <div className="flex items-center">
          <Clock size={14} className="mr-1.5" />
          <span>{new Date(job.created_at).toLocaleDateString('ru')}</span>
        </div>
      </div>

      {/* Budget */}
      <div className="flex items-center font-semibold text-primary">
        <DollarSign size={16} className="mr-1.5" />
        <span>
          {job.budget_min && job.budget_max
            ? `${job.budget_min}-${job.budget_max} MDL`
            : job.budget_min
              ? `от ${job.budget_min} MDL`
              : t("dash.pro.negotiable")}
        </span>
      </div>

      {/* Client info */}
      {job.client_name && (
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={job.client_avatar} />
              <AvatarFallback className="text-xs">
                {job.client_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[120px]">{job.client_name}</span>
          </div>
          {job.client_rating && (
            <div className="flex items-center">
              <Star size={12} className="text-yellow-500 fill-current mr-1" />
              <span className="text-sm font-medium">{job.client_rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {job.status && (
        <div className="pt-3 border-t border-border/30">
          <Badge
            variant={(() => {
              const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                'Published': 'default',
                'Assigned': 'secondary',
                'InProgress': 'secondary',
                'Submitted': 'secondary',
                'Completed': 'outline',
                'Cancelled': 'destructive',
                'active': 'default',
                'completed': 'outline',
                'in_progress': 'secondary',
                'pending': 'secondary',
                'cancelled': 'destructive',
              };
              return statusMap[job.status] || 'secondary';
            })()}
            className="text-xs"
          >
            {(() => {
              const labelMap: Record<string, string> = {
                'Published': t("ui.opublikovan"),
                'Assigned': t("ui.naznachen"),
                'InProgress': t("status.in_progress"),
                'Submitted': t("ui.na_proverke"),
                'Completed': t("biz.tenders.status_done"),
                'Cancelled': t("status.canceled"),
                'active': t("ui.aktiven"),
                'completed': t("biz.tenders.status_done"),
                'in_progress': t("status.in_progress"),
                'pending': t("ui.v_ozhidanii"),
                'cancelled': t("status.canceled"),
              };
              return labelMap[job.status] || job.status;
            })()}
          </Badge>
        </div>
      )}
    </MobileCard>
  );
}