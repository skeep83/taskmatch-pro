import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Briefcase, Building2, Settings, LogOut,
  ChevronDown 
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type UserRole = 'client' | 'pro' | 'business';

interface RoleItem {
  key: UserRole;
  title: string;
  icon: any;
  route: string;
}

const roleItems: RoleItem[] = [
  {
    key: 'client',
    title: 'Клиент',
    icon: User,
    route: '/dashboard/client'
  },
  {
    key: 'pro',
    title: 'Специалист',
    icon: Briefcase,
    route: '/dashboard/pro'
  },
  {
    key: 'business',
    title: 'Бизнес',
    icon: Building2,
    route: '/dashboard/business'
  }
];

export const UserMenu = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('client');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      
      if (!uid) return;
      
      setUserId(uid);

      // Load user roles (excluding admin roles for security)
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ['client', 'pro', 'business']);

      if (error) {
        console.error('Error loading roles:', error);
        return;
      }

      const rolesList = (roles || []).map((r: any) => r.role as UserRole);
      setUserRoles(rolesList);

      // Set default current role based on current path
      const currentPath = window.location.pathname;
      if (currentPath.includes('/dashboard/pro') && rolesList.includes('pro')) {
        setCurrentRole('pro');
      } else if (currentPath.includes('/dashboard/business') && rolesList.includes('business')) {
        setCurrentRole('business');
      } else {
        setCurrentRole('client');
      }
    })();
  }, []);

  const handleBecomeRole = async (role: UserRole) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      setUserRoles(prev => [...prev, role]);
      setCurrentRole(role);
      
      toast({ 
        title: "Успешно", 
        description: `Роль "${roleItems.find(r => r.key === role)?.title}" активирована` 
      });

      // Navigate to the new role dashboard
      const roleItem = roleItems.find(r => r.key === role);
      if (roleItem) {
        navigate(roleItem.route);
      }
    } catch (error: any) {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось активировать роль", 
        variant: "destructive" 
      });
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    const roleItem = roleItems.find(r => r.key === role);
    if (roleItem) {
      navigate(roleItem.route);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!userId || userRoles.length === 0) {
    return null;
  }

  const currentRoleItem = roleItems.find(r => r.key === currentRole);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          {currentRoleItem && <currentRoleItem.icon className="h-4 w-4" />}
          <span className="hidden sm:inline">Личный кабинет</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border z-50">
        <DropdownMenuLabel>Мои роли</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {roleItems.map((item) => {
          const hasRole = userRoles.includes(item.key);
          const isActive = currentRole === item.key;
          
          return (
            <DropdownMenuItem
              key={item.key}
              onClick={() => hasRole ? handleRoleChange(item.key) : handleBecomeRole(item.key)}
              className={`flex items-center justify-between cursor-pointer ${
                isActive ? 'bg-primary/10 text-primary' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </div>
              {!hasRole && (
                <span className="text-xs text-muted-foreground">Стать</span>
              )}
              {isActive && (
                <span className="text-xs text-primary">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/pro/profile')} className="cursor-pointer">
          <Settings className="h-4 w-4 mr-2" />
          Настройки
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          Выход
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};