import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [userProfile, setUserProfile] = useState<{
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  } | null>(null);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 h-10">
          <Avatar className="w-6 h-6">
            <AvatarImage src={userProfile?.avatar_url || ''} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline font-medium truncate max-w-24">{displayName}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border z-50">
        <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/dashboard/client')} className="cursor-pointer">
          <User className="h-4 w-4 mr-2" />
          Панель клиента
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/dashboard/pro')} className="cursor-pointer">
          <Briefcase className="h-4 w-4 mr-2" />
          Панель специалиста
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/dashboard/business')} className="cursor-pointer">
          <Building2 className="h-4 w-4 mr-2" />
          Панель бизнеса
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
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