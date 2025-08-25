import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Seo } from "@/components/Seo";
import { 
  User, Briefcase, Building2, Crown, 
  Settings, Bell, ChevronRight 
} from "lucide-react";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarTrigger, 
  useSidebar 
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useEnhancedI18n } from "@/i18n/enhanced";
import DashboardClient from "./DashboardClient";
import DashboardPro from "./DashboardPro";
import DashboardBusiness from "./DashboardBusiness";

type UserRole = 'client' | 'pro' | 'business' | 'admin';

interface RoleItem {
  key: UserRole;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const roleItems: RoleItem[] = [
  {
    key: 'client',
    title: 'Клиент',
    description: 'Заказать услуги',
    icon: User,
    color: 'text-blue-500'
  },
  {
    key: 'pro',
    title: 'Специалист',
    description: 'Выполнять заказы',
    icon: Briefcase,
    color: 'text-green-500'
  },
  {
    key: 'business',
    title: 'Бизнес',
    description: 'Корпоративные заказы',
    icon: Building2,
    color: 'text-purple-500'
  },
  {
    key: 'admin',
    title: 'Администратор',
    description: 'Управление платформой',
    icon: Crown,
    color: 'text-amber-500'
  }
];

const UnifiedDashboard = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('client');

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      
      if (!uid) {
        toast({ 
          title: "Требуется вход", 
          description: "Пожалуйста, войдите в систему", 
          variant: "destructive" 
        });
        navigate("/auth");
        return;
      }

      setUserId(uid);

      // Load user roles
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (error) {
        toast({ 
          title: "Ошибка", 
          description: error.message, 
          variant: "destructive" 
        });
        return;
      }

      const rolesList = (roles || []).map((r: any) => r.role as UserRole);
      setUserRoles(rolesList);

      // Set default active role based on priority
      if (rolesList.includes('admin')) {
        setActiveRole('admin');
      } else if (rolesList.includes('pro')) {
        setActiveRole('pro');
      } else if (rolesList.includes('business')) {
        setActiveRole('business');
      } else {
        setActiveRole('client');
      }

      setLoading(false);
    })();
  }, [navigate, toast]);

  const handleBecomeRole = async (role: UserRole) => {
    if (!userId) return;

    if (role === 'admin') {
      toast({ 
        title: "Недоступно", 
        description: "Роль администратора назначается вручную", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      setUserRoles(prev => [...prev, role]);
      setActiveRole(role);
      
      toast({ 
        title: "Успешно", 
        description: `Роль "${roleItems.find(r => r.key === role)?.title}" активирована` 
      });
    } catch (error: any) {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось активировать роль", 
        variant: "destructive" 
      });
    }
  };

  const AppSidebar = () => {
    return (
      <Sidebar className="w-72" collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-lg font-display font-bold px-4 py-3">
              Мои роли
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {roleItems.map((item) => {
                  const hasRole = userRoles.includes(item.key);
                  const isActive = activeRole === item.key;
                  
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton 
                        asChild 
                        className={`
                          ${isActive ? 'bg-primary/10 text-primary border-primary/20' : 'hover:bg-muted/50'}
                          ${hasRole ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                        `}
                      >
                        <div 
                          onClick={() => hasRole ? setActiveRole(item.key) : handleBecomeRole(item.key)}
                          className="flex items-center justify-between w-full p-3"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className={`h-5 w-5 ${item.color}`} />
                            <div className="flex flex-col">
                              <span className="font-medium">{item.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            </div>
                          </div>
                          {!hasRole && (
                            <Button size="sm" variant="outline" className="text-xs">
                              Стать
                            </Button>
                          )}
                          {hasRole && !isActive && (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span>Настройки</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span>Уведомления</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  };

  const renderActiveRoleDashboard = () => {
    if (activeRole === 'admin') {
      // Redirect to admin panel
      navigate('/admin');
      return null;
    }

    switch (activeRole) {
      case 'pro':
        return <DashboardPro />;
      case 'business':
        return <DashboardBusiness />;
      case 'client':
      default:
        return <DashboardClient />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-gradient mb-4">
            Загружаем ваш кабинет...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Seo 
        title={`${t('app.name')} — Личный кабинет`} 
        description="Управляйте своими заказами и услугами" 
        canonical="/dashboard" 
      />
      
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
              <div className="flex items-center justify-between h-full px-6">
                <SidebarTrigger />
                <h1 className="text-xl font-display font-bold">
                  {roleItems.find(r => r.key === activeRole)?.title} — Личный кабинет
                </h1>
                <div></div>
              </div>
            </header>

            <main className="flex-1">
              {renderActiveRoleDashboard()}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default UnifiedDashboard;