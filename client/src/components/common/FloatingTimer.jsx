import { useNavigate, useLocation } from 'react-router-dom';
import { Timer } from 'lucide-react';
import { useFocus } from '../../context/FocusContext';

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function FloatingTimer() {
  const { isRunning, isPaused, timeLeft } = useFocus();
  const navigate = useNavigate();
  const location = useLocation();

  // Only show when: timer is active (running or paused mid-session)
  // AND the user is NOT already on the focus page.
  const isOnFocusPage = location.pathname === '/focus';
  const isActive = isRunning || (isPaused && timeLeft > 0);

  if (!isActive || isOnFocusPage) return null;

  return (
    <button
      onClick={() => navigate('/focus')}
      aria-label="Return to Focus Mode"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 ${
        isPaused
          ? 'bg-amber-500 hover:bg-amber-600'
          : 'bg-violet-600 hover:bg-violet-700'
      }`}
    >
      <Timer className="h-4 w-4" />
      <span>{formatTime(timeLeft)}</span>
      <span className="text-xs opacity-80">{isPaused ? 'Paused' : 'Focusing'}</span>
    </button>
  );
}
