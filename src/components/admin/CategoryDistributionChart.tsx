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
    <div className="relative w-full h-[300px] flex items-center justify-center">
      {/* Central donut chart */}
      <div className="relative">
        <svg viewBox="-300 -300 600 600" className="h-[240px] w-[240px] drop-shadow-lg sm:h-[600px] sm:w-[600px]">
          {/* Background circle */}
          <circle
            cx="0"
            cy="0"
            r="85"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            opacity="0.1"
          />

          {/* Donut segments */}
          {segments.map((segment, index) => (
            <motion.path
              key={segment.name}
              d={createPath(segment.startAngle, segment.endAngle, 30, 80)}
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
            r="40"
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

      {/* Category labels around the chart */}
      {segments.slice(0, 4).map((segment, index) => {
        const IconComponent = categoryIcons[segment.name] || Package;
        const positions = [
          { top: '10%', left: '10%' }, // Top-left
          { top: '10%', right: '10%' }, // Top-right
          { bottom: '10%', left: '10%' }, // Bottom-left
          { bottom: '10%', right: '10%' }, // Bottom-right
        ];

        return (
          <motion.div
            key={segment.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="absolute flex flex-col items-center gap-2 p-3 rounded-xl card-surface min-w-[100px]"
            style={positions[index]}
          >
            <div
              className="p-2 rounded-lg shadow-sm"
              style={{ backgroundColor: `${segment.color}20` }}
            >
              <IconComponent
                className="h-4 w-4"
                style={{ color: segment.color }}
              />
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-foreground">
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
  );
}