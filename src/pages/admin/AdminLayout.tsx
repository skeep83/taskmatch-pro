import { ReactNode, useEffect, useMemo, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/adminApi";
import { Badge } from "@/components/ui/badge";
import { Shield, LogOut, Activity, AlertTriangle } from "lucide-react";
import { NeumorphicSidebar } from "@/components/admin/NeumorphicSidebar";

const allowed = [
  "admin","superadmin","ops","kyc","finance","dispute_manager","content","risk","city_manager","tender"
];

export function useAdminAccess() {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Check authentication first
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: s } = await supabase.auth.getSession();
        const uid = s.session?.user?.id;
        
        if (!uid) { 
          if (mounted) { setOk(false); setLoading(false); }
          return; 
        }

        // Verify admin access through secured API
        try {
          const analytics = await adminApi.getAnalytics('dashboard', '1d');
          
          // If we can call admin API, we have access
          if (mounted) { 
            setOk(true);
            // Get user roles for UI
            const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
            const roleList = (roles || []).map(r => String(r.role));
            setUserRoles(roleList);
            
            // Check for security warnings
            const warnings: string[] = [];
            if (!roleList.includes('admin') && !roleList.includes('superadmin')) {
              warnings.push('Ограниченные права доступа');
            }
            setSecurityWarnings(warnings);
          }
        } catch (apiError: any) {
          console.error('Admin API access denied:', apiError);
          
          if (mounted) { 
            setOk(false);
            toast({ 
              title: "Доступ запрещен", 
              description: "У вас нет прав администратора", 
              variant: "destructive" 
            });
          }
        }
        
      } catch (error) {
        console.error('Admin access check error:', error);
        if (mounted) { setOk(false); }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  return { ok, loading, userRoles, securityWarnings };
}

export default function AdminLayout() {
  const { ok, loading, userRoles, securityWarnings } = useAdminAccess();
  const navigate = useNavigate();
  const { toast } = useToast();

  const logout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(()=>{ if (!loading && !ok) navigate("/auth"); }, [loading, ok, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-background-subtle to-background">
      <div className="flex items-center justify-center min-h-screen">
        <div className="card-surface p-8 text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-medium">Проверка прав доступа...</h1>
          <p className="text-sm text-muted-foreground mt-2">Верификация административных привилегий</p>
        </div>
      </div>
    </div>
  );
  
  if (!ok) return null;

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
      <Seo title="ServiceHub — Admin" description="Защищенная операционная админ-панель" canonical="/admin" />
      
      {/* Neumorphic Sidebar */}
      <NeumorphicSidebar />

      {/* Main Content Area */}
      <div className="ml-80">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#E5E7EB] backdrop-blur-xl shadow-[0_8px_16px_rgba(209,213,219,0.3)]">
          <div className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Админ Панель
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {securityWarnings.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700">{securityWarnings.length} предупреждений</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                {userRoles.map(role => (
                  <Badge 
                    key={role}
                    variant="secondary" 
                    className="px-3 py-1 rounded-xl bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-xs font-medium text-gray-700"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
              
              <button 
                onClick={logout}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] transition-all duration-300 text-gray-700 hover:text-gray-800"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 min-h-[calc(100vh-80px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
