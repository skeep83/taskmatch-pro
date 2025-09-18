import { useState, useEffect } from "react";
import { Seo } from "@/components/Seo";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Activity, Search, Shield, AlertTriangle, Ban, Eye, TrendingUp, Users, CreditCard, Globe } from "lucide-react";

interface RiskAlert {
  id: string;
  user_id: string;
  user_name: string;
  risk_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  score: number;
  status: "new" | "investigating" | "resolved" | "false_positive";
  created_at: string;
  metadata: any;
}

interface RiskRule {
  id: string;
  name: string;
  description: string;
  conditions: any;
  action: string;
  enabled: boolean;
  priority: number;
}

interface RiskStats {
  alerts_today: number;
  users_flagged: number;
  fraud_prevented_cents: number;
  false_positive_rate: number;
}

export default function AdminRisk() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [stats, setStats] = useState<RiskStats>({
    alerts_today: 0,
    users_flagged: 0,
    fraud_prevented_cents: 0,
    false_positive_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const { toast } = useToast();

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Получаем реальные данные по рискам из базы данных
      // Здесь можно добавить таблицы для риск-алертов и правил
      
      // Для демонстрации, получаем некоторые данные из существующих таблиц
      const { data: auditData } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Анализируем подозрительную активность на основе логов
      const riskAlerts: RiskAlert[] = [];
      
      // Проверяем частые неудачные попытки входа, блокировки и т.д.
      const suspiciousUsers = new Map();
      
      auditData?.forEach(log => {
        if (log.action.includes('block') || log.action.includes('failed')) {
          const userId = log.resource_id || 'unknown';
          if (!suspiciousUsers.has(userId)) {
            suspiciousUsers.set(userId, {
              count: 0,
              actions: [],
              lastActivity: log.created_at
            });
          }
          
          const user = suspiciousUsers.get(userId);
          user.count++;
          user.actions.push(log.action);
          
          if (user.count >= 3) {
            riskAlerts.push({
              id: `risk_${userId}_${Date.now()}`,
              user_id: userId,
              user_name: `Пользователь ${userId.slice(0, 8)}`,
              risk_type: 'suspicious_activity',
              severity: user.count >= 5 ? 'critical' : 'high',
              description: `Подозрительная активность: ${user.actions.join(', ')}`,
              score: Math.min(95, 50 + user.count * 10),
              status: 'new',
              created_at: user.lastActivity,
              metadata: {
                action_count: user.count,
                actions: user.actions
              }
            });
          }
        }
      });

      // Добавляем базовые правила риска
      const mockRules: RiskRule[] = [
        {
          id: "1",
          name: "Multiple Payment Attempts",
          description: "Блокировать пользователей с множественными неудачными попытками оплаты",
          conditions: {
            failed_payments: { gte: 3 },
            timeframe: "1h"
          },
          action: "block_payments",
          enabled: true,
          priority: 1
        },
        {
          id: "2",
          name: "Suspicious Location",
          description: "Флагировать входы с подозрительных локаций",
          conditions: {
            location_risk_score: { gte: 70 }
          },
          action: "require_verification",
          enabled: true,
          priority: 2
        },
        {
          id: "3",
          name: "High Velocity Transactions",
          description: "Отслеживать необычно высокую активность",
          conditions: {
            transactions_per_hour: { gte: 10 }
          },
          action: "manual_review",
          enabled: false,
          priority: 3
        }
      ];

      const mockStats: RiskStats = {
        alerts_today: riskAlerts.length,
        users_flagged: suspiciousUsers.size,
        fraud_prevented_cents: riskAlerts.length * 5000, // Примерная оценка
        false_positive_rate: 0.08
      };

      setAlerts(riskAlerts);
      setRules(mockRules);
      setStats(mockStats);
    } catch (error) {
      console.error("Failed to fetch risk data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные по рискам",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // В реальной системе здесь была бы таблица risk_alerts
      // Пока обновляем локально
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, status: status as any } : alert
        )
      );
      
      // Логируем действие в аудит
      await supabase.functions.invoke('admin-audit', {
        body: {
          action: 'log',
          resource_type: 'risk_alert',
          resource_id: alertId,
          new_values: { status, updated_by: 'admin' }
        }
      });
      
      toast({
        title: "Успешно",
        description: "Статус алерта обновлен"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive"
      });
    }
  };

  const blockUser = async (userId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'block',
          user_id: userId,
          reason: "Risk management decision"
        }
      });

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: "Пользователь заблокирован"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось заблокировать пользователя",
        variant: "destructive"
      });
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // В реальной системе здесь была бы таблица risk_rules
      setRules(prev =>
        prev.map(rule =>
          rule.id === ruleId ? { ...rule, enabled } : rule
        )
      );
      
      // Логируем изменение правила
      await supabase.functions.invoke('admin-audit', {
        body: {
          action: 'log',
          resource_type: 'risk_rule',
          resource_id: ruleId,
          new_values: { enabled, updated_by: 'admin' }
        }
      });
      
      toast({
        title: "Успешно",
        description: `Правило ${enabled ? "включено" : "отключено"}`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить правило",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "bg-yellow-100 text-yellow-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "high": return "bg-red-100 text-red-800";
      case "critical": return "bg-red-500 text-white";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "investigating": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "false_positive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto card-surface">
        <Seo title="ServiceHub — Admin Risk" description="Риск и фрод" canonical="/admin/risk" />
        <div className="flex items-center justify-center py-12">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <Seo title="ServiceHub — Admin Risk" description="Риск и фрод" canonical="/admin/risk" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Управление рисками</h1>
          <p className="text-sm text-muted-foreground">Мониторинг и предотвращение мошенничества</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Алерты сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alerts_today}</div>
            <p className="text-xs text-muted-foreground">+3 за последний час</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Помечено пользователей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users_flagged}</div>
            <p className="text-xs text-muted-foreground">Требуют проверки</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Предотвращено ущерба
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.fraud_prevented_cents / 100).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">За месяц</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ложные срабатывания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.false_positive_rate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Целевой показатель: &lt;5%</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Алерты безопасности</CardTitle>
          <CardDescription>
            Подозрительная активность и угрозы безопасности
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по пользователю или описанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Серьезность" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="critical">Критично</SelectItem>
                <SelectItem value="high">Высокая</SelectItem>
                <SelectItem value="medium">Средняя</SelectItem>
                <SelectItem value="low">Низкая</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="new">Новые</SelectItem>
                <SelectItem value="investigating">В работе</SelectItem>
                <SelectItem value="resolved">Решенные</SelectItem>
                <SelectItem value="false_positive">Ложные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Тип угрозы</TableHead>
                <TableHead>Серьезность</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{alert.user_name}</div>
                      <div className="text-sm text-muted-foreground">{alert.user_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{alert.risk_type.replace('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">{alert.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className={`text-sm font-medium ${
                        alert.score >= 90 ? 'text-red-600' :
                        alert.score >= 70 ? 'text-orange-600' :
                        alert.score >= 50 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {alert.score}/100
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(alert.status)}>
                      {alert.status === 'new' ? 'Новый' :
                       alert.status === 'investigating' ? 'В работе' :
                       alert.status === 'resolved' ? 'Решен' : 'Ложный'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Детали алерта</DialogTitle>
                            <DialogDescription>
                              Подробная информация об угрозе безопасности
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedAlert && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Пользователь:</strong> {selectedAlert.user_name}
                                </div>
                                <div>
                                  <strong>Оценка риска:</strong> {selectedAlert.score}/100
                                </div>
                                <div>
                                  <strong>Тип угрозы:</strong> {selectedAlert.risk_type}
                                </div>
                                <div>
                                  <strong>Серьезность:</strong> {selectedAlert.severity}
                                </div>
                              </div>
                              
                              <div>
                                <strong>Описание:</strong>
                                <p className="mt-1 text-sm">{selectedAlert.description}</p>
                              </div>
                              
                              <div>
                                <strong>Метаданные:</strong>
                                <pre className="mt-1 p-3 bg-gray-50 text-xs rounded-md overflow-auto">
                                  {JSON.stringify(selectedAlert.metadata, null, 2)}
                                </pre>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateAlertStatus(selectedAlert.id, "investigating")}
                                  disabled={selectedAlert.status === "investigating"}
                                >
                                  Взять в работу
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => updateAlertStatus(selectedAlert.id, "false_positive")}
                                >
                                  Ложное срабатывание
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => blockUser(selectedAlert.user_id)}
                                >
                                  <Ban className="w-4 h-4 mr-1" />
                                  Заблокировать
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {alert.status === "new" && (
                        <Button
                          size="sm"
                          onClick={() => updateAlertStatus(alert.id, "investigating")}
                        >
                          Проверить
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Risk Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Правила безопасности</CardTitle>
          <CardDescription>
            Автоматические правила для обнаружения подозрительной активности
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Правило</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Управление</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>{rule.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rule.action.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    <Badge className={rule.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {rule.enabled ? "Активно" : "Отключено"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                    >
                      {rule.enabled ? "Отключить" : "Включить"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}