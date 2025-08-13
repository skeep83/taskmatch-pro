import { ReactNode, useEffect, useMemo, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/Seo";

const allowed = [
  "admin","superadmin","ops","kyc","finance","dispute_manager","content","risk","city_manager","tender"
];

export function useAdminAccess() {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) { if (mounted) setOk(false); setLoading(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const has = (roles||[]).some(r => allowed.includes(String(r.role)));
      if (mounted) { setOk(has); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);
  return { ok, loading };
}

export default function AdminLayout() {
  const { ok, loading } = useAdminAccess();
  const navigate = useNavigate();

  useEffect(()=>{ if (!loading && !ok) navigate("/auth"); }, [loading, ok, navigate]);

  if (loading) return <main className="container mx-auto py-10"><section className="max-w-6xl mx-auto card-surface"><h1 className="text-xl">Загрузка…</h1></section></main>;
  if (!ok) return null;

  return (
    <div className="min-h-screen">
      <Seo title="ServiceHub — Admin" description="Операционная админ-панель" canonical="/admin" />
      <header className="w-full glass-nav sticky top-0 z-20">
        <nav className="container mx-auto flex items-center justify-between py-3">
          <Link to="/" className="font-semibold">ServiceHub Admin</Link>
          <div className="text-xs text-muted-foreground">v0 • операционная панель</div>
        </nav>
      </header>
      <div className="container mx-auto py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="border rounded-md p-3">
          <nav className="flex flex-col gap-1 text-sm">
            <NavLink to="/admin" end className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Dashboard</NavLink>
            <NavLink to="/admin/users" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Users & Pros</NavLink>
            <NavLink to="/admin/jobs" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Jobs</NavLink>
            <NavLink to="/admin/tenders" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Tenders</NavLink>
            <NavLink to="/admin/disputes" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Disputes</NavLink>
            <NavLink to="/admin/finance" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Finance</NavLink>
            <NavLink to="/admin/risk" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Risk</NavLink>
            <NavLink to="/admin/content" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Content</NavLink>
            <NavLink to="/admin/settings" className={({isActive})=> isActive?"font-medium":"opacity-80 hover:opacity-100"}>Settings</NavLink>
          </nav>
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
