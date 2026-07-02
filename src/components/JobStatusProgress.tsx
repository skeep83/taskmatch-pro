import React from "react";
import { CheckCircle, Clock, PlayCircle, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JobStatusProgressProps {
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'cancelled';
  startConfirmed?: boolean;
  endConfirmed?: boolean;
  className?: string;
}

const statusSteps = [
  { key: 'new', label: 'Создан', icon: AlertCircle },
  { key: 'accepted', label: 'Принят', icon: CheckCircle },
  { key: 'in_progress', label: 'Выполняется', icon: PlayCircle },
  { key: 'done', label: 'Завершен', icon: CheckCircle }
];

const getStatusInfo = (status: string) => {
  const statusMap = {
    'new': { label: 'Новый', variant: 'secondary' as const, color: 'text-gray-500' },
    'accepted': { label: 'Принят', variant: 'default' as const, color: 'text-blue-500' },
    'in_progress': { label: 'В работе', variant: 'default' as const, color: 'text-yellow-500' },
    'done': { label: 'Выполнен', variant: 'default' as const, color: 'text-green-500' },
    'cancelled': { label: 'Отменен', variant: 'destructive' as const, color: 'text-red-500' }
  };

  return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const, color: 'text-gray-500' };
};

const getProgressValue = (status: string) => {
  switch (status) {
    case 'new': return 25;
    case 'accepted': return 50;
    case 'in_progress': return 75;
    case 'done': return 100;
    case 'cancelled': return 0;
    default: return 0;
  }
};

export function JobStatusProgress({
  status,
  startConfirmed = false,
  endConfirmed = false,
  className = ""
}: JobStatusProgressProps) {

  const statusInfo = getStatusInfo(status);
  const progressValue = getProgressValue(status);
  const currentStepIndex = statusSteps.findIndex(step => step.key === status);

  if (status === 'cancelled') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <XCircle className={`h-5 w-5 ${statusInfo.color}`} />
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">Заказ был отменен</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Status Badge */}
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-full bg-background border ${statusInfo.color}`}>
          {React.createElement(statusSteps[Math.max(0, currentStepIndex)]?.icon || AlertCircle, {
            className: "h-4 w-4"
          })}
        </div>
        <Badge variant={statusInfo.variant} className="flex items-center gap-1">
          <span>{statusInfo.label}</span>
          {React.createElement(statusSteps[Math.max(0, currentStepIndex)]?.icon || AlertCircle, {
            className: "h-3 w-3 flex-shrink-0"
          })}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Прогресс выполнения</span>
          <span className="animate-fade-in">{progressValue}%</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000 ease-out animate-progress-fill"
            style={{
              width: `${progressValue}%`,
              '--progress-width': `${progressValue}%`
            } as React.CSSProperties}
          />
          {progressValue > 0 && (
            <div
              className="absolute top-0 h-full w-4 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${Math.max(0, progressValue - 15)}%`,
                animationDuration: '2s'
              }}
            />
          )}
        </div>
      </div>

      {/* Status Steps */}
      <div className="space-y-3">
        {statusSteps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isCurrent ? 'animate-fade-in' : ''
              }`}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className={`p-2 rounded-full border transition-all duration-500 ${
                isCompleted
                  ? 'bg-primary text-primary-foreground border-primary animate-scale-in'
                  : 'bg-muted text-muted-foreground border-muted'
              } ${isCurrent ? 'ring-2 ring-primary/20 animate-pulse' : ''}`}>
                <StepIcon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  isCurrent ? 'text-foreground' :
                  isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </p>
                {step.key === 'new' && status === 'new' && (
                  <p className="text-xs text-muted-foreground">
                    Заказ опубликован, ожидает откликов специалистов
                  </p>
                )}
                {step.key === 'accepted' && status === 'accepted' && (
                  <p className="text-xs text-muted-foreground">
                    Исполнитель выбран, ожидается начало работ
                  </p>
                )}
                {step.key === 'in_progress' && status === 'in_progress' && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Работы ведутся</p>
                    {startConfirmed && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Начало работ подтверждено</span>
                      </div>
                    )}
                  </div>
                )}
                {step.key === 'done' && status === 'done' && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>{endConfirmed ? 'Заказ успешно выполнен' : 'Заказ выполнен, ожидает подтверждения'}</p>
                    {endConfirmed && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Подтверждено</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isCurrent && (
                <div className="flex items-center gap-1 animate-fade-in">
                  <Clock className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-xs text-primary font-medium">В процессе</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      {status === 'in_progress' && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in">
          <p className="text-sm text-primary font-medium">Работы в процессе выполнения</p>
          <p className="text-xs text-muted-foreground mt-1">
            Вы можете связаться со специалистом через чат для уточнения деталей
          </p>
        </div>
      )}

      {status === 'done' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-scale-in">
          <p className="text-sm text-green-700 font-medium">Заказ выполнен!</p>
          <p className="text-xs text-green-600 mt-1">
            Не забудьте оставить отзыв о работе специалиста
          </p>
        </div>
      )}
    </div>
  );
}