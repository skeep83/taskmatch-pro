import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Eye, 
  UserCheck, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type JobStatusNew = 'Draft' | 'Published' | 'Assigned' | 'InProgress' | 'Submitted' | 'Completed' | 'Dispute' | 'Cancelled';

interface JobStatusBadgeProps {
  status: JobStatusNew;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig = {
  Draft: {
    label: 'Черновик',
    icon: FileText,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    darkColor: 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  },
  Published: {
    label: 'Опубликовано',
    icon: Eye,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    darkColor: 'dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
  },
  Assigned: {
    label: 'Назначено',
    icon: UserCheck,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    darkColor: 'dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
  },
  InProgress: {
    label: 'В работе',
    icon: Play,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    darkColor: 'dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
  },
  Submitted: {
    label: 'На проверке',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    darkColor: 'dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
  },
  Completed: {
    label: 'Завершено',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
    darkColor: 'dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
  },
  Dispute: {
    label: 'Спор',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200',
    darkColor: 'dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
  },
  Cancelled: {
    label: 'Отменено',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    darkColor: 'dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  }
};

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showIcon = true
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        config.color,
        config.darkColor,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
};