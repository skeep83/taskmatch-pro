import { NotificationTester } from '@/components/testing/NotificationTester';

export default function AdminTesting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Тестирование системы</h1>
        <p className="text-muted-foreground">
          Инструменты для тестирования функциональности платформы
        </p>
      </div>

      <div className="grid gap-6">
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold mb-4">Тестирование уведомлений</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Проверьте работу системы уведомлений, звуковых эффектов и real-time обновлений
          </p>
          
          <NotificationTester />
        </div>

        {/* Placeholder for future testing tools */}
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold mb-4">Дополнительные тесты</h2>
          <p className="text-sm text-muted-foreground">
            Здесь можно добавить другие инструменты тестирования в будущем
          </p>
          <div className="mt-4 p-4 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
            Место для дополнительных тестов
          </div>
        </div>
      </div>
    </div>
  );
}