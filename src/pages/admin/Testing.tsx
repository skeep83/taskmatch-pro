import { NotificationTester } from '@/components/testing/NotificationTester';
import { AutoErrorDetector } from '@/components/testing/AutoErrorDetector';
import { ErrorLogsTester } from '@/components/testing/ErrorLogsTester';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminTesting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Тестирование системы</h1>
        <p className="text-muted-foreground">
          Инструменты для тестирования функциональности платформы
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="errors">Логи ошибок</TabsTrigger>
          <TabsTrigger value="auto-scanner">Автосканер</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <div className="card-surface p-6">
            <h2 className="text-xl font-semibold mb-4">Тестирование уведомлений</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Проверьте работу системы уведомлений, звуковых эффектов и real-time обновлений
            </p>
            
            <NotificationTester />
          </div>
        </TabsContent>

        <TabsContent value="errors">
          <div className="card-surface p-6">
            <ErrorLogsTester />
          </div>
        </TabsContent>

        <TabsContent value="auto-scanner">
          <div className="card-surface p-6">
            <AutoErrorDetector />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}