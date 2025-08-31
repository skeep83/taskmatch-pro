import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  MessageCircle, 
  TrendingUp, 
  Briefcase,
  Menu,
  X,
  Home,
  Users,
  ShoppingCart,
  Calendar,
  BarChart3
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import serviceHubLogo from "@/assets/servicehub-logo-new.png";

type UserRole = 'client' | 'pro' | 'business';

export const AppNavigation = () => {
  const { t, changeLanguage, language } = useEnhancedI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('client');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const { unreadCount } = useNotifications();

  console.log('🔔 AppNavigation unreadCount:', unreadCount);

  // Load platform logo
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const { data: logoData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'platform_logo')
          .maybeSingle();
        
        if (logoData?.value) {
          setPlatformLogo(logoData.value as string);
        }
      } catch (error) {
        console.error('Error loading platform logo:', error);
      }
    };

    loadLogo();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isAuth = !!session?.user;
      setIsAuthenticated(isAuth);
      
      if (isAuth && session?.user) {
        // Use setTimeout to avoid blocking the auth state change
        setTimeout(async () => {
          try {
            // Load user roles
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .in("role", ['client', 'pro', 'business']);
            
            const rolesList = (roles || []).map((r: any) => r.role as UserRole);
            setUserRoles(rolesList);
            
            // Determine current role from path
            const currentPath = location.pathname;
            if (currentPath.includes('/dashboard/pro') && rolesList.includes('pro')) {
              setCurrentRole('pro');
            } else if (currentPath.includes('/dashboard/business') && rolesList.includes('business')) {
              setCurrentRole('business');
            } else {
              setCurrentRole('client');
            }
          } catch (error) {
            console.error('Error loading user roles:', error);
            // Set default state on error
            setUserRoles([]);
            setCurrentRole('client');
          }
        }, 0);
      } else {
        // Reset state when logged out
        setUserRoles([]);
        setCurrentRole('client');
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [location.pathname]); // Add location.pathname as dependency

  const mainNavItems = [
    {
      title: t("nav.catalog"),
      href: "/catalog",
      icon: Search,
      description: "Найти специалистов"
    },
    {
      title: t("nav.how_it_works"),
      href: "/how-it-works", 
      icon: BarChart3,
      description: "Узнать больше о платформе"
    }
  ];

  const serviceActions = [
    {
      title: "Заказать услугу",
      href: "/job/new",
      icon: Plus,
      variant: "default" as const,
      priority: true
    },
    {
      title: "Лента заказов",
      href: "/feed",
      icon: TrendingUp,
      variant: "ghost" as const,
      badge: userRoles.includes('pro') ? (unreadCount > 0 ? unreadCount.toString() : undefined) : undefined
    }
  ];

  const userActions = [
    {
      title: "Сообщения",
      href: "/messages",
      icon: MessageCircle,
      badge: unreadCount > 0 ? unreadCount.toString() : undefined
    }
  ];

  const quickAccess = [
    { 
      title: "Главная", 
      href: "/", 
      icon: Home,
      active: location.pathname === "/"
    },
    { 
      title: "Специалисты", 
      href: "/catalog", 
      icon: Users,
      active: location.pathname === "/catalog"
    },
    { 
      title: "Заказы", 
      href: "/feed", 
      icon: ShoppingCart,
      active: location.pathname === "/feed"
    },
    { 
      title: "Расписание", 
      href: "/pro/schedule", 
      icon: Calendar,
      active: location.pathname === "/pro/schedule",
      requiresRole: 'pro' as UserRole
    }
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <header className="w-full sticky top-0 z-[100] border-0 bg-white/80 backdrop-blur-md shadow-sm">
        <nav className="container mx-auto flex items-center justify-between py-3 px-6">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group flex-shrink-0 hover-scale" 
            aria-label={t("app.name")}
          > 
            {platformLogo ? (
              <img 
                src={platformLogo} 
                alt="ServiceHub Logo" 
                className="h-14 w-14 object-contain transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" 
              />
            ) : (
              <img 
                src={serviceHubLogo} 
                alt="ServiceHub Logo" 
                className="h-14 w-14 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" 
              />
            )}
          </Link>
          
          {/* Main Navigation - Desktop */}
          <div className="hidden lg:flex items-center">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Services Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium">
                    Услуги
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="card-surface border-0 shadow-none">
                      <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <Link
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                            to="/job/new"
                          >
                            <Plus className="h-6 w-6 mb-2" />
                            <div className="mb-2 mt-4 text-lg font-medium">
                              Новый заказ
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Создайте заказ за 3 минуты
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <ListItem href="/catalog" title="Каталог специалистов">
                        Найти проверенных профессионалов
                      </ListItem>
                      <ListItem href="/feed" title="Лента заказов">
                        Активные предложения работы
                      </ListItem>
                      <ListItem href="/tenders" title="Тендеры">
                        Корпоративные конкурсы
                      </ListItem>
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Quick Links */}
                {mainNavItems.map((item) => (
                  <NavigationMenuItem key={item.href}>
                    <Link to={item.href}>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        {item.title}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Actions for Authenticated Users */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-2">
                {serviceActions.map((action) => (
                  <Button
                    key={action.href}
                    variant={action.variant}
                    size="sm"
                    asChild
                    className={cn(
                      "relative",
                      action.priority && "bg-primary text-white hover:bg-primary/90 shadow-lg animate-pulse-glow"
                    )}
                  >
                    <Link to={action.href} className="flex items-center gap-2">
                      <action.icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{action.title}</span>
                      {action.badge && (
                        <Badge variant="secondary" className="ml-1 h-5 text-xs">
                          {action.badge}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                ))}
              </div>
            )}

            {/* Language switcher */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg card-surface border-0 shadow-none bg-transparent">
              <button 
                aria-label="Русский" 
                className={cn(
                  "text-xs px-2 py-1 rounded-md font-medium transition-all",
                  language === 'ru' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )} 
                onClick={() => changeLanguage('ru')}
              >
                RU
              </button>
              <button 
                aria-label="Română" 
                className={cn(
                  "text-xs px-2 py-1 rounded-md font-medium transition-all",
                  language === 'ro' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )} 
                onClick={() => changeLanguage('ro')}
              >
                RO
              </button>
            </div>
            
            {/* User-specific components */}
            {isAuthenticated ? (
              <>
                <NotificationCenter />
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  to="/auth" 
                  className="btn-hero text-sm px-6 py-2 whitespace-nowrap hover-scale shadow-lg"
                >
                  Войти
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" style={{ background: 'var(--background-neomorphic)' }}>
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <Link 
                to="/" 
                className="flex items-center gap-3" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <div 
                  className="h-8 w-8 rounded-lg" 
                  style={{background: "var(--gradient-primary)"}} 
                />
                <span className="text-lg font-display font-bold text-gradient">
                  {t("app.name")}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Quick Access */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {quickAccess
                .filter(item => !item.requiresRole || userRoles.includes(item.requiresRole))
                .map((item) => (
                <div
                  key={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "card-surface flex flex-col items-center gap-2 p-4 cursor-pointer transition-colors border-0",
                    item.active 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted/50"
                  )}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      navigate(item.href);
                    }
                  }}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
              ))}
            </div>

            {/* Mobile Navigation Links */}
            <div className="space-y-4">
              {/* Login button for unauthenticated users */}
              {!isAuthenticated && (
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 p-4 rounded-lg btn-hero text-center font-medium"
                >
                  Войти в аккаунт
                </Link>
              )}

              {isAuthenticated && (
                <div className="grid gap-3">
                  {serviceActions.map((action) => (
                      <Link
                        key={action.href}
                        to={action.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="card-surface flex items-center gap-3 p-3 border-0 hover:bg-muted/50 transition-colors"
                      >
                      <action.icon className="h-5 w-5" />
                      <span className="font-medium">{action.title}</span>
                      {action.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {action.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              <div className="grid gap-3">
                {mainNavItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="card-surface flex items-center gap-3 p-3 border-0 hover:bg-muted/50 transition-colors"
                    >
                    <item.icon className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ListItem = ({ className, title, children, href, ...props }: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          to={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};