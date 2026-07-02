import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassMorphismProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  intensity?: "light" | "medium" | "strong";
  variant?: "default" | "gradient" | "bordered";
}

export const GlassMorphism = React.forwardRef<HTMLDivElement, GlassMorphismProps>(
  ({ className, children, intensity = "medium", variant = "default", ...props }, ref) => {
    const intensityClasses = {
      light: "backdrop-blur-sm bg-white/5 border-white/10",
      medium: "backdrop-blur-md bg-white/10 border-white/20",
      strong: "backdrop-blur-xl bg-white/20 border-white/30"
    };

    const variantClasses = {
      default: "",
      gradient: "bg-gradient-to-br from-white/20 via-white/10 to-white/5",
      bordered: "border-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl border transition-all duration-300",
          intensityClasses[intensity],
          variantClasses[variant],
          "before:absolute before:inset-0 before:rounded-2xl",
          "before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent",
          "before:pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -top-40 -bottom-40 hidden bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-12 animate-[shimmer_3s_ease-in-out_infinite] pointer-events-none lg:block" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

GlassMorphism.displayName = "GlassMorphism";