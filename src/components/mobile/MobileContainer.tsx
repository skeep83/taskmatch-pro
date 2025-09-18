import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileContainerProps {
  children: ReactNode;
  className?: string;
  withBottomNav?: boolean;
  withPadding?: boolean;
}

export const MobileContainer = ({ 
  children, 
  className, 
  withBottomNav = true,
  withPadding = true 
}: MobileContainerProps) => {
  return (
    <div className={cn(
      "min-h-screen",
      withBottomNav && "pb-[80px] md:pb-0", // Отступ для bottom navigation
      withPadding && "px-4 md:px-6",
      "safe-area-top safe-area-left safe-area-right",
      className
    )}>
      {children}
    </div>
  );
};