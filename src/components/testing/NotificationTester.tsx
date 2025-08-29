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
      type: 'job_match' as const,
      icon: Briefcase,
      title: 'Новый заказ рядом с вами!',
      message: 'Найден новый заказ "Ремонт крана" в категории Сантехника',
      color: 'text-green-600'
    },
    {
      type: 'job_application' as const,
      icon: Briefcase,
      title: 'Новый отклик на ваш заказ',
      message: 'Специалист Иван Петров откликнулся на заказ "Ремонт крана"',
      color: 'text-purple-600'
    },
    {
      type: 'price_proposal' as const,
      icon: DollarSign,
      title: 'Новое предложение цены',
      message: 'Специалист Мария Попова предложила цену за заказ "Уборка квартиры"',
      color: 'text-yellow-600'
    },
    {
      type: 'job_update' as const,
      icon: Briefcase,
      title: 'Заказ принят',
      message: 'Ваш заказ "Ремонт крана" был принят специалистом',
      color: 'text-blue-600'
    },
    {
      type: 'message' as const,
      icon: MessageSquare,
      title: 'Новое сообщение',
      message: 'Сообщение от Анна Иванова: Когда можете приступить к работе?',
      color: 'text-blue-600'
    },
    {
      type: 'payment' as const,
      icon: DollarSign,
      title: 'Получена оплата',
      message: 'Получена оплата 150 лей за выполненный заказ',
      color: 'text-green-600'
    },
    {
      type: 'rating' as const,
      icon: Star,
      title: 'Новая оценка',
      message: 'Вы получили новую оценку 5 звезд от клиента',
      color: 'text-yellow-600'
    },
    {
      type: 'system' as const,
      icon: SettingsIcon,
      title: 'Системное уведомление',
      message: 'Ваш профиль был успешно обновлен',
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

      // Use the notifications-send edge function to create notification
      const { data, error } = await supabase.functions.invoke('notifications-send', {
        body: {
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
          channels: ['push'] // This will create the notification in DB
        }
      });

      if (error) {
        console.error('Error creating test notification via edge function:', error);
        toast({
          title: 'Ошибка',
          description: `Не удалось создать тестовое уведомление: ${error.message}`,
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

    } catch (error: any) {
      console.error('Error in test notification:', error);
      toast({
        title: 'Ошибка',
        description: `Произошла ошибка при создании уведомления: ${error.message}`,
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