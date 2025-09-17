import { useState, useEffect } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Settings, Maximize2, Minimize2, GripVertical } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Briefcase, DollarSign, 
  AlertTriangle, Clock, Shield, Star, Activity, ArrowUpRight,
  ArrowDownRight, Target
} from "lucide-react";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface MetricCardProps {
  id: string;
  title: string;
  value: string;
  change: number;
  icon: any;
  color: string;
  reverseGood?: boolean;
}

interface ChartCardProps {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  data: any[];
  type: 'area' | 'line' | 'pie' | 'health';
}

export interface DraggableMetricsProps {
  metricCards: MetricCardProps[];
  chartCards: ChartCardProps[];
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

// Default layout configuration
const defaultLayouts = {
  lg: [
    // Metric cards
    { i: 'gmv', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'mau', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'jobs', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'conversion', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'response_time', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'nps', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'disputes', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'risk', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    // Chart cards
    { i: 'gmv_chart', x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'activity_chart', x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'categories_chart', x: 0, y: 8, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'health_chart', x: 6, y: 8, w: 6, h: 4, minW: 4, minH: 3 },
  ],
  md: [
    { i: 'gmv', x: 0, y: 0, w: 3, h: 2 },
    { i: 'mau', x: 3, y: 0, w: 3, h: 2 },
    { i: 'jobs', x: 0, y: 2, w: 3, h: 2 },
    { i: 'conversion', x: 3, y: 2, w: 3, h: 2 },
    { i: 'response_time', x: 0, y: 4, w: 3, h: 2 },
    { i: 'nps', x: 3, y: 4, w: 3, h: 2 },
    { i: 'disputes', x: 0, y: 6, w: 3, h: 2 },
    { i: 'risk', x: 3, y: 6, w: 3, h: 2 },
    { i: 'gmv_chart', x: 0, y: 8, w: 6, h: 4 },
    { i: 'activity_chart', x: 0, y: 12, w: 6, h: 4 },
    { i: 'categories_chart', x: 0, y: 16, w: 6, h: 4 },
    { i: 'health_chart', x: 0, y: 20, w: 6, h: 4 },
  ],
  sm: [
    { i: 'gmv', x: 0, y: 0, w: 4, h: 2 },
    { i: 'mau', x: 0, y: 2, w: 4, h: 2 },
    { i: 'jobs', x: 0, y: 4, w: 4, h: 2 },
    { i: 'conversion', x: 0, y: 6, w: 4, h: 2 },
    { i: 'response_time', x: 0, y: 8, w: 4, h: 2 },
    { i: 'nps', x: 0, y: 10, w: 4, h: 2 },
    { i: 'disputes', x: 0, y: 12, w: 4, h: 2 },
    { i: 'risk', x: 0, y: 14, w: 4, h: 2 },
    { i: 'gmv_chart', x: 0, y: 16, w: 4, h: 4 },
    { i: 'activity_chart', x: 0, y: 20, w: 4, h: 4 },
    { i: 'categories_chart', x: 0, y: 24, w: 4, h: 4 },
    { i: 'health_chart', x: 0, y: 28, w: 4, h: 4 },
  ]
};

const MetricCard = ({ metric, isDragging }: { metric: MetricCardProps; isDragging: boolean }) => {
  const Icon = metric.icon;
  const isPositive = metric.reverseGood ? metric.change < 0 : metric.change > 0;
  const isNegative = metric.reverseGood ? metric.change > 0 : metric.change < 0;

  return (
    <motion.div
      className={`group h-full transition-all duration-200 ${isDragging ? 'z-50' : ''}`}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="card-surface h-full p-4 relative overflow-hidden">
        {/* Icon and Title */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`p-2 rounded-lg ${metric.color.replace('text-', 'bg-')}/10`}>
            <Icon className={`h-4 w-4 ${metric.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {metric.title}
            </h3>
          </div>
        </div>

        {/* Value and Change */}
        <div className="flex items-end justify-between mb-3">
          <div className="text-2xl font-bold truncate">
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
};

const ChartCard = ({ chart, isDragging }: { chart: ChartCardProps; isDragging: boolean }) => {
  const Icon = chart.icon;

  const renderChart = () => {
    switch (chart.type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart.data}>
              <defs>
                <linearGradient id={`gradient-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }} />
              <Area type="monotone" dataKey="gmv" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill={`url(#gradient-${chart.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }} />
              <Legend />
              <Line type="monotone" dataKey="dau" stroke="#3b82f6" strokeWidth={2} name="DAU" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="wau" stroke="#8b5cf6" strokeWidth={2} name="WAU" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="mau" stroke="#10b981" strokeWidth={2} name="MAU" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chart.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45 + 200}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'health':
        const healthMetrics = [
          { label: "Uptime", value: 99.9, color: "green" },
          { label: "API Response", value: 120, color: "blue", unit: "ms" },
          { label: "Error Rate", value: 0.1, color: "red", unit: "%" },
          { label: "Queue Health", value: 85, color: "yellow", unit: "%" },
          { label: "Memory Usage", value: 65, color: "purple", unit: "%" }
        ];

        return (
          <div className="space-y-4 p-2">
            {healthMetrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{metric.label}</span>
                    <span className="text-muted-foreground">
                      {metric.value}{metric.unit || ''}
                    </span>
                  </div>
                  <div className="w-full bg-secondary/30 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full bg-${metric.color}-500 rounded-full transition-all duration-500`}
                      style={{ width: `${metric.unit === 'ms' ? Math.min(100, (metric.value / 200) * 100) : metric.value}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return <div className="flex items-center justify-center h-full text-muted-foreground">Chart</div>;
    }
  };

  return (
    <motion.div
      className={`group h-full transition-all duration-200 ${isDragging ? 'z-50' : ''}`}
      whileHover={{ scale: isDragging ? 1 : 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="card-surface h-full p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 ${chart.color}/10 rounded-lg`}>
            <Icon className={`h-5 w-5 ${chart.color.replace('bg-', 'text-')}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{chart.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{chart.description}</p>
          </div>
        </div>
        <div className="h-[calc(100%-80px)]">
          {renderChart()}
        </div>
      </div>
    </motion.div>
  );
};

export const DraggableMetrics = ({ metricCards, chartCards, isEditMode, onToggleEditMode }: DraggableMetricsProps) => {
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [isDragging, setIsDragging] = useState(false);

  // Load saved layouts from localStorage
  useEffect(() => {
    const savedLayouts = localStorage.getItem('admin-dashboard-layouts');
    if (savedLayouts) {
      try {
        setLayouts(JSON.parse(savedLayouts));
      } catch (e) {
        console.error('Failed to parse saved layouts:', e);
      }
    }
  }, []);

  // Save layouts to localStorage
  const handleLayoutChange = (layout: Layout[], layouts: any) => {
    setLayouts(layouts);
    localStorage.setItem('admin-dashboard-layouts', JSON.stringify(layouts));
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const resetLayouts = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem('admin-dashboard-layouts');
  };

  // Combine all cards data
  const allCards = [
    ...metricCards.map((card, index) => ({ 
      ...card, 
      id: ['gmv', 'mau', 'jobs', 'conversion', 'response_time', 'nps', 'disputes', 'risk'][index] || `metric-${index}`,
      type: 'metric' as const 
    })),
    ...chartCards
  ];

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={isEditMode ? "default" : "ghost"}
            size="sm"
            onClick={onToggleEditMode}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {isEditMode ? 'Завершить настройку' : 'Настроить макет'}
          </Button>
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayouts}
              className="flex items-center gap-2"
            >
              Сбросить макет
            </Button>
          )}
        </div>
        {isEditMode && (
          <Badge variant="secondary" className="flex items-center gap-2">
            <GripVertical className="h-3 w-3" />
            Перетащите и изменяйте размер карточек
          </Badge>
        )}
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 6, sm: 4, xs: 2, xxs: 1 }}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        style={{
          transition: isDragging ? 'none' : 'all 0.2s ease-out'
        }}
      >
        {allCards.map((card) => (
          <div key={card.id} className="h-full">
            {card.type === 'metric' ? (
              <MetricCard metric={card as MetricCardProps} isDragging={isDragging} />
            ) : (
              <ChartCard chart={card} isDragging={isDragging} />
            )}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Edit Mode Styles */}
      <style>{`
        .react-grid-item.react-grid-placeholder {
          background: hsl(var(--primary) / 0.1) !important;
          border: 2px dashed hsl(var(--primary)) !important;
          border-radius: 12px !important;
        }
        
        .react-resizable-handle {
          opacity: ${isEditMode ? '1' : '0'} !important;
          background: hsl(var(--primary)) !important;
          border-radius: 2px !important;
        }
        
        .react-resizable-handle::after {
          border-color: hsl(var(--primary-foreground)) !important;
        }
        
        .react-grid-item.react-draggable-dragging {
          transform: rotate(2deg) !important;
          transition: none !important;
          z-index: 100 !important;
        }
        
        .react-grid-item.react-resizable-resizing {
          opacity: 0.9 !important;
          z-index: 100 !important;
        }
      `}</style>
    </div>
  );
};