import { NavLink } from "react-router-dom";
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
  ScrollText,
  FlaskConical,
  CreditCard,
  Plug,
} from "lucide-react";

export type AdminNavItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
      { name: "Обзор", path: "/admin", icon: Activity, color: "#0891B2", end: true, description: "Главная операционная сводка" },
      { name: "Пользователи", path: "/admin/users", icon: Users, color: "#3B82F6", description: "Люди, роли и статусы" },
      { name: "Заказы", path: "/admin/jobs", icon: Briefcase, color: "#8B5CF6", description: "Текущая работа платформы" },
      { name: "Тендеры", path: "/admin/tenders", icon: Gavel, color: "#F59E0B", description: "Конкурентные заявки и подбор" },
      { name: "Споры", path: "/admin/disputes", icon: AlertTriangle, color: "#EF4444", description: "Конфликты и разбор кейсов" },
    ],
  },
  {
    title: "Доверие и контроль",
    items: [
      { name: "Заявки Pro", path: "/admin/pro-requests", icon: UserCheck, color: "#10B981", description: "Апгрейды и ручные проверки" },
      { name: "KYC", path: "/admin/kyc", icon: Camera, color: "#8B5CF6", description: "Проверка личности и документов" },
      { name: "Риски", path: "/admin/risk", icon: Shield, color: "#F97316", description: "Фрод, нарушения и флаги" },
      { name: "Финансы", path: "/admin/finance", icon: DollarSign, color: "#059669", description: "Оплаты, выплаты и движение денег" },
      { name: "Процессинг", path: "/admin/payments", icon: CreditCard, color: "#0EA5E9", description: "Платёжный провайдер, Apple/Google Pay" },
      { name: "API-сервисы", path: "/admin/integrations", icon: Plug, color: "#14B8A6", description: "Google Maps и другие внешние ключи" },
    ],
  },
  {
    title: "Система",
    items: [
      { name: "Контент", path: "/admin/content", icon: FileText, color: "#06B6D4", description: "Тексты и материалы платформы" },
      { name: "Категории", path: "/admin/categories", icon: Tag, color: "#EC4899", description: "Структура услуг и каталог" },
      { name: "Валюты", path: "/admin/currencies", icon: Globe, color: "#6366F1", description: "Валюты и расчётные правила" },
      { name: "Настройки", path: "/admin/settings", icon: Settings, color: "#64748B", description: "Общие параметры панели" },
    ],
  },
  {
    title: "Служебные",
    items: [
      { name: "Логи", path: "/admin/logs", icon: ScrollText, color: "#94A3B8", description: "Журнал событий и ошибок" },
      { name: "Тестирование", path: "/admin/testing", icon: FlaskConical, color: "#94A3B8", description: "Внутренние проверки" },
    ],
  },
];

export const adminNavigationItems = adminNavigationSections.flatMap(section => section.items);

type NeumorphicSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

/**
 * Compact, dense admin navigation following admin-panel best practices:
 * 40px rows, grouped sections, tooltips instead of inline descriptions,
 * neumorphic active state (inset) with a color accent bar.
 */
export function NeumorphicSidebar({ mobile = false, onNavigate }: NeumorphicSidebarProps) {
  return (
    <aside
      className={
        mobile
          ? "w-full h-full bg-neo p-4 overflow-y-auto"
          : "hidden lg:flex flex-col fixed left-0 top-0 h-screen w-72 bg-neo p-4 overflow-y-auto z-30"
      }
    >
      {/* Brand */}
      <NavLink to="/" className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-neo neo-inset-2">
        <div className="neo-icon-well w-9 h-9 shrink-0">
          <Home className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            ServiceHub
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.18em]">Админ-панель</div>
        </div>
      </NavLink>

      <nav className="flex-1 space-y-5">
        {adminNavigationSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              {section.title}
            </div>

            <div className="space-y-1">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={onNavigate}
                    title={item.description}
                    className={({ isActive }) => `
                      group relative flex items-center gap-3 px-3 h-10 rounded-xl text-sm transition-all duration-200
                      ${isActive
                        ? "bg-neo neo-inset-2 font-semibold text-gray-900"
                        : "text-gray-600 hover:bg-neo hover:neo-2 hover:text-gray-900"}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-200"
                          style={{
                            backgroundColor: item.color,
                            height: isActive ? "60%" : "0%",
                            opacity: isActive ? 1 : 0,
                          }}
                        />
                        <IconComponent
                          className="w-[18px] h-[18px] shrink-0 transition-colors duration-200"
                          style={{ color: isActive ? item.color : undefined }}
                        />
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 px-3 py-2.5 rounded-xl bg-neo neo-inset-2">
        <p className="text-[11px] leading-snug text-gray-500">
          Разделы сгруппированы по частоте использования: операции — сверху, служебные — внизу.
        </p>
      </div>
    </aside>
  );
}
