import { Seo } from "@/components/Seo";

export default function AdminTenders(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Tenders" description="Управление тендерами" canonical="/admin/tenders" />
      <h1 className="text-2xl font-semibold mb-4">Tenders</h1>
      <p className="text-sm text-muted-foreground">Скоро: BAFO, Q&A, анонимизация заявок, award, экспорт протокола.</p>
    </section>
  );
}
