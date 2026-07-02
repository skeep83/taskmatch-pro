import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/adminApi";
import { Badge } from "@/components/ui/badge";
import { LogOut, Activity, AlertTriangle, Menu } from "lucide-react";
import { NeumorphicSidebar, adminNavigationItems } from "@/components/admin/NeumorphicSidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const allowed = [
  "admin", "superadmin", "ops", "kyc", "finance", "dispute_manager", "content", "risk", "city_manager", "tender"
];

const adminRoleLabels: Record<string, string> = {
  admin: "Админ",
  superadmin: "Суперадмин",
  ops: "Операции",
  kyc: "KYC",
  finance: "Финансы",
  dispute_manager: "Споры",
  content: "Контент",
  risk: "Риски",
  city_manager: "Города",
  tender: "Тендеры"
};

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
        const { data: s } = await supabase.auth.getSession();
        const uid = s.session?.user?.id;

        if (!uid) {
          if (mounted) {
            setOk(false);
            setLoading(false);
          }
          return;
        }

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);

        if (rolesError) {
          throw rolesError;
        }

        const roleList = (roles || []).map(r => String(r.role));
        const hasAdminRole = roleList.some(role => allowed.includes(role));

        if (!hasAdminRole) {
          if (mounted) {
            setOk(false);
            toast({
              title: "Доступ запрещен",
              description: "У вас нет прав администратора",
              variant: "destructive"
            });
          }
          return;
        }

        if (mounted) {
          setOk(true);
          setUserRoles(roleList);

          const warnings: string[] = [];
          if (!roleList.includes("admin") && !roleList.includes("superadmin")) {
            warnings.push("Ограниченные права доступа");
          }
          setSecurityWarnings(warnings);
        }

        try {
          await adminApi.getAnalytics("dashboard", "1d");
        } catch (apiError: any) {
          console.error("Admin analytics health check failed:", apiError);
          if (mounted) {
            setSecurityWarnings(prev => {
              const next = [...prev];
              if (!next.includes("Admin analytics temporarily unavailable")) {
                next.push("Admin analytics temporarily unavailable");
              }
              return next;
            });
          }
        }
      } catch (error) {
        console.error("Admin access check error:", error);
        if (mounted) {
          setOk(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  return { ok, loading, userRoles, securityWarnings };
}

export default function AdminLayout() {
  const { ok, loading, userRoles, securityWarnings } = useAdminAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentNavItem = useMemo(() => {
    return adminNavigationItems.find(item => {
      if (item.end) return location.pathname === item.path;
      return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    });
  }, [location.pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const visibleAdminRoles = userRoles.filter(role => allowed.includes(role));
  const roleBadges = visibleAdminRoles.slice(0, 3);
  const extraRolesCount = Math.max(visibleAdminRoles.length - roleBadges.length, 0);

  useEffect(() => {
    if (!loading && !ok) navigate("/auth");
  }, [loading, ok, navigate]);

  if (loading) {
    return (
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
  }

  if (!ok) return null;

  const pageTitle = currentNavItem?.name || "Админ-панель";
  const pageDescription = currentNavItem?.description || "Операционный контур ServiceHub";

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
      <Seo title="ServiceHub — Админ-панель" description="Защищенная операционная админ-панель" canonical="/admin" />

      <NeumorphicSidebar />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-[360px] border-0 bg-[#E5E7EB] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Навигация админ-панели</SheetTitle>
            <SheetDescription>Переход по разделам администрирования</SheetDescription>
          </SheetHeader>
          <NeumorphicSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:ml-80 min-w-0">
        <header className="sticky top-0 z-20 bg-[#E5E7EB] backdrop-blur-xl shadow-[0_8px_16px_rgba(209,213,219,0.3)]">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] text-gray-700"
                aria-label="Открыть навигацию админ-панели"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 mb-1">
                  ServiceHub Admin
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {pageTitle}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{pageDescription}</p>
              </div>
            </div>

            <div className="flex max-w-full flex-wrap items-center justify-end gap-3 sm:gap-4">
              {securityWarnings.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700">{securityWarnings.length} предупреждений</span>
                </div>
              )}

              <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
                {roleBadges.map(role => (
                  <Badge
                    key={role}
                    variant="secondary"
                    className="px-3 py-1 rounded-xl bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-xs font-medium text-gray-700"
                  >
                    {adminRoleLabels[role] || role}
                  </Badge>
                ))}
                {extraRolesCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 rounded-xl bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-xs font-medium text-gray-700"
                  >
                    +{extraRolesCount}
                  </Badge>
                )}
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

        <main className="min-w-0 p-4 sm:p-6 min-h-[calc(100vh-80px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
