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
    <div className="space-y-8">
      <Seo title="ServiceHub — Admin Dashboard" description="Операционные метрики и аналитика" canonical="/admin" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Admin Dashboard
            </span>
          </h1>
          <p className="text-muted-foreground">
            Операционные метрики и ключевые показатели платформы
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 card-surface border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option value="24h">24 часа</option>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="90d">90 дней</option>
          </select>
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="btn-ghost px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4"
        >
          {alerts.map((alert: any, index: number) => (
            <div key={index} className="card-surface border-l-4 border-l-red-500 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-red-900 mb-1">{alert.title}</h3>
                  <p className="text-sm text-red-700 mb-2">{alert.message}</p>
                  <Badge variant="destructive" className="text-xs">{alert.severity}</Badge>
                </div>
              </div>
            </div>
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
              className="group hover-scale h-full"
            >
              <div className="card-surface p-6 relative overflow-hidden h-full flex flex-col min-h-[180px]">
                {/* Icon and Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${metric.color.replace('text-', 'bg-')}/10`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {metric.title}
                    </h3>
                  </div>
                </div>

                {/* Value and Change */}
                <div className="flex items-end justify-between mb-4 flex-grow">
                  <div className="text-3xl font-bold">
                    {metric.value}
                  </div>
                  {metric.change !== 0 && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      isPositive 
                        ? 'bg-green-500/10 text-green-600' 
                        : isNegative 
                        ? 'bg-red-500/10 text-red-600' 
                        : 'bg-gray-500/10 text-gray-600'
                    }`}>
                      {isPositive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : isNegative ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : null}
                      {Math.abs(metric.change).toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent to-primary/20">
                  <div 
                    className={`h-full bg-gradient-to-r ${metric.color.replace('text-', 'from-')} to-primary transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(100, Math.abs(metric.change) * 2)}%` }}
                  />
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
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
          className="hover-scale"
        >
          <div className="card-surface p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">GMV Тренд</h3>
                <p className="text-sm text-muted-foreground">Валовый объем сделок за период</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.gmv_trend || []}>
                  <defs>
                    <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="gmv" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#gmv)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* User Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="hover-scale"
        >
          <div className="card-surface p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Активность пользователей</h3>
                <p className="text-sm text-muted-foreground">MAU, WAU, DAU динамика</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.user_activity || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="dau" stroke="#3b82f6" strokeWidth={3} name="DAU" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="wau" stroke="#8b5cf6" strokeWidth={3} name="WAU" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="mau" stroke="#10b981" strokeWidth={3} name="MAU" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Job Categories Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="hover-scale"
        >
          <div className="card-surface p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Распределение по категориям</h3>
                <p className="text-sm text-muted-foreground">Топ категории услуг</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="hover-scale"
        >
          <div className="card-surface p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold">Здоровье системы</h3>
                <p className="text-sm text-muted-foreground">Ключевые операционные показатели</p>
              </div>
            </div>
            
            {/* Horizontal neumorphic indicators */}
            <div className="grid grid-cols-5 gap-4 h-[300px] content-center">
              {/* Uptime */}
              <div className="flex flex-col items-center space-y-3">
                <div className="text-xs font-medium text-center text-muted-foreground">
                  Uptime
                </div>
                <div className="relative w-8 h-20 bg-gradient-to-b from-white/20 to-black/10 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.2)] flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ height: '99.9%' }}
                  />
                </div>
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-white/30 to-white/10 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-green-600" />
                </div>
                <div className="text-xs font-semibold text-green-600">99.9%</div>
              </div>

              {/* API Response Time */}
              <div className="flex flex-col items-center space-y-3">
                <div className="text-xs font-medium text-center text-muted-foreground">
                  API Time
                </div>
                <div className="relative w-8 h-20 bg-gradient-to-b from-white/20 to-black/10 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.2)] flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ height: `${Math.max(0, 100 - (stats.api_response_time || 120) / 5)}%` }}
                  />
                </div>
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-white/30 to-white/10 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                </div>
                <div className="text-xs font-semibold">{stats.api_response_time || 120}ms</div>
              </div>

              {/* Error Rate */}
              <div className="flex flex-col items-center space-y-3">
                <div className="text-xs font-medium text-center text-muted-foreground">
                  Errors
                </div>
                <div className="relative w-8 h-20 bg-gradient-to-b from-white/20 to-black/10 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.2)] flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-gradient-to-t from-pink-500 to-pink-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ height: `${Math.max(5, (stats.error_rate || 0.1) * 20)}%` }}
                  />
                </div>
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-white/30 to-white/10 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-400 to-pink-600" />
                </div>
                <div className="text-xs font-semibold">{(stats.error_rate || 0.1).toFixed(2)}%</div>
              </div>

              {/* Queue Health */}
              <div className="flex flex-col items-center space-y-3">
                <div className="text-xs font-medium text-center text-muted-foreground">
                  Queue
                </div>
                <div className="relative w-8 h-20 bg-gradient-to-b from-white/20 to-black/10 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.2)] flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-gradient-to-t from-teal-500 to-cyan-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ height: `${stats.queue_health || 98}%` }}
                  />
                </div>
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-white/30 to-white/10 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600" />
                </div>
                <div className="text-xs font-semibold text-teal-600">{stats.queue_health || 98}%</div>
              </div>

              {/* Memory Usage */}
              <div className="flex flex-col items-center space-y-3">
                <div className="text-xs font-medium text-center text-muted-foreground">
                  Memory
                </div>
                <div className="relative w-8 h-20 bg-gradient-to-b from-white/20 to-black/10 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.2)] flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ height: `${stats.memory_usage || 68}%` }}
                  />
                </div>
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-white/30 to-white/10 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-green-600" />
                </div>
                <div className="text-xs font-semibold">{stats.memory_usage || 68}%</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="card-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Быстрые действия</h3>
              <p className="text-sm text-muted-foreground">Часто используемые операции</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="card-surface p-4 rounded-xl hover-scale group flex flex-col items-center gap-3 text-center min-h-[100px] border-0">
              <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Пользователи</span>
            </button>
            
            <button className="card-surface p-4 rounded-xl hover-scale group flex flex-col items-center gap-3 text-center min-h-[100px] border-0">
              <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium">Заказы</span>
            </button>
            
            <button className="card-surface p-4 rounded-xl hover-scale group flex flex-col items-center gap-3 text-center min-h-[100px] border-0">
              <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium">Финансы</span>
            </button>
            
            <button className="card-surface p-4 rounded-xl hover-scale group flex flex-col items-center gap-3 text-center min-h-[100px] border-0">
              <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-sm font-medium">Споры</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
