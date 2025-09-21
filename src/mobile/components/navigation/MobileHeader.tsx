import React from 'react';
import { ArrowLeft, Bell, Search, MoreHorizontal, ChevronDown, User, Briefcase, Building2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMobile } from '@/mobile/providers/MobileProvider';

interface DashboardOption {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  available: boolean;
}

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  className?: string;
  children?: React.ReactNode;
  transparent?: boolean;
  // Dashboard selector props
  showDashboardSelector?: boolean;
  dashboardOptions?: DashboardOption[];
  currentDashboard?: string;
  onDashboardChange?: (dashboard: string) => void;
}

export function MobileHeader({
  title,
  showBack = false,
  showSearch = false,
  showNotifications = false,
  showMenu = false,
  className,
  children,
  transparent = false,
  showDashboardSelector = false,
  dashboardOptions = [],
  currentDashboard = '',
  onDashboardChange
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { safeAreaInsets } = useMobile();
  const [selectorOpen, setSelectorOpen] = React.useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleDashboardSwitch = (dashboardValue: string) => {
    setSelectorOpen(false);
    onDashboardChange?.(dashboardValue);
  };

  const getCurrentDashboardOption = () => {
    return dashboardOptions.find(option => option.value === currentDashboard);
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
        {showDashboardSelector && (
          <div className="relative">
            <motion.button
              onClick={() => setSelectorOpen(!selectorOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-xl"
              whileTap={{ scale: 0.98 }}
            >
              {getCurrentDashboardOption()?.icon && 
                React.createElement(getCurrentDashboardOption()!.icon, { className: "h-4 w-4 text-primary" })
              }
              <ChevronDown className={`h-4 w-4 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
            </motion.button>
            
            {/* Dropdown Menu */}
            {selectorOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 mt-2 w-64 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl z-50 overflow-hidden"
              >
                {dashboardOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    onClick={() => handleDashboardSwitch(option.value)}
                    className={`w-full p-4 flex items-center gap-3 text-left transition-all hover:bg-white/20 ${
                      option.value === currentDashboard ? 'bg-white/10' : ''
                    }`}
                    disabled={!option.available}
                    whileTap={{ scale: 0.98 }}
                  >
                    <option.icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{option.label}</h4>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {!option.available && (
                      <Badge variant="secondary">Скоро</Badge>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        )}

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