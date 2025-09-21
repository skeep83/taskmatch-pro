import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAPI } from '@/lib/adminApi';
import { ErrorTrends } from '@/components/admin/ErrorTrends';
import { RefreshCw, Download, Search, AlertTriangle, Info, XCircle, CheckCircle, BarChart3, List } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

interface LogStats {
  total: number;
  critical: number;
  errors: number;
  warnings: number;
  resolved: number;
  last_24h: number;
}

const levelColors = {
  critical: 'destructive',
  error: 'destructive',
  warning: 'secondary',
  info: 'default',
} as const;

const levelIcons = {
  critical: AlertTriangle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    level: 'all',
    source: 'all',
    search: '',
    resolved: 'all',
    timeRange: '24h'
  });
  const [page, setPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const adminApi = new AdminAPI();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getLogs({
        page,
        limit: 50,
        ...filters
      });
      setLogs(response.logs);
      setStats(response.stats);
      setError(null);
    } catch (err) {
      setError('Ошибка при загрузке логов');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (logId: string) => {
    try {
      await adminApi.markLogAsResolved(logId);
      await fetchLogs();
    } catch (err) {
      console.error('Error marking log as resolved:', err);
    }
  };

  const exportLogs = async () => {
    try {
      const csvData = await adminApi.exportLogs(filters);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Мониторинг ошибок</h1>
          <p className="text-muted-foreground">
            Продвинутая система сбора и анализа ошибок платформы
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Логи
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Аналитика
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <ErrorTrends />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                  <p className="text-xs text-muted-foreground">Решено</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{stats.last_24h}</div>
                  <p className="text-xs text-muted-foreground">За 24 часа</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по сообщению..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Уровень" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уровни</SelectItem>
                    <SelectItem value="critical">Критические</SelectItem>
                    <SelectItem value="error">Ошибки</SelectItem>
                    <SelectItem value="warning">Предупреждения</SelectItem>
                    <SelectItem value="info">Информация</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.source} onValueChange={(value) => handleFilterChange('source', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Источник" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все источники</SelectItem>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.resolved} onValueChange={(value) => handleFilterChange('resolved', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="false">Не решено</SelectItem>
                    <SelectItem value="true">Решено</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.timeRange} onValueChange={(value) => handleFilterChange('timeRange', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Период" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Последний час</SelectItem>
                    <SelectItem value="24h">Последние 24 часа</SelectItem>
                    <SelectItem value="7d">Последние 7 дней</SelectItem>
                    <SelectItem value="30d">Последние 30 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Logs List */}
          <div className="space-y-4">
            {logs.map((log) => {
              const IconComponent = levelIcons[log.level];
              const isExpanded = expandedLog === log.id;
              
              return (
                <Card key={log.id} className={`transition-all ${log.level === 'critical' ? 'border-red-200 bg-red-50/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <IconComponent className={`w-5 h-5 mt-0.5 ${
                          log.level === 'critical' ? 'text-red-600' :
                          log.level === 'error' ? 'text-red-500' :
                          log.level === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={levelColors[log.level] as any}>
                              {log.level.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{log.source}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: ru })}
                            </span>
                            {log.resolved && (
                              <Badge variant="secondary" className="text-green-700 bg-green-100">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Решено
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{log.message}</p>
                          {log.user_id && (
                            <p className="text-xs text-muted-foreground">
                              Пользователь: {log.user_id}
                            </p>
                          )}
                          
                          {isExpanded && (
                            <div className="mt-4 space-y-3 pt-3 border-t">
                              <div>
                                <h4 className="text-sm font-medium mb-1">Время:</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(log.timestamp), 'dd.MM.yyyy HH:mm:ss')}
                                </p>
                              </div>
                              
                              {log.metadata && (
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Метаданные:</h4>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {log.stack_trace && (
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Stack Trace:</h4>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                    {log.stack_trace}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          {isExpanded ? 'Свернуть' : 'Подробнее'}
                        </Button>
                        {!log.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsResolved(log.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Решено
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {logs.length === 50 && (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
              >
                Загрузить еще
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}