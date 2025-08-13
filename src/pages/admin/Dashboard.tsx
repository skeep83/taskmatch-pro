import { Seo } from "@/components/Seo";

export default function AdminDashboard(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Dashboard" description="Операционные метрики и задачи" canonical="/admin" />
      <h1 className="text-2xl font-semibold mb-4">Admin · Dashboard</h1>
      <p className="text-sm text-muted-foreground">Здесь будут ключевые метрики (GMV, fill-rate, время ответа, споры, активные тендеры, риск-флаги).</p>
    </section>
  );
}
