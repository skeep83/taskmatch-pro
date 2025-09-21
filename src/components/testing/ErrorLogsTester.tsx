import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/adminApi";
import { AlertTriangle, CheckCircle, Plus, Trash, Database } from 'lucide-react';

interface TestLog {
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  metadata?: any;
  stack_trace?: string;
}

export const ErrorLogsTester = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const testLogs: TestLog[] = [
    {
      level: 'critical',
      source: 'auto-crawler',
      message: 'HTTP 500: Internal Server Error на главной странице',
      metadata: { url: 'https://example.com/', responseTime: 5000, userAgent: 'ServiceHub-ErrorCrawler/1.0' },
      stack_trace: 'Error at server.js:123\n  at processRequest server.js:89'
    },
    {
      level: 'error',
      source: 'auto-crawler',
      message: 'JavaScript Error: Cannot read property "map" of undefined',
      metadata: { url: 'https://example.com/catalog', responseTime: 1200, browser: 'Chrome' },
      stack_trace: 'TypeError: Cannot read property "map" of undefined\n  at main.js:45:12'
    },
    {
      level: 'warning',
      source: 'performance',
      message: 'Время загрузки страницы превышает 3 секунды',
      metadata: { url: 'https://example.com/jobs', responseTime: 3500, slowResource: 'images' }
    },
    {
      level: 'error',
      source: 'backend',
      message: 'Database connection timeout',
      metadata: { query: 'SELECT * FROM jobs', timeout: 5000, database: 'postgres' },
      stack_trace: 'ConnectionTimeoutError\n  at Pool.connect db.js:234'
    },
    {
      level: 'critical',
      source: 'auto-crawler',
      message: 'Failed to load critical resource: 404 Not Found',
      metadata: { url: 'https://example.com/api/auth', responseTime: 800, statusCode: 404 }
    },
    {
      level: 'warning',
      source: 'accessibility',
      message: 'Найдено 15 изображений без alt атрибутов',
      metadata: { url: 'https://example.com/portfolio', missingAltCount: 15, totalImages: 25 }
    },
    {
      level: 'error',
      source: 'security',
      message: 'Отсутствуют security headers',
      metadata: { 
        url: 'https://example.com/admin', 
        missingHeaders: ['Content-Security-Policy', 'X-Frame-Options'],
        severity: 'high'
      }
    },
    {
      level: 'info',
      source: 'frontend',
      message: 'Успешная загрузка страницы',
      metadata: { url: 'https://example.com/about', responseTime: 250, cached: true }
    }
  ];

  const createTestLogs = async () => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      const logsWithUser = testLogs.map(log => ({
        ...log,
        user_id: user.id
      }));

      const { data, error } = await supabase.functions.invoke('admin-logs', {
        body: {
          action: 'bulk_create',
          logs: logsWithUser
        }
      });

      if (error) {
        console.error('Error creating test logs:', error);
        throw error;
      }

      toast({
        title: "Тестовые логи созданы",
        description: `Создано ${testLogs.length} тестовых записей в логах ошибок`
      });

    } catch (error) {
      console.error('Failed to create test logs:', error);
      toast({
        title: "Ошибка создания логов",
        description: "Не удалось создать тестовые логи",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const clearAllLogs = async () => {
    setIsClearing(true);
    try {
      await adminApi.clearAllLogs();

      toast({
        title: "Логи очищены",
        description: "Все логи ошибок успешно удалены",
      });
    } catch (error) {
      console.error('Failed to clear logs:', error);
      toast({
        title: "Ошибка очистки",
        description: "Не удалось очистить логи",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Тестирование логов ошибок</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Управление тестовыми данными
          </CardTitle>
          <CardDescription>
            Создание и управление тестовыми записями в системе логов ошибок
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={createTestLogs} 
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? 'Создание...' : 'Создать тестовые логи'}
            </Button>
            
            <Button 
              onClick={clearAllLogs} 
              disabled={isClearing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash className="h-4 w-4" />
              {isClearing ? 'Очистка...' : 'Очистить все логи'}
            </Button>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              После создания тестовых логов перейдите на вкладку "Логи" для просмотра результатов.
              Тестовые данные помогут проверить работу системы отображения и фильтрации ошибок.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Предварительный просмотр тестовых данных</CardTitle>
          <CardDescription>
            Эти записи будут созданы в системе логов ошибок
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {testLogs.map((log, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={log.level === 'critical' ? 'destructive' : 
                                  log.level === 'error' ? 'destructive' : 
                                  log.level === 'warning' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.source}
                        </Badge>
                      </div>
                      
                      <p className="text-sm font-medium">{log.message}</p>
                      
                      {log.metadata && (
                        <div className="text-xs text-muted-foreground">
                          <strong>Метаданные:</strong> {JSON.stringify(log.metadata, null, 2).slice(0, 100)}...
                        </div>
                      )}
                      
                      {log.stack_trace && (
                        <div className="text-xs text-muted-foreground font-mono">
                          <strong>Stack trace:</strong> {log.stack_trace.split('\n')[0]}...
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};