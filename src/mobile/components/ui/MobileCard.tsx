import { default as React } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  pressable?: boolean;
  onPress?: () => void;
  gradient?: boolean;
}

export function MobileCard({ 
  children, 
  className, 
  pressable = false, 
  onPress,
  gradient = false 
}: MobileCardProps) {
  const cardContent = (
    <div className={cn(
      "rounded-2xl p-4 transition-all duration-300",
      "bg-[#E5E7EB]",
      gradient && "bg-gradient-to-br from-[#E5E7EB]/90 to-[#E5E7EB]/60 backdrop-blur-sm",
      "shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB]",
      pressable && "active:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]",
      className
    )}>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  if (pressable && onPress) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onPress}
        className="touch-manipulation"
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}