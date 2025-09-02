import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRole, UserRole } from "@/lib/userRoles";
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

      const roleResult = await getUserRole(user.id);
      
      if (roleResult.success) {
        const userRole = roleResult.role;
        
        if (userRole === requiredRole) {
          setHasAccess(true);
        } else {
          // Redirect based on user's actual role
          const redirectPath = redirectTo || getRoleDefaultPath(userRole);
          
          toast({
            title: "Доступ ограничен",
            description: `У вас нет доступа к этой панели. Перенаправляем вас на панель ${getRoleTitle(userRole)}.`,
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