import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/themeStore';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-default bg-surface-secondary px-2.5 py-2 text-secondary transition hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-accent-violet-glow)]"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && (
        <span className="hidden text-xs font-medium sm:inline">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
