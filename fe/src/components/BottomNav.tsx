import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, PieChart, Flame, Settings, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.home' },
  { to: '/transactions', icon: List, labelKey: 'nav.transactions' },
  { to: '/chat', icon: MessageCircle, labelKey: 'nav.chat' },
  { to: '/analytics', icon: PieChart, labelKey: 'nav.analytics' },
  { to: '/roast', icon: Flame, labelKey: 'nav.roast' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-primary scale-110'
                  : 'text-dark-muted hover:text-dark-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-lg ${isActive ? 'bg-primary/20' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className="text-[10px] font-medium">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
