import { Link } from "react-router-dom";
import { Clock, MapPin, User, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface MobileJobCardProps {
  job: {
    id: string;
    description: string;
    status: string;
    scheduled_at?: string;
    budget_min_cents: number;
    budget_max_cents: number;
    client_id?: string;
    location?: string;
    category?: string;
    pro_id?: string;
  };
  variant?: "available" | "my-job" | "compact";
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export const MobileJobCard = ({ 
  job, 
  variant = "available",
  onAction,
  actionLabel,
  className 
}: MobileJobCardProps) => {
  const { formatPrice } = useCurrency();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Новый';
      case 'accepted': return 'Принят';
      case 'in_progress': return 'В работе';
      case 'done': return 'Выполнен';
      default: return status;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Сегодня';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border shadow-sm transition-all hover:shadow-md",
      variant === "compact" ? "p-3" : "p-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-medium text-foreground line-clamp-2",
            variant === "compact" ? "text-sm" : "text-base"
          )}>
            {job.description}
          </h3>
          {job.category && (
            <span className="inline-block mt-1 px-2 py-1 bg-secondary/50 text-secondary-foreground text-xs rounded-full">
              {job.category}
            </span>
          )}
        </div>
        
        {variant === "my-job" && (
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0",
            getStatusColor(job.status)
          )}>
            {getStatusLabel(job.status)}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{formatDate(job.scheduled_at)}</span>
            </div>
            {job.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="text-xs line-clamp-1">{job.location}</span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="font-semibold text-green-600">
              {formatPrice(job.budget_min_cents)} - {formatPrice(job.budget_max_cents)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {variant === "my-job" && job.client_id && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Клиент</span>
            </div>
          )}
          {variant === "available" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              <span>4.8</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {variant === "available" && (
            <button 
              onClick={onAction}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium hover:bg-primary/90 transition-colors touch-manipulation"
            >
              {actionLabel || "Откликнуться"}
            </button>
          )}
          
          {variant === "my-job" && (
            <Link 
              to={`/job/${job.id}`}
              className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-xs font-medium hover:bg-secondary/80 transition-colors touch-manipulation"
            >
              Подробнее
            </Link>
          )}
          
          {variant === "compact" && (
            <Link 
              to={`/job/${job.id}`}
              className="text-primary text-xs font-medium hover:text-primary/80 transition-colors"
            >
              Смотреть
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};