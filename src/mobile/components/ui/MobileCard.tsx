import React from 'react';
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
      "rounded-3xl p-6 transition-all duration-300",
      gradient 
        ? "bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm" 
        : "bg-card",
      "border border-border/40 shadow-lg shadow-black/5",
      pressable && "hover:shadow-xl hover:shadow-black/10",
      className
    )}>
      {children}
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