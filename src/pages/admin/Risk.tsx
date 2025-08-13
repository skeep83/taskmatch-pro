import { Seo } from "@/components/Seo";

export default function AdminRisk(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Risk" description="Риск и фрод" canonical="/admin/risk" />
      <h1 className="text-2xl font-semibold mb-4">Risk & Fraud</h1>
      <p className="text-sm text-muted-foreground">Скоро: кластеры устройств/IP, паттерны, связи аккаунтов, правила и чёрные списки.</p>
    </section>
  );
}
