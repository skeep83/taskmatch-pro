import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { AdminAPI } from '@/lib/adminApi';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Target, Zap } from 'lucide-react';

interface ErrorTrend {
  date: string;
  critical: number;
  error: number;
  warning: number;
  total: number;
}

interface ErrorBySource {
  source: string;
  count: number;
  percentage: number;
}

interface TopError {
  message: string;
  count: number;
  level: string;
  source: string;
  fingerprint: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export function ErrorTrends() {
  const [trends, setTrends] = useState<ErrorTrend[]>([]);
  const [sourceData, setSourceData] = useState<ErrorBySource[]>([]);
  const [topErrors, setTopErrors] = useState<TopError[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  const adminApi = new AdminAPI();

  const fetchTrends = async () => {
    try {
      setLoading(true);
      
      // This would be a new endpoint in the admin-logs function
      const response = await adminApi.makeRequest('admin-logs', { 
        action: 'trends',
        timeRange 
      });
      
      setTrends(response.trends || []);
      setSourceData(response.bySource || []);
      setTopErrors(response.topErrors || []);
      
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalErrors = trends.reduce((sum, day) => sum + day.total, 0);
  const avgErrorsPerDay = Math.round(totalErrors / Math.max(trends.length, 1));
  const criticalErrors = trends.reduce((sum, day) => sum + day.critical, 0);
  const errorRate = totalErrors > 0 ? ((criticalErrors / totalErrors) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Всего ошибок</p>
                <p className="text-2xl font-bold">{totalErrors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">В день</p>
                <p className="text-2xl font-bold">{avgErrorsPerDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Критические</p>
                <p className="text-2xl font-bold">{criticalErrors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Критичность</p>
                <p className="text-2xl font-bold">{errorRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Trends Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Тренды ошибок</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Критические" />
                <Line type="monotone" dataKey="error" stroke="#f97316" strokeWidth={2} name="Ошибки" />
                <Line type="monotone" dataKey="warning" stroke="#eab308" strokeWidth={2} name="Предупреждения" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Errors by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Ошибки по источникам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ source, percentage }) => `${source} (${percentage}%)`}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Топ ошибок</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topErrors.map((error, index) => (
              <div key={error.fingerprint} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={
                      error.level === 'critical' ? 'destructive' :
                      error.level === 'error' ? 'destructive' :
                      error.level === 'warning' ? 'secondary' : 'default'
                    }>
                      {error.level}
                    </Badge>
                    <Badge variant="outline">{error.source}</Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{error.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Fingerprint: {error.fingerprint}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{error.count}</p>
                  <p className="text-xs text-muted-foreground">вхождений</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}