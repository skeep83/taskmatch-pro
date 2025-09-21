import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/adminApi";
import { AlertTriangle, CheckCircle, Plus, Trash, Database, RefreshCw, List, TestTube } from 'lucide-react';

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'critical';
  source: string;
  message: string;
  user_id?: string;
  metadata?: any;
  stack_trace?: string;
  resolved: boolean;
}

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
  const [logsCleared, setLogsCleared] = useState(false);
  const [realLogs, setRealLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

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

  const fetchRealLogs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getLogs({
        page: 1,
        limit: 50
      });
      setRealLogs(response.logs || []);
      setStats(response.stats || null);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить логи ошибок",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealLogs();
  }, []);

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

      // Автоматически обновляем реальные данные
      await fetchRealLogs();

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
      setLogsCleared(true);
      // Автоматически обновляем реальные данные
      await fetchRealLogs();
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Всего логов</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">Критические</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.errors}</div>
              <p className="text-xs text-muted-foreground">Ошибки</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <p className="text-xs text-muted-foreground">Предупреждения</p>
            </CardContent>
          </Card>
        </div>
      )}

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

            <Button 
              onClick={fetchRealLogs} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              После создания тестовых логов данные автоматически обновятся.
              Тестовые данные помогут проверить работу системы отображения и фильтрации ошибок.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="real" className="space-y-4">
        <TabsList>
          <TabsTrigger value="real" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Реальные данные ({realLogs.length})
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Предварительный просмотр тестовых данных
          </TabsTrigger>
        </TabsList>

        <TabsContent value="real" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Реальные данные из системы логов</CardTitle>
              <CardDescription>
                Актуальные записи из базы данных системы логов ошибок
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : realLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Логи ошибок не найдены</p>
                  <p className="text-sm">Создайте тестовые данные для проверки системы</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {realLogs.map((log) => (
                      <Card key={log.id} className="p-3">
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
                              {log.resolved && (
                                <Badge variant="secondary" className="text-xs text-green-700 bg-green-100">
                                  Решено
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString('ru')}
                              </span>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Предварительный просмотр тестовых данных</CardTitle>
              <CardDescription>
                Эти записи будут созданы в системе логов ошибок при нажатии кнопки "Создать тестовые логи"
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
        </TabsContent>
      </Tabs>
    </div>
  );
};