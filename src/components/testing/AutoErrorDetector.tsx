import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';

interface ScanResult {
  url: string;
  status: 'success' | 'error' | 'warning';
  responseTime: number;
  errors: Array<{
    type: string;
    message: string;
    stack?: string;
    severity: 'critical' | 'error' | 'warning';
  }>;
  timestamp: string;
}

interface ScanConfig {
  maxDepth: number;
  maxPages: number;
  includeJavaScript: boolean;
  checkPerformance: boolean;
  followExternalLinks: boolean;
  userAgent: string;
  delayBetweenRequests: number;
}

export const AutoErrorDetector = () => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scannedPages, setScannedPages] = useState(0);
  const [foundErrors, setFoundErrors] = useState(0);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    maxDepth: 3,
    maxPages: 50,
    includeJavaScript: true,
    checkPerformance: true,
    followExternalLinks: false,
    userAgent: 'ServiceHub-ErrorCrawler/1.0',
    delayBetweenRequests: 1000
  });

  const [startUrl, setStartUrl] = useState(window.location.origin);

  const startScan = async () => {
    if (!startUrl) {
      toast({
        title: "Ошибка",
        description: "Укажите URL для начала сканирования",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setProgress(0);
    setResults([]);
    setScannedPages(0);
    setFoundErrors(0);

    try {
      console.log('Starting auto-error-crawler scan...');
      
      const { data, error } = await supabase.functions.invoke('auto-error-crawler', {
        body: {
          startUrl,
          config: scanConfig
        }
      });

      if (error) {
        console.error('Error invoking crawler:', error);
        throw error;
      }

      console.log('Crawler completed successfully:', data);

      // Display real results from crawler
      if (data && data.results) {
        setResults(data.results);
        setScannedPages(data.summary?.totalPages || data.results.length);
        setFoundErrors(data.summary?.totalErrors || 0);
        setProgress(100);
        
        toast({
          title: "Сканирование завершено",
          description: `Проверено ${data.summary?.totalPages || data.results.length} страниц, найдено ${data.summary?.totalErrors || 0} ошибок`,
        });
      }

      setIsScanning(false);

    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: "Ошибка сканирования",
        description: error.message || "Не удалось запустить автоматическое сканирование",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    setIsScanning(false);
    toast({
      title: "Сканирование остановлено",
      description: `Просканировано ${scannedPages} страниц, найдено ${foundErrors} ошибок`
    });
  };

  const publishErrorsToLogs = async () => {
    const criticalErrors = results.filter(r => 
      r.errors.some(e => e.severity === 'critical' || e.severity === 'error')
    );

    if (criticalErrors.length === 0) {
      toast({
        title: "Нет критических ошибок",
        description: "Не найдено ошибок для публикации"
      });
      return;
    }

    const logsToPublish = [];
    for (const result of criticalErrors) {
      for (const error of result.errors) {
        logsToPublish.push({
          level: error.severity,
          source: 'auto-crawler',
          message: `${error.type}: ${error.message}`,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          metadata: {
            url: result.url,
            responseTime: result.responseTime,
            scanTimestamp: result.timestamp,
            userAgent: scanConfig.userAgent,
            crawlerConfig: scanConfig
          },
          stack_trace: error.stack
        });
      }
    }

    try {
      const { error } = await supabase.functions.invoke('admin-logs', {
        body: {
          action: 'bulk_create',
          logs: logsToPublish
        }
      });

      if (error) throw error;

      toast({
        title: "Ошибки опубликованы",
        description: `${logsToPublish.length} ошибок добавлено в систему логов`
      });
    } catch (err) {
      console.error('Failed to publish errors:', err);
      toast({
        title: "Ошибка публикации",
        description: "Не удалось опубликовать ошибки в логи",
        variant: "destructive"
      });
    }
  };

  const resetScan = () => {
    setResults([]);
    setProgress(0);
    setScannedPages(0);
    setFoundErrors(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Автоматический поиск ошибок</h3>
      </div>

      <Tabs defaultValue="scanner" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanner">Сканер</TabsTrigger>
          <TabsTrigger value="config">Настройки</TabsTrigger>
          <TabsTrigger value="results">Результаты</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Быстрое сканирование
              </CardTitle>
              <CardDescription>
                Автоматический поиск ошибок на платформе с технологией веб-краулинга
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startUrl">Начальный URL</Label>
                <Input
                  id="startUrl"
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={startScan} 
                  disabled={isScanning}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Запустить сканирование
                </Button>
                
                {isScanning && (
                  <Button 
                    onClick={stopScan} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Остановить
                  </Button>
                )}
                
                <Button 
                  onClick={resetScan} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Сброс
                </Button>
              </div>

              {isScanning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Прогресс сканирования</span>
                    <span>{scannedPages} / {scanConfig.maxPages} страниц</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{scannedPages}</div>
                    <div className="text-sm text-muted-foreground">Просканировано</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-destructive">{foundErrors}</div>
                    <div className="text-sm text-muted-foreground">Найдено ошибок</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Успешно</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки сканирования</CardTitle>
              <CardDescription>
                Настройте параметры автоматического поиска ошибок
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Максимальная глубина</Label>
                  <Input
                    type="number"
                    value={scanConfig.maxDepth}
                    onChange={(e) => setScanConfig(prev => ({ 
                      ...prev, 
                      maxDepth: parseInt(e.target.value) || 3 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Максимум страниц</Label>
                  <Input
                    type="number"
                    value={scanConfig.maxPages}
                    onChange={(e) => setScanConfig(prev => ({ 
                      ...prev, 
                      maxPages: parseInt(e.target.value) || 50 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Задержка между запросами (мс)</Label>
                <Input
                  type="number"
                  value={scanConfig.delayBetweenRequests}
                  onChange={(e) => setScanConfig(prev => ({ 
                    ...prev, 
                    delayBetweenRequests: parseInt(e.target.value) || 1000 
                  }))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Анализ JavaScript</Label>
                  <Switch
                    checked={scanConfig.includeJavaScript}
                    onCheckedChange={(checked) => setScanConfig(prev => ({ 
                      ...prev, 
                      includeJavaScript: checked 
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Проверка производительности</Label>
                  <Switch
                    checked={scanConfig.checkPerformance}
                    onCheckedChange={(checked) => setScanConfig(prev => ({ 
                      ...prev, 
                      checkPerformance: checked 
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Следовать внешним ссылкам</Label>
                  <Switch
                    checked={scanConfig.followExternalLinks}
                    onCheckedChange={(checked) => setScanConfig(prev => ({ 
                      ...prev, 
                      followExternalLinks: checked 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>User Agent</Label>
                <Input
                  value={scanConfig.userAgent}
                  onChange={(e) => setScanConfig(prev => ({ 
                    ...prev, 
                    userAgent: e.target.value 
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Результаты сканирования</CardTitle>
              <CardDescription>
                Найденные ошибки и проблемы на платформе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {results.length === 0 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Запустите сканирование для поиска ошибок
                      </AlertDescription>
                    </Alert>
                  ) : (
                    results.map((result, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {result.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : result.status === 'warning' ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              <span className="text-sm font-medium truncate">
                                {result.url}
                              </span>
                            </div>
                            
                            {result.errors.map((error, errorIndex) => (
                              <div key={errorIndex} className="ml-6">
                                <Badge 
                                  variant={error.severity === 'critical' ? 'destructive' : 
                                          error.severity === 'error' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {error.type}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {error.message}
                                </p>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {result.responseTime}ms
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              {results.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={publishErrorsToLogs}
                    className="w-full"
                  >
                    Опубликовать ошибки в логи
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};