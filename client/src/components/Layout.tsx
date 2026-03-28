import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTheme } from '../hooks/useTheme.tsx';
import {
  LayoutDashboard,
  Briefcase,
  Kanban,
  Building2,
  Users,
  BarChart3,
  UserCircle,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/applications', icon: Briefcase,       label: 'Applications' },
  { to: '/board',        icon: Kanban,          label: 'Board' },
  { to: '/companies',    icon: Building2,       label: 'Companies' },
  { to: '/contacts',     icon: Users,           label: 'Contacts' },
  { to: '/analytics',    icon: BarChart3,       label: 'Analytics' },
  { to: '/profile',      icon: UserCircle,      label: 'Profile' },
];

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;
const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System' } as const;

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const ThemeIcon = THEME_ICON[theme];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 dark:border-gray-800">
          <Briefcase className="h-6 w-6 text-brand-600" />
          <span className="text-lg font-semibold">Job Tracker</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggle}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                title={`Theme: ${THEME_LABEL[theme]} (click to cycle)`}
              >
                <ThemeIcon className="h-4 w-4" />
              </button>
              <button
                onClick={logout}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
