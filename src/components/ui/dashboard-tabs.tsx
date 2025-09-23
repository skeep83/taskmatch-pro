import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface DashboardTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export function DashboardTabs({ 
  tabs, 
  activeTab, 
  onTabChange, 
  variant = 'desktop',
  className 
}: DashboardTabsProps) {
  if (variant === 'mobile') {
    return (
      <div className={cn("overflow-x-auto mb-6", className)}>
        <div className="flex space-x-2 p-3 bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB] rounded-2xl min-w-max">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-300 font-medium ${
                activeTab === tab.id
                  ? 'bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-primary'
                  : 'bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] text-gray-600 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]'
              }`}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
            >
              <tab.icon className="h-4 w-4" />
              <span className="text-sm">{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-2 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]", className)}>
      <div className={`grid w-full grid-cols-${tabs.length} bg-transparent gap-1`}>
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[active=true]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[active=true]:text-primary h-12 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] justify-center px-3`}
            data-active={activeTab === tab.id}
            whileTap={{ scale: 0.98 }}
          >
            <tab.icon className="h-5 w-5" />
            <span className="hidden sm:inline font-medium">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}