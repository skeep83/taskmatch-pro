import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Activity, Users, Briefcase, Gavel, Shield, DollarSign, 
  AlertTriangle, FileText, Globe, Settings, TestTube,
  Tag, UserCheck, Home
} from "lucide-react";

const navigationItems = [
  { 
    name: "Dashboard", 
    path: "/admin", 
    icon: Activity, 
    color: "#22D3EE", // cyan-400
    end: true 
  },
  { 
    name: "Пользователи", 
    path: "/admin/users", 
    icon: Users, 
    color: "#3B82F6" // blue-500
  },
  { 
    name: "Заказы", 
    path: "/admin/jobs", 
    icon: Briefcase, 
    color: "#8B5CF6" // violet-500
  },
  { 
    name: "Тендеры", 
    path: "/admin/tenders", 
    icon: Gavel, 
    color: "#F59E0B" // amber-500
  },
  { 
    name: "Споры", 
    path: "/admin/disputes", 
    icon: AlertTriangle, 
    color: "#EF4444" // red-500
  },
  { 
    name: "Заявки Pro", 
    path: "/admin/pro-requests", 
    icon: UserCheck, 
    color: "#10B981" // emerald-500
  },
  { 
    name: "Финансы", 
    path: "/admin/finance", 
    icon: DollarSign, 
    color: "#059669" // emerald-600
  },
  { 
    name: "Риски", 
    path: "/admin/risk", 
    icon: Shield, 
    color: "#F97316" // orange-500
  },
  { 
    name: "Контент", 
    path: "/admin/content", 
    icon: FileText, 
    color: "#06B6D4" // cyan-500
  },
  { 
    name: "Валюты", 
    path: "/admin/currencies", 
    icon: Globe, 
    color: "#6366F1" // indigo-500
  },
  { 
    name: "Категории", 
    path: "/admin/categories", 
    icon: Tag, 
    color: "#EC4899" // pink-500
  },
  { 
    name: "Настройки", 
    path: "/admin/settings", 
    icon: Settings, 
    color: "#64748B" // slate-500
  },
  { 
    name: "Тестирование", 
    path: "/admin/testing", 
    icon: TestTube, 
    color: "#14B8A6" // teal-500
  }
];

export function NeumorphicSidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-80 bg-[#E5E7EB] p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB] mb-4">
            <Home className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                ServiceHub
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="space-y-4">
        {navigationItems.map((item, index) => {
          const IconComponent = item.icon;
          
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) => `
                  group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300
                  ${isActive 
                    ? 'bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]' 
                    : 'bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {/* Icon Circle */}
                    <div 
                      className={`
                        relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                        ${isActive 
                          ? 'bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]' 
                          : 'bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]'
                        }
                      `}
                    >
                      <IconComponent 
                        className="w-6 h-6 transition-all duration-300" 
                        style={{ 
                          color: isActive ? item.color : '#6B7280' 
                        }}
                      />
                      
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                      <span 
                        className={`
                          font-medium transition-all duration-300
                          ${isActive 
                            ? 'text-gray-800' 
                            : 'text-gray-600 group-hover:text-gray-700'
                          }
                        `}
                      >
                        {item.name}
                      </span>
                    </div>

                    {/* Active highlight */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-1 h-8 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom Section - Security Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 p-4 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
            <Shield className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-800">Безопасность</h4>
            <p className="text-xs text-gray-500">Защищенная панель</p>
          </div>
        </div>
        <p className="text-xs text-green-600">
          Все операции логируются
        </p>
      </motion.div>
    </aside>
  );
}