import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/lib/userRoles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [userProfile, setUserProfile] = useState<{
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  } | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  console.log('UserMenu component rendering!');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        setUserProfile(profile);

        // Load user roles
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ['client', 'pro', 'business']);
        
        const rolesList = (roles || []).map((r: any) => r.role as UserRole);
        setUserRoles(rolesList);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast({ title: "Вы вышли из системы" });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const displayName = userProfile?.full_name || 
    (userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}`.trim() 
      : 'Пользователь');
  
  const initials = displayName
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Get available dashboards based on user roles
  const availableDashboards = roleItems.filter(item => userRoles.includes(item.key));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] transition-all duration-300">
          <Avatar className="w-6 h-6">
            <AvatarImage src={userProfile?.avatar_url || ''} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline font-medium truncate max-w-24 text-gray-700">{displayName}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-600" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border z-50">
        <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Show all available dashboards based on role hierarchy */}
        {availableDashboards.length > 0 && (
          <>
            {availableDashboards.map((item) => (
              <DropdownMenuItem 
                key={item.key}
                onClick={() => navigate(item.route)} 
                className="cursor-pointer"
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={() => navigate('/profile/settings')} className="cursor-pointer">
          <Settings className="h-4 w-4 mr-2" />
          Настройки профиля
        </DropdownMenuItem>
        
        
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          Выход
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};