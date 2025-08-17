import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  hover?: boolean;
  glow?: boolean;
}

export const FloatingCard = React.forwardRef<HTMLDivElement, FloatingCardProps>(
  ({ className, children, delay = 0, hover = true, glow = false, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    }, [delay]);

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-700 ease-out",
          "bg-gradient-to-br from-card/80 via-card/60 to-card/80",
          "before:absolute before:inset-0 before:rounded-2xl before:padding-[1px]",
          "before:bg-gradient-to-br before:from-primary/30 before:via-transparent before:to-accent/30",
          "before:mask-composite-subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
          isVisible && "animate-fade-in",
          hover && "hover:scale-[1.01] hover:shadow-xl group",
          glow && "shadow-[0_0_30px_hsl(var(--primary)/0.2)]",
          className
        )}
        style={{ animationDelay: `${delay}ms` }}
        {...props}
      >
        {/* Glass reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none group-hover:animate-glow-soft" />
        
        {/* Content */}
        <div className="relative z-10 group-hover:animate-float-slow transition-transform duration-700 ease-out">
          {children}
        </div>
      </div>
    );
  }
);

FloatingCard.displayName = "FloatingCard";