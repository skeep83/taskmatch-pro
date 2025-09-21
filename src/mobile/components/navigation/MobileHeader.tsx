import React from 'react';
import { ArrowLeft, Bell, Search, MoreHorizontal } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/mobile/providers/MobileProvider';
import { motion } from 'framer-motion';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  className?: string;
  children?: React.ReactNode;
  transparent?: boolean;
}

export function MobileHeader({
  title,
  showBack = false,
  showSearch = false,
  showNotifications = false,
  showMenu = false,
  className,
  children,
  transparent = false
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { safeAreaInsets } = useMobile();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-40",
        "flex items-center justify-between px-4 h-14",
        transparent 
          ? "bg-transparent" 
          : "bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]",
        "rounded-b-2xl mx-2 mt-2",
        className
      )}
      style={{ paddingTop: safeAreaInsets.top }}
    >
      {/* Left section */}
      <div className="flex items-center min-w-0 flex-1">
        {showBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-2 p-2 h-10 w-10 rounded-full"
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        
        {title && (
          <h1 className="text-lg font-semibold truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Center section */}
      {children && (
        <div className="flex-1 flex justify-center">
          {children}
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center space-x-2 min-w-0 flex-1 justify-end">
        {showSearch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/catalog')}
            className="p-2 h-10 w-10 rounded-full"
          >
            <Search size={20} />
          </Button>
        )}
        
        {showNotifications && (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-10 w-10 rounded-full relative"
          >
            <Bell size={20} />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-destructive-foreground text-xs font-bold">2</span>
            </div>
          </Button>
        )}
        
        {showMenu && (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-10 w-10 rounded-full"
          >
            <MoreHorizontal size={20} />
          </Button>
        )}
      </div>
    </motion.header>
  );
}