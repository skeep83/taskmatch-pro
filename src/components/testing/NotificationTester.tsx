import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationSounds } from '@/utils/notificationSounds';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Bell, MessageSquare, Briefcase, DollarSign, Star, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';

export const NotificationTester = () => {
  const { sendNotification } = useNotifications();
  const [loading, setLoading] = useState(false);

  const testNotifications = [
    {
      type: 'message' as const,
      icon: MessageSquare,
      title: 'Тест сообщения',
      message: 'Это тестовое уведомление о новом сообщении в чате',
      color: 'text-blue-600'
    },
    {
      type: 'job_match' as const,
      icon: Briefcase,
      title: 'Тест заказа',
      message: 'Найден новый заказ в вашем районе - сантехнические работы',
      color: 'text-green-600'
    },
    {
      type: 'payment' as const,
      icon: DollarSign,
      title: 'Тест платежа',
      message: 'Получена оплата 150 лей за выполненный заказ',
      color: 'text-purple-600'
    },
    {
      type: 'rating' as const,
      icon: Star,
      title: 'Тест рейтинга',
      message: 'Вы получили новую оценку 5 звезд от клиента',
      color: 'text-yellow-600'
    },
    {
      type: 'system' as const,
      icon: SettingsIcon,
      title: 'Тест системы',
      message: 'Ваш профиль был успешно обновлен администратором',
      color: 'text-gray-600'
    }
  ];

  const createTestNotification = async (notificationType: any) => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Ошибка',
          description: 'Необходимо войти в систему',
          variant: 'destructive'
        });
        return;
      }

      // Create test notification directly in database
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: notificationType.type,
          title: notificationType.title,
          title_ro: notificationType.title,
          message: notificationType.message,
          message_ro: notificationType.message,
          data: {
            test: true,
            timestamp: new Date().toISOString()
          },
          is_read: false
        });

      if (error) {
        console.error('Error creating test notification:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось создать тестовое уведомление',
          variant: 'destructive'
        });
        return;
      }

      // Also play sound directly for immediate feedback
      await notificationSounds.playNotification(notificationType.type);

      toast({
        title: 'Успех!',
        description: `Создано тестовое уведомление: ${notificationType.title}`,
      });

    } catch (error) {
      console.error('Error in test notification:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при создании уведомления',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testAllSounds = async () => {
    for (let i = 0; i < testNotifications.length; i++) {
      setTimeout(async () => {
        await notificationSounds.playNotification(testNotifications[i].type);
        toast({
          title: `Тестовый звук ${i + 1}/${testNotifications.length}`,
          description: `Звук для: ${testNotifications[i].title}`,
          duration: 2000,
        });
      }, i * 1500); // 1.5 second delay between sounds
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Тестирование уведомлений
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Проверьте работу уведомлений и звуковых эффектов
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={testAllSounds}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Тест всех звуков
          </Button>
        </div>

        <div className="grid gap-3">
          {testNotifications.map((notification, index) => (
            <div key={notification.type} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <notification.icon className={`h-5 w-5 ${notification.color}`} />
                <div>
                  <div className="font-medium text-sm">{notification.title}</div>
                  <div className="text-xs text-muted-foreground">{notification.message}</div>
                </div>
              </div>
              <Button
                onClick={() => createTestNotification(notification)}
                disabled={loading}
                size="sm"
                variant="secondary"
              >
                Тест
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Инструкции:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Нажмите "Тест всех звуков" чтобы услышать все звуковые эффекты</li>
            <li>• Нажмите "Тест" рядом с типом уведомления для создания реального уведомления</li>
            <li>• Проверьте колокольчик в хедере - он должен стать красным</li>
            <li>• Настройте звуки через иконку динамика в панели уведомлений</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};