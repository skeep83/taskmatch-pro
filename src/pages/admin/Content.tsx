import { Seo } from "@/components/Seo";

export default function AdminContent(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Content" description="Модерация контента" canonical="/admin/content" />
      <h1 className="text-2xl font-semibold mb-4">Content Moderation</h1>
      <p className="text-sm text-muted-foreground">Скоро: модерация постов/портфолио/комментов, жалобы, авто-фильтры.</p>
    </section>
  );
}
