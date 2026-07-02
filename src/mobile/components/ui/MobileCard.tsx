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
      "bg-neo",
      gradient && "bg-gradient-to-br from-[#E5E7EB]/90 to-[#E5E7EB]/60 backdrop-blur-sm",
      "neo-8",
      pressable && "active:neo-inset-4",
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