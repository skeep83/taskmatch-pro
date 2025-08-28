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

  console.log('UserMenu component rendering!');

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast({ title: "Вы вышли из системы" });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Личный кабинет</span>
          <ChevronDown className="h-3 w-3" />
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