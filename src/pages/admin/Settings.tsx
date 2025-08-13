import { Seo } from "@/components/Seo";

export default function AdminSettings(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Settings" description="Настройки и справочники" canonical="/admin/settings" />
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      <p className="text-sm text-muted-foreground">Скоро: категории, шаблоны цен, BAFO-окна, геозоны, роли/права, причинники, SLA.</p>
    </section>
  );
}
