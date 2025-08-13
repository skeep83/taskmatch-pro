import { Seo } from "@/components/Seo";

export default function AdminFinance(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Finance" description="Финансы: кошельки, эскроу, выплаты" canonical="/admin/finance" />
      <h1 className="text-2xl font-semibold mb-4">Finance</h1>
      <p className="text-sm text-muted-foreground">Скоро: кошельки мастеров, эскроу, выплаты, комиссии, промокоды.</p>
    </section>
  );
}
