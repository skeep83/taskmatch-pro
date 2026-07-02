import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Users,
  Briefcase,
  Gavel,
  Shield,
  DollarSign,
  AlertTriangle,
  FileText,
  Globe,
  Settings,
  Tag,
  UserCheck,
  Home,
  Camera,
  FolderCog,
} from "lucide-react";

export type AdminNavItem = {
  name: string;
  path: string;
  icon: any;
  color: string;
  end?: boolean;
  description?: string;
};

export type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavigationSections: AdminNavSection[] = [
  {
    title: "Операции",
    items: [
      {
        name: "Обзор",
        path: "/admin",
        icon: Activity,
        color: "#22D3EE",
        end: true,
        description: "Главная операционная сводка",
      },
      {
        name: "Пользователи",
        path: "/admin/users",
        icon: Users,
        color: "#3B82F6",
        description: "Люди, роли и статусы",
      },
      {
        name: "Заказы",
        path: "/admin/jobs",
        icon: Briefcase,
        color: "#8B5CF6",
        description: "Текущая работа платформы",
      },
      {
        name: "Тендеры",
        path: "/admin/tenders",
        icon: Gavel,
        color: "#F59E0B",
        description: "Конкурентные заявки и подбор",
      },
      {
        name: "Споры",
        path: "/admin/disputes",
        icon: AlertTriangle,
        color: "#EF4444",
        description: "Конфликты и разбор кейсов",
      },
    ],
  },
  {
    title: "Доверие и контроль",
    items: [
      {
        name: "Заявки Pro",
        path: "/admin/pro-requests",
        icon: UserCheck,
        color: "#10B981",
        description: "Апгрейды и ручные проверки",
      },
      {
        name: "KYC",
        path: "/admin/kyc",
        icon: Camera,
        color: "#8B5CF6",
        description: "Проверка личности и документов",
      },
      {
        name: "Риски",
        path: "/admin/risk",
        icon: Shield,
        color: "#F97316",
        description: "Фрод, нарушения и флаги",
      },
      {
        name: "Финансы",
        path: "/admin/finance",
        icon: DollarSign,
        color: "#059669",
        description: "Оплаты, выплаты и движение денег",
      },
    ],
  },
  {
    title: "Система",
    items: [
      {
        name: "Контент",
        path: "/admin/content",
        icon: FileText,
        color: "#06B6D4",
        description: "Тексты и материалы платформы",
      },
      {
        name: "Категории",
        path: "/admin/categories",
        icon: Tag,
        color: "#EC4899",
        description: "Структура услуг и каталог",
      },
      {
        name: "Валюты",
        path: "/admin/currencies",
        icon: Globe,
        color: "#6366F1",
        description: "Валюты и расчётные правила",
      },
      {
        name: "Настройки",
        path: "/admin/settings",
        icon: Settings,
        color: "#64748B",
        description: "Общие параметры панели",
      },
    ],
  },
];

export const adminNavigationItems = adminNavigationSections.flatMap(section => section.items);

type NeumorphicSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function NeumorphicSidebar({ mobile = false, onNavigate }: NeumorphicSidebarProps) {
  return (
    <aside
      className={
        mobile
          ? "w-full h-full bg-neo p-4 sm:p-6 overflow-y-auto"
          : "hidden lg:block fixed left-0 top-0 h-screen w-80 bg-neo p-6 overflow-y-auto z-30 border-r border-white/20"
      }
    >
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-neo neo-inset-8 mb-3">
            <Home className="w-8 h-8 text-primary" />
            <div className="text-left">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                ServiceHub
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Админ-панель</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 px-3">
            Только ключевые операционные разделы без технического шума
          </p>
        </motion.div>
      </div>

      <nav className="space-y-6">
        {adminNavigationSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: sectionIndex * 0.06 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-white/60" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                {section.title}
              </span>
              <div className="h-px flex-1 bg-white/60" />
            </div>

            <div className="space-y-3">
              {section.items.map((item, itemIndex) => {
                const IconComponent = item.icon;
                const animationDelay = sectionIndex * 0.1 + itemIndex * 0.04;

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: animationDelay }}
                  >
                    <NavLink
                      to={item.path}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) => `
                        group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300
                        ${
                          isActive
                            ? "bg-neo neo-inset-8"
                            : "bg-neo neo-8 hover:neo-4"
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={`
                              relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
                              ${
                                isActive
                                  ? "bg-neo neo-inset-4"
                                  : "bg-neo neo-4"
                              }
                            `}
                          >
                            <IconComponent
                              className="w-6 h-6 transition-all duration-300"
                              style={{ color: isActive ? item.color : "#6B7280" }}
                            />

                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                                style={{ backgroundColor: "#22D3EE" }}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-medium transition-all duration-300 ${
                                isActive ? "text-gray-800" : "text-gray-700 group-hover:text-gray-800"
                              }`}
                            >
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="mt-1 text-xs text-gray-500 leading-snug">
                                {item.description}
                              </div>
                            )}
                          </div>

                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1 h-10 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 p-4 rounded-2xl bg-neo neo-inset-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-neo neo-4 flex items-center justify-center">
            <FolderCog className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-800">Технические страницы</h4>
            <p className="text-xs text-gray-500">Логи и тестирование убраны из главного меню</p>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Доступ к редким служебным разделам лучше оставлять по прямому маршруту или отдельной роли.
        </p>
      </motion.div>
    </aside>
  );
}
