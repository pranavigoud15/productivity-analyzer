import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  LayoutDashboard,
  ListChecks,
  Map,
  Target,
  Plane,
  BarChart3,
  History,
  StickyNote,
  Star,
  ClipboardList,
  AlertTriangle,
  BookOpen,
  Timer,
} from 'lucide-react';

// path: null = feature not built yet, renders disabled (same "coming
// soon" status these items already had — just honestly inert now
// instead of silently doing nothing).
const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Tasks', icon: ListChecks, path: '/tasks' },
  { label: 'My Goals', icon: Target, path: '/goals' },
  { label: 'Roadmaps', icon: Map, path: '/roadmaps' },
  { label: 'Journal', icon: BookOpen, path: '/journals' },
  { label: 'Notes', icon: StickyNote, path: '/notes' },
  { label: 'Focus Mode', icon: Timer, path: '/focus' },
  { label: 'Travel', icon: Plane, path: null },
  { label: 'Insights', icon: BarChart3, path: null },
  { label: 'History', icon: History, path: null },
  { label: 'Key Points', icon: Star, path: null },
  { label: 'Mock Tests', icon: ClipboardList, path: '/mock-tests' },,
  { label: 'Mistakes', icon: AlertTriangle, path: null },
];

function NavItem({ icon: Icon, label, path }) {
  if (!path) {
    return (
      <span
        aria-disabled="true"
        title="Coming soon"
        className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300"
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="hidden md:inline">{label}</span>
      </span>
    );
  }

  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="flex w-16 flex-col border-r border-slate-100 bg-white px-2 py-6 md:w-64 md:px-4">
      <div className="mb-8 flex items-center gap-2 px-1 md:px-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="hidden truncate text-base font-bold tracking-tight text-slate-800 md:inline">
          Productivity Analyzer
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </nav>
    </aside>
  );
}
