import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  LayoutDashboard,
  ListChecks,
  Map,
  Target,
  BarChart3,
  StickyNote,
  ClipboardList,
  BookOpen,
  Timer,
  Trophy,
  Bot,
  Shield,
  X,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Tasks', icon: ListChecks, path: '/tasks' },
      { label: 'Goals', icon: Target, path: '/goals' },
      { label: 'Roadmaps', icon: Map, path: '/roadmaps' },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { label: 'Focus Mode', icon: Timer, path: '/focus' },
      { label: 'Journal', icon: BookOpen, path: '/journals' },
      { label: 'Notes', icon: StickyNote, path: '/notes' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { label: 'Insights', icon: BarChart3, path: '/insights' },
      { label: 'Mock Tests', icon: ClipboardList, path: '/mock-tests' },
      { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    ],
  },
  {
    label: 'AI',
    items: [{ label: 'Assistant', icon: Bot, path: '/assistant' }],
  },
];

function NavItem({ icon: Icon, label, path, onNavigate }) {
  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'nav-active'
            : 'text-secondary hover:bg-hover hover:text-primary'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen = false, onMobileClose }) {
  const isAdmin = JSON.parse(localStorage.getItem('user') || '{}').role === 'admin';

  const handleNavigate = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-subtle bg-sidebar px-4 py-5 transition-transform lg:static lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-violet text-white shadow-pa-sm">
            <Sparkles className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-primary">Productivity</p>
            <p className="truncate text-xs text-muted">Analyzer</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onMobileClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem key={item.path} {...item} onNavigate={handleNavigate} />
              ))}
            </div>
          </div>
        ))}
        {isAdmin && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Admin
            </p>
            <NavItem label="Admin" icon={Shield} path="/admin" onNavigate={handleNavigate} />
          </div>
        )}
      </nav>
    </aside>
  );
}
