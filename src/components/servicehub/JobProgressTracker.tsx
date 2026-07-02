import React from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobStatusNew } from './JobStatusBadge';

interface JobProgressTrackerProps {
  currentStatus: JobStatusNew;
  timeLeft?: string;
  showAcceptanceDeadline?: boolean;
  acceptanceDeadline?: Date;
}

const progressSteps = [
  { status: 'Published', label: 'Опубликовано', description: 'Заявка размещена' },
  { status: 'Assigned', label: 'Назначено', description: 'Исполнитель выбран' },
  { status: 'InProgress', label: 'В работе', description: 'Работа выполняется' },
  { status: 'Submitted', label: 'На проверке', description: 'Ожидает приёмки' },
  { status: 'Completed', label: 'Завершено', description: 'Работа принята' }
];

const statusOrder: Record<JobStatusNew, number> = {
  Draft: 0,
  Published: 1,
  Assigned: 2,
  InProgress: 3,
  Submitted: 4,
  Completed: 5,
  Dispute: 4.5,
  Cancelled: -1
};

export const JobProgressTracker: React.FC<JobProgressTrackerProps> = ({
  currentStatus,
  timeLeft,
  showAcceptanceDeadline = false,
  acceptanceDeadline
}) => {
  const currentOrder = statusOrder[currentStatus];
  const isDispute = currentStatus === 'Dispute';
  const isCancelled = currentStatus === 'Cancelled';

  const getStepStatus = (stepIndex: number) => {
    if (isCancelled) return 'cancelled';
    if (isDispute && stepIndex >= 3) return 'dispute';
    if (stepIndex < currentOrder) return 'completed';
    if (stepIndex === currentOrder) return 'current';
    return 'pending';
  };

  const formatTimeLeft = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return 'Время истекло';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} дн.`;
    }
    
    return `${hours}ч ${minutes}м`;
  };

  return (
    <div className="bg-neo neo-8 rounded-xl p-6 border-0">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Прогресс заказа</h3>
        {showAcceptanceDeadline && acceptanceDeadline && currentStatus === 'Submitted' && (
          <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg">
            <Clock size={16} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              {formatTimeLeft(acceptanceDeadline)}
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        {progressSteps.map((step, index) => {
          const stepStatus = getStepStatus(index + 1);
          
          return (
            <div key={step.status} className="relative flex items-start gap-4 pb-8 last:pb-0">
              {/* Step Icon */}
              <div className={cn(
                "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                stepStatus === 'completed' && "bg-green-500 border-green-500",
                stepStatus === 'current' && "bg-blue-500 border-blue-500",
                stepStatus === 'dispute' && "bg-red-500 border-red-500",
                stepStatus === 'cancelled' && "bg-gray-400 border-gray-400",
                stepStatus === 'pending' && "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
              )}>
                {stepStatus === 'completed' && (
                  <CheckCircle size={16} className="text-white" />
                )}
                {stepStatus === 'current' && (
                  <Circle size={16} className="text-white fill-current" />
                )}
                {stepStatus === 'dispute' && (
                  <AlertTriangle size={16} className="text-white" />
                )}
                {stepStatus === 'cancelled' && (
                  <Circle size={16} className="text-white" />
                )}
                {stepStatus === 'pending' && (
                  <Circle size={16} className="text-gray-400 dark:text-gray-600" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-medium text-sm transition-colors duration-300",
                  stepStatus === 'completed' && "text-green-700 dark:text-green-400",
                  stepStatus === 'current' && "text-blue-700 dark:text-blue-400",
                  stepStatus === 'dispute' && "text-red-700 dark:text-red-400",
                  stepStatus === 'cancelled' && "text-gray-500 dark:text-gray-400",
                  stepStatus === 'pending' && "text-gray-500 dark:text-gray-400"
                )}>
                  {step.label}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Special Status Messages */}
      {isDispute && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Заказ находится в споре
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Администрация рассматривает спорную ситуацию
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Circle size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Заказ отменён
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Работа по заказу была прекращена
          </p>
        </div>
      )}
    </div>
  );
};