import { useState, useRef, useEffect } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { clearAuthAndRedirect } from '../utils/auth';

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-hover"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-violet-soft accent-violet">
          <UserRound className="h-4 w-4" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-primary">
            {user.name || 'Account'}
          </span>
          <span className="block max-w-36 truncate text-xs text-muted">{user.email}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-default bg-elevated p-1 shadow-pa-md">
          <button
            type="button"
            onClick={clearAuthAndRedirect}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--pa-accent-danger)] hover:bg-hover"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
