import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  description?: string;
}

interface MobileStatsGridProps {
  stats: StatItem[];
  className?: string;
  variant?: "cards" | "horizontal-scroll";
}

export const MobileStatsGrid = ({ 
  stats, 
  className,
  variant = "horizontal-scroll" 
}: MobileStatsGridProps) => {
  
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

  if (variant === "horizontal-scroll") {
    return (
      <div className={cn("md:hidden mb-6", className)}>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {stats.map((stat, index) => (
            <div key={index} className="flex-shrink-0 w-36 bg-card rounded-2xl p-4 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  getColorClasses(stat.color)
                )}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-lg font-bold truncate">{stat.value}</p>
              {stat.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {stat.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-card rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              getColorClasses(stat.color)
            )}>
              <stat.icon className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm">{stat.label}</h3>
          </div>
          <p className="text-xl font-bold mb-1">{stat.value}</p>
          {stat.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {stat.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};