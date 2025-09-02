import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRole } from "@/lib/userRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoleGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard = ({ requiredRole, children, redirectTo }: RoleGuardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [requiredRole]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load user roles  
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ['client', 'pro', 'business']);
      
      const userRoles = (roles || []).map((r: any) => r.role as UserRole);
      
      if (userRoles.length > 0) {
        if (userRoles.includes(requiredRole)) {
          setHasAccess(true);
        } else {
          // Find the highest role for redirect
          const highestRole = userRoles.includes('business') ? 'business' : 
                             userRoles.includes('pro') ? 'pro' : 'client';
          const redirectPath = redirectTo || getRoleDefaultPath(highestRole);
          
          toast({
            title: "Доступ ограничен",
            description: `У вас нет доступа к этой панели. Перенаправляем вас на панель ${getRoleTitle(highestRole)}.`,
            variant: "destructive"
          });
          
          navigate(redirectPath);
        }
      } else {
        navigate("/auth");
      }
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const getRoleDefaultPath = (role: UserRole): string => {
    switch (role) {
      case 'client':
        return '/dashboard/client';
      case 'pro':
        return '/dashboard/pro';
      case 'business':
        return '/dashboard/business';
      default:
        return '/dashboard/client';
    }
  };

  const getRoleTitle = (role: UserRole): string => {
    switch (role) {
      case 'client':
        return 'клиента';
      case 'pro':
        return 'специалиста';
      case 'business':
        return 'бизнеса';
      default:
        return 'клиента';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="card-surface p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Проверяем доступ...</h1>
          <div className="animate-spin">⏳</div>
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return null; // Redirecting
  }

  return <>{children}</>;
};