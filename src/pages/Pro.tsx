import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";

const Pro = () => {
  const { t } = useI18n();
  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Pro`} description="Become a professional" canonical="/pro" />
      <section className="max-w-3xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-4">Стать специалистом</h1>
        <p className="text-muted-foreground mb-6">Присоединяйтесь к ServiceHub и получайте стабильный поток заказов, мгновенные выплаты и рост рейтинга.</p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>Подтвердите профиль и пройдите KYC</li>
          <li>Укажите категории, радиус работы и прайсинг</li>
          <li>Получайте заявки и мгновенные выплаты</li>
        </ul>
        <div className="mt-6">
          <button className="btn-hero">Начать</button>
        </div>
      </section>
    </main>
  );
};

export default Pro;
