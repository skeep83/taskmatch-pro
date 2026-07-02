import { Eye, User, Briefcase, Building, UserX } from 'lucide-react';
import { useLiveVisitors } from '@/hooks/useLiveVisitors';

/**
 * Live visitors block: total counter + breakdown by user type.
 * Clean responsive grid (no absolutely-positioned decorations that
 * drift with the layout), colors defined explicitly.
 */
export const LiveVisitorsContainer = () => {
  const { userStats } = useLiveVisitors();

  const total =
    (userStats.client || 0) +
    (userStats.pro || 0) +
    (userStats.business || 0) +
    (userStats.unregistered || 0);

  const types = [
    { key: 'client', count: userStats.client || 0, label: 'Клиенты', icon: User, color: '#3B82F6' },
    { key: 'pro', count: userStats.pro || 0, label: 'Специалисты', icon: Briefcase, color: '#10B981' },
    { key: 'business', count: userStats.business || 0, label: 'Бизнес', icon: Building, color: '#8B5CF6' },
    { key: 'unregistered', count: userStats.unregistered || 0, label: 'Гости', icon: UserX, color: '#F59E0B' },
  ];

  return (
    <div className="neo-card p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="neo-icon-well w-10 h-10">
          <Eye className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Live посетители</h3>
          <p className="text-sm text-muted-foreground truncate">Активные пользователи по типам</p>
        </div>
        <span className="ml-auto flex items-center gap-2 neo-chip px-3 py-1.5 text-xs font-medium shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          online
        </span>
      </div>

      {/* Total */}
      <div className="bg-neo neo-inset-2 rounded-2xl p-5 text-center mb-4">
        <div className="text-4xl font-bold text-foreground tabular-nums">{total}</div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">всего на платформе</div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {types.map((tItem) => {
          const Icon = tItem.icon;
          const share = total > 0 ? Math.round((tItem.count / total) * 100) : 0;
          return (
            <div key={tItem.key} className="bg-neo neo-2 rounded-xl p-3.5 min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tItem.color}1a` }}
                >
                  <Icon className="h-4 w-4" style={{ color: tItem.color }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground truncate">{tItem.label}</span>
                <span className="ml-auto text-lg font-bold tabular-nums">{tItem.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-neo neo-inset-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${share}%`, backgroundColor: tItem.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
