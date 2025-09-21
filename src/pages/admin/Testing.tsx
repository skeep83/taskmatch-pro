import { NotificationTester } from '@/components/testing/NotificationTester';
import { AutoErrorDetector } from '@/components/testing/AutoErrorDetector';

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

        {/* Auto Error Detection System */}
        <div className="card-surface p-6">
          <AutoErrorDetector />
        </div>
      </div>
    </div>
  );
}