import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AccountMenu from '../AccountMenu';
import ThemeToggle from '../ui/ThemeToggle';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/goals': 'Goals',
  '/roadmaps': 'Roadmaps',
  '/tasks': 'Tasks',
  '/focus': 'Focus Mode',
  '/journals': 'Journal',
  '/notes': 'Notes',
  '/mock-tests': 'Mock Tests',
  '/leaderboard': 'Leaderboard',
  '/insights': 'Insights',
  '/assistant': 'AI Assistant',
  '/admin': 'Admin',
};

export default function TopBar({ onMenuClick }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Productivity Analyzer';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-subtle bg-app/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-surface-secondary text-secondary lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-primary">{title}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle compact />
        <AccountMenu />
      </div>
    </header>
  );
}
