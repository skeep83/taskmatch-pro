import { motion } from 'framer-motion';
import type { UserTypeInfo } from '@/types/liveVisitors';

interface UserTypeCardProps {
  userType: UserTypeInfo;
  index: number;
}

export const UserTypeCard = ({ userType, index }: UserTypeCardProps) => {
  const Icon = userType.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      className="group flex items-center gap-4 p-4 rounded-2xl card-surface hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      {/* Круглая иконка */}
      <div 
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300"
        style={{ 
          backgroundColor: `${userType.color.split(' ')[1].replace('from-', '').replace('to-', '')}15`,
          border: `2px solid ${userType.color.split(' ')[1].replace('from-', '').replace('to-', '')}30`
        }}
      >
        <Icon 
          className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" 
          style={{ color: userType.color.split(' ')[1].replace('from-', '').replace('to-', '') }}
        />
      </div>
      
      {/* Информация */}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">
            {userType.label}
          </h4>
          <div className="flex items-center gap-2">
            <div 
              className="px-3 py-1 rounded-full text-lg font-semibold"
              style={{ 
                backgroundColor: `${userType.color.split(' ')[1].replace('from-', '').replace('to-', '')}15`,
                color: userType.color.split(' ')[1].replace('from-', '').replace('to-', '')
              }}
            >
              {userType.count}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Активных пользователей
        </p>
      </div>
    </motion.div>
  );
};