import { Seo } from "@/components/Seo";

export default function AdminDisputes(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Disputes" description="Менеджмент споров" canonical="/admin/disputes" />
      <h1 className="text-2xl font-semibold mb-4">Disputes</h1>
      <p className="text-sm text-muted-foreground">Скоро: очередь споров, фото/видео, чат, решения, частичные/полные рефанды.</p>
    </section>
  );
}
