import { Seo } from "@/components/Seo";

export default function AdminUsers(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Users" description="Управление пользователями и мастерами" canonical="/admin/users" />
      <h1 className="text-2xl font-semibold mb-4">Users & Pros</h1>
      <p className="text-sm text-muted-foreground">Скоро: поиск, фильтры, KYC статусы, блокировки, изменение категорий/радиуса.</p>
    </section>
  );
}
