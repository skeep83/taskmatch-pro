import { Seo } from "@/components/Seo";

export default function AdminJobs(){
  return (
    <section className="max-w-6xl mx-auto card-surface">
      <Seo title="ServiceHub — Admin Jobs" description="Операции по заказам" canonical="/admin/jobs" />
      <h1 className="text-2xl font-semibold mb-4">Jobs</h1>
      <p className="text-sm text-muted-foreground">Скоро: лента заказов, назначение/переназначение, изменение окон, скидки, споры.</p>
    </section>
  );
}
