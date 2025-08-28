import { ReactNode, useEffect, useMemo, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/adminApi";
import { Badge } from "@/components/ui/badge";
import { Shield, LogOut, Activity, AlertTriangle } from "lucide-react";

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
    <main className="container mx-auto py-10">
      <section className="max-w-6xl mx-auto card-surface">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-xl">Проверка прав доступа...</h1>
            <p className="text-sm text-muted-foreground mt-2">Верификация административных привилегий</p>
          </div>
        </div>
      </section>
    </main>
  );
  
  if (!ok) return null;

  return (
    <div className="min-h-screen">
      <Seo title="ServiceHub — Admin" description="Защищенная операционная админ-панель" canonical="/admin" />
      
      <header className="w-full glass-nav sticky top-0 z-20">
        <nav className="container mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              ServiceHub Admin
            </Link>
            <Badge variant="outline" className="text-xs">
              Защищенная панель
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            {securityWarnings.length > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">{securityWarnings.length} предупреждений</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {userRoles.map(role => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
            
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выход
            </button>
          </div>
        </nav>
      </header>

      <div className="container mx-auto py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="border rounded-md p-3">
          <div className="mb-4 p-3 bg-green-500/10 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <Shield className="w-4 h-4" />
              <span>API-защищенная панель</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Все операции логируются и защищены серверной валидацией
            </p>
          </div>
          
          <nav className="flex flex-col gap-1 text-sm">
            <NavLink to="/admin" end className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Users & Pros
            </NavLink>
            <NavLink to="/admin/jobs" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Jobs
            </NavLink>
            <NavLink to="/admin/tenders" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Tenders
            </NavLink>
            <NavLink to="/admin/disputes" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Disputes
            </NavLink>
            <NavLink to="/admin/finance" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Finance
            </NavLink>
            <NavLink to="/admin/risk" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Risk
            </NavLink>
            <NavLink to="/admin/content" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Content
            </NavLink>
            <NavLink to="/admin/currencies" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Currencies
            </NavLink>
            <NavLink to="/admin/settings" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Settings
            </NavLink>
            <NavLink to="/admin/testing" className={({isActive})=> `p-2 rounded transition-colors ${isActive?"font-medium bg-primary/10":"opacity-80 hover:opacity-100 hover:bg-muted"}`}>
              Testing
            </NavLink>
          </nav>
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
