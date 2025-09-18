import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  color: string;
  disabled?: boolean;
}

interface MobileQuickActionsProps {
  actions: QuickAction[];
  title?: string;
  className?: string;
  variant?: "grid" | "horizontal";
  columns?: 3 | 4;
}

export const MobileQuickActions = ({ 
  actions, 
  title = "Быстрые действия",
  className,
  variant = "grid",
  columns = 3
}: MobileQuickActionsProps) => {
  
  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600", 
      yellow: "bg-yellow-100 text-yellow-600",
      purple: "bg-purple-100 text-purple-600",
      red: "bg-red-100 text-red-600",
      orange: "bg-orange-100 text-orange-600",
      pink: "bg-pink-100 text-pink-600",
    };
    return colorMap[color as keyof typeof colorMap] || "bg-gray-100 text-gray-600";
  };

  const ActionButton = ({ action }: { action: QuickAction }) => {
    const content = (
      <div className={cn(
        "flex flex-col items-center p-3 rounded-xl transition-colors touch-manipulation",
        action.disabled 
          ? "bg-secondary/30 opacity-50 cursor-not-allowed"
          : "bg-background hover:bg-secondary/50"
      )}>
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center mb-2",
          getColorClasses(action.color),
          action.disabled && "opacity-50"
        )}>
          <action.icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-center line-clamp-2">
          {action.label}
        </span>
      </div>
    );

    if (action.disabled) {
      return <div>{content}</div>;
    }

    if (action.href) {
      return <Link to={action.href}>{content}</Link>;
    }

    return <button onClick={action.onClick}>{content}</button>;
  };

  if (variant === "horizontal") {
    return (
      <div className={cn("md:hidden", className)}>
        {title && (
          <h3 className="text-lg font-semibold mb-4 px-4">{title}</h3>
        )}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4">
          {actions.map((action, index) => (
            <div key={index} className="flex-shrink-0 w-20">
              <ActionButton action={action} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("md:hidden", className)}>
      <div className="bg-card rounded-2xl p-4 shadow-sm border">
        {title && (
          <h3 className="text-sm font-semibold mb-4">{title}</h3>
        )}
        <div className={cn(
          "grid gap-3",
          columns === 3 ? "grid-cols-3" : "grid-cols-4"
        )}>
          {actions.map((action, index) => (
            <ActionButton key={index} action={action} />
          ))}
        </div>
      </div>
    </div>
  );
};