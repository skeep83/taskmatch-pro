import { Link, useLocation } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  badge?: string;
  isActive?: boolean;
}

export const BottomNavigation = () => {
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const navItems: BottomNavItem[] = [
    {
      icon: Home,
      label: "Главная",
      href: "/",
      isActive: location.pathname === "/"
    },
    {
      icon: Search,
      label: "Поиск",
      href: "/catalog",
      isActive: location.pathname === "/catalog"
    },
    {
      icon: Plus,
      label: "Создать",
      href: "/job/new",
      isActive: location.pathname === "/job/new"
    },
    {
      icon: MessageCircle,
      label: "Сообщения",
      href: "/messages",
      badge: unreadCount > 0 ? unreadCount.toString() : undefined,
      isActive: location.pathname === "/messages"
    },
    {
      icon: User,
      label: "Профиль",
      href: "/profile/settings",
      isActive: location.pathname.startsWith("/profile")
    }
  ];

  // Показывать только на мобильных устройствах
  const shouldShow = typeof window !== 'undefined' && window.innerWidth < 768;
  if (!shouldShow) return null;

  return (
    <nav className="bottom-nav md:hidden">
      <div className="container mx-auto px-4">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "bottom-nav-item touch-manipulation",
                item.isActive && "active"
              )}
              aria-label={item.label}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 text-xs flex items-center justify-center p-0 min-w-[20px]"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};