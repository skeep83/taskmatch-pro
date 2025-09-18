import { motion } from 'framer-motion';
import type { UserTypeStats } from '@/types/liveVisitors';

interface CentralStatsCircleProps {
  userStats: UserTypeStats;
}

export const CentralStatsCircle = ({ userStats }: CentralStatsCircleProps) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, type: "spring" }}
      className="relative"
    >
      <svg width="280" height="280" viewBox="-140 -140 280 280" className="drop-shadow-2xl">
        {/* Градиенты */}
        <defs>
          <linearGradient id="outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </radialGradient>
        </defs>
        
        {/* Основной круг с neumorphic эффектом */}
        <circle
          cx="0"
          cy="0"
          r="120"
          fill="url(#outerGradient)"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          style={{
            filter: 'drop-shadow(15px 15px 30px rgba(0,0,0,0.15)) drop-shadow(-15px -15px 30px rgba(255,255,255,0.7))'
          }}
        />
        
        {/* Внутренний круг */}
        <circle
          cx="0"
          cy="0"
          r="80"
          fill="url(#centerGradient)"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.1))'
          }}
        />
        
        {/* Пульсирующее кольцо */}
        <circle
          cx="0"
          cy="0"
          r="100"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="2"
          opacity="0.4"
          className="animate-ping"
        />
        
        {/* Центральный текст */}
        <text
          x="0"
          y="-15"
          textAnchor="middle"
          className="fill-muted-foreground text-sm font-medium"
        >
          АКТИВНЫХ
        </text>
        <text
          x="0"
          y="5"
          textAnchor="middle"
          className="fill-muted-foreground text-sm font-medium"
        >
          ПОЛЬЗОВАТЕЛЕЙ
        </text>
        <text
          x="0"
          y="35"
          textAnchor="middle"
          className="fill-foreground text-4xl font-bold"
        >
          {userStats.total}
        </text>
      </svg>
    </motion.div>
  );
};