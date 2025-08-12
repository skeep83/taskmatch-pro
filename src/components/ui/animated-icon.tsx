import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnimatedIconProps = {
  icon: LucideIcon;
  size?: number;
  className?: string;
  glow?: boolean;
  delayMs?: number;
};

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({ icon: Icon, size = 28, className, glow = true, delayMs = 0 }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-primary",
        glow && "animate-glow-soft",
        "animate-float-slow hover:scale-110 transition-transform", 
        className
      )}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-hidden
    >
      <Icon size={size} />
    </span>
  );
};

export default AnimatedIcon;
