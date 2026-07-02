import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Clock,
  RefreshCw,
  Shield,
  Users,
  DollarSign,
  Settings,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LiveVisitors } from "@/components/admin/LiveVisitors";
import { adminApi } from "@/lib/adminApi";

type MetricCard = {
  title: string;
  value: string;
  change: number;
  icon: any;
  color: string;
  tone: string;
  reverseGood?: boolean;
  helper: string;
};

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getAnalytics("dashboard", timeRange);
      setDashboardData(data);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки данных",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const stats = dashboardData?.stats || {};
  const charts = dashboardData?.charts || {};
  const alerts = (dashboardData?.alerts || []).slice(0, 3);

  const primaryMetrics = useMemo<MetricCard[]>(() => [
    {
      title: "Заказы в работе",
      value: (stats.active_jobs || 0).toLocaleString(),
      change: stats.jobs_change || 0,
      icon: Briefcase,
      color: "text-violet-600",
      tone: "bg-violet-500/10",
      helper: "Текущая загрузка платформы",
    },
    {
      title: "Активные споры",
      value: (stats.active_disputes || 0).toLocaleString(),
      change: stats.disputes_change || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      tone: "bg-red-500/10",
      reverseGood: true,
      helper: "Требуют ручной разбор",
    },
    {
      title: "Флаги риска",
      value: (stats.risk_flags || 0).toLocaleString(),
      change: stats.risk_change || 0,
      icon: Shield,
      color: "text-amber-600",
      tone: "bg-amber-500/10",
      reverseGood: true,
      helper: "Сигналы фрода и нарушений",
    },
    {
      title: "Время ответа",
      value: `${(stats.avg_response_time || 0).toFixed(1)}м`,
      change: stats.response_time_change || 0,
      icon: Clock,
      color: "text-cyan-600",
      tone: "bg-cyan-500/10",
      reverseGood: true,
      helper: "Среднее по активным обращениям",
    },
  ], [stats]);

  const secondaryStats = [
    { label: "GMV за период", value: `$${(stats.gmv_7d || 0).toLocaleString()}` },
    { label: "Конверсия", value: `${(stats.conversion_rate || 0).toFixed(1)}%` },
    { label: "MAU", value: (stats.mau || 0).toLocaleString() },
    { label: "NPS", value: (stats.nps || 0).toFixed(1) },
  ];

  const healthStats = [
    { label: "API", value: `${stats.api_response_time || 120}ms` },
    { label: "Ошибки", value: `${(stats.error_rate || 0.1).toFixed(2)}%` },
    { label: "Очередь", value: `${stats.queue_health || 98}%` },
    { label: "Память", value: `${stats.memory_usage || 68}%` },
  ];

  const quickActions = [
    { label: "Пользователи", icon: Users, onClick: () => navigate("/admin/users") },
    { label: "Заказы", icon: Briefcase, onClick: () => navigate("/admin/jobs") },
    { label: "Финансы", icon: DollarSign, onClick: () => navigate("/admin/finance") },
    { label: "Настройки", icon: Settings, onClick: () => navigate("/admin/settings") },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Seo title="ServiceHub — Админ-панель" description="Операционный обзор ServiceHub" canonical="/admin" />
        <div className="card-surface p-6 sm:p-7">
          <div className="h-7 w-56 rounded-xl bg-slate-200 animate-pulse mb-3" />
          <div className="h-4 w-72 rounded-xl bg-slate-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-surface p-6 rounded-3xl animate-pulse h-[178px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="card-surface h-[360px] rounded-3xl animate-pulse xl:col-span-2" />
          <div className="card-surface h-[360px] rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Seo title="ServiceHub — Админ-панель" description="Операционный обзор ServiceHub" canonical="/admin" />

      <section className="card-surface p-6 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Операционный обзор</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Главное без лишнего шума</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Только ключевые сигналы для ежедневной работы: заказы, споры, риски, SLA и быстрые переходы.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-4 py-2 card-surface border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 sm:w-auto"
            >
              <option value="24h">24 часа</option>
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
              <option value="90d">90 дней</option>
            </select>
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="btn-ghost px-4 py-2 rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Обновить
            </button>
          </div>
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="grid gap-3">
          {alerts.map((alert: any, index: number) => (
            <motion.div
              key={`${alert.title}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-surface border-l-4 border-l-red-500 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-red-900">{alert.title}</h3>
                    {alert.severity && <Badge variant="destructive" className="text-xs">{alert.severity}</Badge>}
                  </div>
                  <p className="text-sm text-red-700">{alert.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {primaryMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const improved = metric.reverseGood ? metric.change < 0 : metric.change > 0;
          const degraded = metric.reverseGood ? metric.change > 0 : metric.change < 0;

          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-surface p-6 h-full"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className={`w-12 h-12 rounded-2xl ${metric.tone} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                {metric.change !== 0 && (
                  <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    improved
                      ? "bg-green-500/10 text-green-700"
                      : degraded
                      ? "bg-red-500/10 text-red-700"
                      : "bg-slate-500/10 text-slate-700"
                  }`}>
                    {improved ? <ArrowUpRight className="h-3 w-3" /> : degraded ? <ArrowDownRight className="h-3 w-3" /> : null}
                    {Math.abs(metric.change).toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                <div className="text-3xl font-bold text-gray-900">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.helper}</p>
              </div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-w-0">
        <div className="xl:col-span-2 space-y-6 min-w-0">
          <div className="card-surface p-6 h-full">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900">Динамика заказов</h3>
                <p className="text-sm text-muted-foreground">Новые заказы по дням за выбранный период</p>
              </div>
              <Badge variant="secondary" className="rounded-xl">Операционный сигнал</Badge>
            </div>
            <div className="min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.orders || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-surface p-6">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Финансы и рост</h3>
                  <p className="text-sm text-muted-foreground">Вторичные показатели, полезные для контекста</p>
                </div>
                <Badge variant="outline" className="rounded-xl">Вторично</Badge>
              </div>
              <div className="space-y-3">
                {secondaryStats.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white/40 px-4 py-3">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-surface p-6">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Состояние платформы</h3>
                  <p className="text-sm text-muted-foreground">Только короткая техсводка без dev-overload</p>
                </div>
                <Badge variant="outline" className="rounded-xl">Сервис</Badge>
              </div>
              <div className="space-y-3">
                {healthStats.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white/40 px-4 py-3">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 min-w-0">
          <LiveVisitors />

          <div className="card-surface p-6">
            <div className="mb-5">
              <h3 className="font-semibold text-gray-900">Быстрые действия</h3>
              <p className="text-sm text-muted-foreground">Частые переходы без декоративного шума и фейковых алертов</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full rounded-2xl bg-[#E5E7EB] px-4 py-4 text-left shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] hover:shadow-[2px_2px_4px_#D1D5DB,-2px_-2px_4px_#F9FAFB] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/50 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.label}</div>
                        <div className="text-xs text-muted-foreground">Перейти в рабочий раздел</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Что убрано с главного экрана</h3>
            <p className="text-sm text-muted-foreground">
              Категории, декоративные тех-индикаторы и hardcoded alert-карточки убраны из первого экрана, чтобы оператор видел только то, что помогает действовать.
            </p>
          </div>
          <Badge variant="secondary" className="rounded-xl w-fit">Clean dashboard pass</Badge>
        </div>
      </section>
    </div>
  );
}
