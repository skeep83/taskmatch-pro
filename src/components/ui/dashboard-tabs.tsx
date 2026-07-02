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
        <div className="flex space-x-2 p-3 bg-neo neo-inset-8 rounded-2xl min-w-max">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-300 font-medium ${
                activeTab === tab.id
                  ? 'bg-neo neo-inset-4 text-primary'
                  : 'bg-neo neo-8 text-gray-600 hover:neo-4'
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
    <div className={cn("p-2 rounded-2xl bg-neo neo-inset-8", className)}>
      <div className={`grid w-full grid-cols-${tabs.length} bg-transparent gap-1`}>
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 bg-neo neo-8 data-[active=true]:neo-inset-4 rounded-xl transition-all duration-300 text-black data-[active=true]:text-primary h-12 hover:neo-4 justify-center px-3`}
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