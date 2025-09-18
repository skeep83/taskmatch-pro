import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  MessageCircle, 
  TrendingUp, 
  ChevronUp,
  Home,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const FloatingActionButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide/show based on scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
        setIsExpanded(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Don't show on certain pages
  if (location.pathname.includes('/admin') || location.pathname === '/auth') {
    return null;
  }

  const quickActions = [
    {
      href: "/",
      icon: Home,
      label: "Главная",
      variant: "secondary" as const,
      show: location.pathname !== "/"
    },
    {
      href: "/catalog",
      icon: Search,
      label: "Поиск",
      variant: "secondary" as const,
      show: location.pathname !== "/catalog"
    },
    {
      href: "/job/new",
      icon: Plus,
      label: "Заказать",
      variant: "default" as const,
      show: true,
      primary: true
    },
    {
      href: "/feed",
      icon: TrendingUp,
      label: "Лента",
      variant: "secondary" as const,
      badge: "5",
      show: location.pathname !== "/feed"
    },
    {
      href: "/messages",
      icon: MessageCircle,
      label: "Чат",
      variant: "secondary" as const,
      badge: "2",
      show: location.pathname !== "/messages"
    }
  ].filter(action => action.show);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        y: isVisible ? 0 : 100 
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed bottom-6 right-6 z-50 md:hidden"
    >
      <div className="flex flex-col items-end gap-3">
        {/* Expanded Actions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-2"
            >
              {quickActions.slice(0, -1).reverse().map((action, index) => (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <Button
                    variant={action.variant}
                    size="sm"
                    asChild
                    className={cn(
                      "relative shadow-lg h-12 px-4 flex items-center gap-2 min-w-[120px] justify-start",
                      "glass-surface backdrop-blur-md border-border/50"
                    )}
                  >
                    <Link to={action.href} onClick={() => setIsExpanded(false)}>
                      <action.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{action.label}</span>
                      {action.badge && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {action.badge}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <div className="relative">
          <Button
            size="lg"
            variant={isExpanded ? "secondary" : "default"}
            className={cn(
              "relative h-14 w-14 rounded-full shadow-lg hover-float",
              isExpanded 
                ? "bg-muted border-border" 
                : "btn-hero animate-pulse-glow"
            )}
            onClick={() => {
              if (quickActions.length > 1) {
                setIsExpanded(!isExpanded);
              } else {
                // If only one action, navigate directly
                navigate(quickActions[0].href);
              }
            }}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isExpanded ? (
                <ChevronUp className="h-6 w-6" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
            </motion.div>
          </Button>

          {/* Notification dots */}
          {!isExpanded && quickActions.some(action => action.badge) && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-xs text-destructive-foreground font-bold">
                {quickActions.reduce((total, action) => 
                  total + (action.badge ? parseInt(action.badge) : 0), 0
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/20 backdrop-blur-sm -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </motion.div>
  );
};