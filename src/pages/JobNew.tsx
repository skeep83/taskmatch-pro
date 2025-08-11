import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";

const JobNew = () => {
  const { t } = useI18n();
  return (
    <main className="container mx-auto py-12">
      <Seo title={`${t('app.name')} — Инстант‑бронирование`} description="Создать заказ" canonical="/job/new" />
      <section className="max-w-3xl mx-auto card-surface">
        <h1 className="text-2xl font-semibold mb-6">Инстант‑бронирование</h1>
        <form className="grid gap-4">
          <div>
            <label className="block text-sm mb-1">Категория</label>
            <select className="w-full border rounded-md px-3 py-2 bg-background">
              <option>Сантехника</option>
              <option>Электрика</option>
              <option>Уборка</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Описание</label>
            <textarea className="w-full border rounded-md px-3 py-2 bg-background" rows={4} placeholder="Кратко опишите задачу" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Бюджет, мин (₽)</label>
              <input type="number" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm mb-1">Бюджет, макс (₽)</label>
              <input type="number" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Дата</label>
              <input type="date" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm mb-1">Время</label>
              <input type="time" className="w-full border rounded-md px-3 py-2 bg-background" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" className="btn-ghost">Отмена</button>
            <button type="submit" className="btn-hero">Создать заказ</button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default JobNew;
