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
    <div className="min-h-screen bg-gradient-to-br from-background-subtle to-background">
      <Seo title="ServiceHub — Admin" description="Защищенная операционная админ-панель" canonical="/admin" />
      
      {/* Header */}
      <header className="glass-nav sticky top-0 z-20 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold flex items-center gap-3 hover:scale-105 transition-transform">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  ServiceHub Admin
                </span>
                <Badge variant="outline" className="ml-2 text-xs">
                  Secure
                </Badge>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {securityWarnings.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-full">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-700">{securityWarnings.length} предупреждений</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {userRoles.map(role => (
                <Badge key={role} variant="secondary" className="text-xs px-2 py-1">
                  {role}
                </Badge>
              ))}
            </div>
            
            <button 
              onClick={logout}
              className="btn-ghost flex items-center gap-2 text-sm px-3 py-2"
            >
              <LogOut className="w-4 h-4" />
              Выход
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Security Status */}
            <div className="card-surface p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Безопасность</h3>
                  <p className="text-xs text-muted-foreground">API-защищенная панель</p>
                </div>
              </div>
              <p className="text-xs text-green-600">
                Все операции логируются и защищены серверной валидацией
              </p>
            </div>

            {/* Navigation */}
            <nav className="card-surface p-4">
              <h3 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">
                Навигация
              </h3>
              <div className="space-y-1">
                <NavLink 
                  to="/admin" 
                  end 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <Activity className="w-4 h-4" />
                  Dashboard
                </NavLink>
                
                <NavLink 
                  to="/admin/users" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                  Users & Pros
                </NavLink>

                <NavLink 
                  to="/admin/jobs" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  </div>
                  Jobs
                </NavLink>

                <NavLink 
                  to="/admin/tenders" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-amber-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  </div>
                  Tenders
                </NavLink>

                <NavLink 
                  to="/admin/disputes" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-red-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                  Disputes
                </NavLink>

                <NavLink 
                  to="/admin/pro-requests" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  Заявки специалистов
                </NavLink>

                <NavLink 
                  to="/admin/finance" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  </div>
                  Finance
                </NavLink>

                <NavLink 
                  to="/admin/risk" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-orange-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  </div>
                  Risk
                </NavLink>

                <NavLink 
                  to="/admin/content" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-cyan-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  </div>
                  Content
                </NavLink>

                <NavLink 
                  to="/admin/currencies" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-indigo-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  </div>
                  Currencies
                </NavLink>

                <NavLink 
                  to="/admin/categories" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-pink-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                  </div>
                  Categories
                </NavLink>

                <NavLink 
                  to="/admin/settings" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-slate-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  </div>
                  Settings
                </NavLink>

                <NavLink 
                  to="/admin/testing" 
                  className={({isActive}) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-inner" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="w-4 h-4 rounded bg-teal-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  </div>
                  Testing
                </NavLink>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="min-h-[600px]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
