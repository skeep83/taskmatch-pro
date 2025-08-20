import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Users, Briefcase, DollarSign, 
  AlertTriangle, Clock, Shield, Star, Activity, ArrowUpRight,
  ArrowDownRight, RefreshCw, Calendar, MapPin, Target
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Call admin analytics function
      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        body: { timeRange }
      });

      if (error) throw error;
      setDashboardData(data);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки данных",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Seo title="ServiceHub — Admin Dashboard" description="Операционные метрики и аналитика" canonical="/admin" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const charts = dashboardData?.charts || {};
  const alerts = dashboardData?.alerts || [];

  const metricCards = [
    {
      title: "GMV (7д)",
      value: `$${(stats.gmv_7d || 0).toLocaleString()}`,
      change: stats.gmv_change || 0,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "MAU",
      value: (stats.mau || 0).toLocaleString(),
      change: stats.mau_change || 0,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Активные заказы",
      value: (stats.active_jobs || 0).toLocaleString(),
      change: stats.jobs_change || 0,
      icon: Briefcase,
      color: "text-purple-600"
    },
    {
      title: "Конверсия",
      value: `${(stats.conversion_rate || 0).toFixed(1)}%`,
      change: stats.conversion_change || 0,
      icon: Target,
      color: "text-orange-600"
    },
    {
      title: "Ср. время ответа",
      value: `${(stats.avg_response_time || 0).toFixed(1)}м`,
      change: stats.response_time_change || 0,
      icon: Clock,
      color: "text-teal-600",
      reverseGood: true
    },
    {
      title: "NPS",
      value: (stats.nps || 0).toFixed(1),
      change: stats.nps_change || 0,
      icon: Star,
      color: "text-yellow-600"
    },
    {
      title: "Активные споры",
      value: (stats.active_disputes || 0).toLocaleString(),
      change: stats.disputes_change || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      reverseGood: true
    },
    {
      title: "Риск-флаги",
      value: (stats.risk_flags || 0).toLocaleString(),
      change: stats.risk_change || 0,
      icon: Shield,
      color: "text-amber-600",
      reverseGood: true
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Seo title="ServiceHub — Admin Dashboard" description="Операционные метрики и аналитика" canonical="/admin" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Операционные метрики и ключевые показатели платформы
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="24h">24 часа</option>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="90d">90 дней</option>
          </select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadDashboardData}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3"
        >
          {alerts.map((alert: any, index: number) => (
            <Card key={index} className="border-l-4 border-l-red-500 bg-red-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">{alert.title}</p>
                    <p className="text-sm text-red-700">{alert.message}</p>
                    <Badge variant="destructive" className="mt-2">{alert.severity}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.reverseGood ? metric.change < 0 : metric.change > 0;
          const isNegative = metric.reverseGood ? metric.change > 0 : metric.change < 0;
          
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                    {metric.title}
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{metric.value}</p>
                    {metric.change !== 0 && (
                      <div className={`flex items-center gap-1 text-sm ${
                        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {isPositive ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : isNegative ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : null}
                        {Math.abs(metric.change).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </CardHeader>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${metric.color.replace('text-', 'bg-')}/20`}>
                  <div className={`h-full ${metric.color.replace('text-', 'bg-')} transition-all duration-1000 ease-out`} 
                       style={{ width: `${Math.min(100, Math.abs(metric.change) * 2)}%` }} />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                GMV Тренд
              </CardTitle>
              <CardDescription>Валовый объем сделок за период</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={charts.gmv_trend || []}>
                  <defs>
                    <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="gmv" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#gmv)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Активность пользователей
              </CardTitle>
              <CardDescription>MAU, WAU, DAU динамика</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.user_activity || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="dau" stroke="#3b82f6" strokeWidth={2} name="DAU" />
                  <Line type="monotone" dataKey="wau" stroke="#8b5cf6" strokeWidth={2} name="WAU" />
                  <Line type="monotone" dataKey="mau" stroke="#10b981" strokeWidth={2} name="MAU" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Job Categories Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                Распределение по категориям
              </CardTitle>
              <CardDescription>Топ категории услуг</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={charts.category_distribution || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(charts.category_distribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 45 + 200}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" />
                Здоровье системы
              </CardTitle>
              <CardDescription>Ключевые операционные показатели</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uptime</span>
                  <span className="font-medium">99.9%</span>
                </div>
                <Progress value={99.9} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Response Time</span>
                  <span className="font-medium">{stats.api_response_time || 120}ms</span>
                </div>
                <Progress value={Math.max(0, 100 - (stats.api_response_time || 120) / 5)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Error Rate</span>
                  <span className="font-medium">{(stats.error_rate || 0.1).toFixed(2)}%</span>
                </div>
                <Progress value={Math.max(0, 100 - (stats.error_rate || 0.1) * 20)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Queue Health</span>
                  <span className="font-medium">{stats.queue_health || 98}%</span>
                </div>
                <Progress value={stats.queue_health || 98} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
            <CardDescription>Часто используемые операции</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Users className="h-6 w-6" />
                <span className="text-sm">Пользователи</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Briefcase className="h-6 w-6" />
                <span className="text-sm">Заказы</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <DollarSign className="h-6 w-6" />
                <span className="text-sm">Финансы</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <AlertTriangle className="h-6 w-6" />
                <span className="text-sm">Споры</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
