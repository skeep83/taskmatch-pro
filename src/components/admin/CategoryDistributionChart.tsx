import { motion } from "framer-motion";
import { 
  Wrench, Zap, Sparkles, Paintbrush, 
  Car, Trees, Monitor, Package 
} from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryDistributionChartProps {
  data: CategoryData[];
}

// Icon mapping for different categories
const categoryIcons: Record<string, any> = {
  'Сантехника': Wrench,
  'Электрика': Zap,
  'Уборка': Sparkles,
  'Малярные работы': Paintbrush,
  'Переезды/грузчики': Car,
  'Сад/ландшафт': Trees,
  'IT услуги': Monitor,
  'Доставка': Package,
};

// Color palette for segments
const segmentColors = [
  'hsl(189, 100%, 50%)', // Cyan
  'hsl(210, 30%, 65%)',  // Blue-gray
  'hsl(189, 80%, 60%)',  // Light cyan
  'hsl(210, 25%, 75%)',  // Lighter blue-gray
  'hsl(189, 60%, 70%)',  // Very light cyan
  'hsl(210, 20%, 85%)',  // Very light blue-gray
];

export function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Нет данных для отображения
      </div>
    );
  }

  // Calculate angles for each segment
  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      color: segmentColors[index % segmentColors.length]
    };
  });

  // SVG path for donut segments
  const createPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const start = polarToCartesian(0, 0, outerRadius, endAngle);
    const end = polarToCartesian(0, 0, outerRadius, startAngle);
    const innerStart = polarToCartesian(0, 0, innerRadius, endAngle);
    const innerEnd = polarToCartesian(0, 0, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y, 
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      {/* Central donut chart */}
      <div className="relative flex items-center gap-20 w-full max-w-4xl">
        {/* Анимированные линии соединения */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          style={{ zIndex: 3 }}
          viewBox="0 0 800 400"
          width="800"
          height="400"
        >
          <defs>
            <linearGradient id="categoryLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {segments.slice(0, 4).map((segment, index) => {
            const startX = 200; // Центр диаграммы
            const startY = 200; // Центр по вертикали
            const endX = 450; // Начало карточек категорий
            const endY = 80 + (index * 80); // Позиция каждой карточки
            
            return (
              <g key={index}>
                {/* Основная линия */}
                <path
                  d={`M ${startX} ${startY} Q ${startX + 30} ${startY} ${endX} ${endY}`}
                  stroke="url(#categoryLineGradient)"
                  strokeWidth="1.5"
                  fill="none"
                  className="animate-fade-in"
                  style={{ 
                    animationDelay: `${index * 0.2}s`,
                    strokeDasharray: '4,4',
                    animation: `fadeInLine 1s ease-out ${index * 0.2}s forwards, dashFlow 3s linear infinite`
                  }}
                />
                
                {/* Светящаяся точка на конце */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="2"
                  fill={segment.color}
                  className="animate-pulse"
                  style={{ 
                    animationDelay: `${index * 0.2 + 0.5}s`,
                    filter: `drop-shadow(0 0 4px ${segment.color})`
                  }}
                />
              </g>
            );
          })}
        </svg>

        <div className="flex-shrink-0">
          <svg width="300" height="300" viewBox="-150 -150 300 300" className="drop-shadow-lg" style={{ zIndex: 2 }}>
          {/* Background circle */}
          <circle
            cx="0"
            cy="0"
            r="120"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            opacity="0.1"
          />
          
          {/* Donut segments */}
          {segments.map((segment, index) => (
            <motion.path
              key={segment.name}
              d={createPath(segment.startAngle, segment.endAngle, 40, 110)}
              fill={segment.color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="hover:brightness-110 transition-all duration-200 cursor-pointer"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
              }}
            />
          ))}
          
          {/* Center circle */}
          <circle
            cx="0"
            cy="0"
            r="55"
            fill="hsl(var(--background))"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            className="drop-shadow-sm"
          />
          
          {/* Center text */}
          <text
            x="0"
            y="-5"
            textAnchor="middle"
            className="fill-muted-foreground text-xs font-medium"
          >
            Всего
          </text>
          <text
            x="0"
            y="8"
            textAnchor="middle"
            className="fill-foreground text-sm font-bold"
          >
            {total}
          </text>
          </svg>
        </div>

        {/* Category labels connected by lines */}
        <div className="space-y-4" style={{ zIndex: 2 }}>
          {segments.slice(0, 4).map((segment, index) => {
            const IconComponent = categoryIcons[segment.name] || Package;

            return (
              <motion.div
                key={segment.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl card-surface min-w-[180px] border border-border/50"
              >
                <div 
                  className="p-2 rounded-lg shadow-sm flex-shrink-0"
                  style={{ backgroundColor: `${segment.color}20` }}
                >
                  <IconComponent 
                    className="h-4 w-4" 
                    style={{ color: segment.color }}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {segment.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {segment.value} ({segment.percentage.toFixed(1)}%)
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}