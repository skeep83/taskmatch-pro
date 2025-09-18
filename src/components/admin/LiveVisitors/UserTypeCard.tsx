import { motion } from 'framer-motion';
import type { UserTypeInfo } from '@/types/liveVisitors';

interface UserTypeCardProps {
  userType: UserTypeInfo;
  index: number;
}

export const UserTypeCard = ({ userType, index }: UserTypeCardProps) => {
  const Icon = userType.icon;
  const positions = [
    { top: '10%', right: '10%' }, // Top-right
    { bottom: '15%', right: '5%' }, // Bottom-right  
    { bottom: '15%', left: '5%' }, // Bottom-left
    { top: '10%', left: '10%' }, // Top-left
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      className="absolute flex flex-col items-center gap-2 p-3 rounded-xl card-surface min-w-[120px]"
      style={positions[index]}
    >
      <div 
        className="p-2 rounded-lg shadow-sm"
        style={{ backgroundColor: `${userType.color.split(' ')[1].replace('from-', '').replace('to-', '')}20` }}
      >
        <Icon 
          className="h-4 w-4" 
          style={{ color: userType.color.split(' ')[1].replace('from-', '').replace('to-', '') }}
        />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-foreground">
          {userType.label}
        </div>
        <div className="text-xs text-muted-foreground">
          {userType.count} активных
        </div>
      </div>
    </motion.div>
  );
};