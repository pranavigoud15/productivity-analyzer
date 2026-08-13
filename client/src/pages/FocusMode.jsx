import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Timer,
  BookOpen,
  Star,
  ClipboardList,
  Flame,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';
import StatCard from '../components/common/StatCard';
import PageHeader from '../components/ui/PageHeader';

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

const PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

function CircularProgress({ progress, timeLeft, isRunning, isPaused }) {
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = isPaused
    ? 'var(--pa-accent-warning)'
    : isRunning
    ? 'var(--pa-accent-violet)'
    : 'var(--pa-border)';

  return (
    <div className="relative flex items-center justify-center">
      <svg width={260} height={260} className="-rotate-90">
        <circle cx={130} cy={130} r={radius} fill="none" stroke="var(--pa-border)" strokeWidth={12} />
        <circle
          cx={130}
          cy={130}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold tracking-tight text-primary">
          {formatTime(timeLeft)}
        </span>
        <span className="mt-1 text-sm font-medium text-muted">
          {isPaused ? 'Paused' : isRunning ? 'Focusing' : 'Ready'}
        </span>
      </div>
    </div>
  );
}

export default function FocusMode() {
  const {
    isRunning,
    isPaused,
    timeLeft,
    totalDuration,
    progress,
    sessionCount,
    totalFocusMinutes,
    averageSessionMinutes,
    selectDuration,
    start,
    pause,
    resume,
    reset,
  } = useFocus();

  const navigate = useNavigate();
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customError, setCustomError] = useState('');

  const currentPresetMinutes = Math.round(totalDuration / 60);

  const handlePreset = (minutes) => {
    if (isRunning && !isPaused) return;
    selectDuration(minutes);
    setShowCustom(false);
    setCustomError('');
  };

  const handleCustomApply = () => {
    const val = parseInt(customInput, 10);
    if (isNaN(val) || val < 1 || val > 180) {
      setCustomError('Enter a duration between 1 and 180 minutes.');
      return;
    }
    selectDuration(val);
    setShowCustom(false);
    setCustomError('');
    setCustomInput('');
  };

  const handleStartPause = () => {
    if (!isRunning && !isPaused) {
      start();
    } else if (isRunning && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    }
  };

  const QUICK_ACTIONS = [
    { label: 'Notes', icon: BookOpen, path: '/notes' },
    { label: 'Key Points', icon: Star, path: '/key-points' },
    { label: 'Mock Test', icon: ClipboardList, path: '/mock-tests' },
  ];

  const isSessionComplete = !isRunning && !isPaused && timeLeft === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {isSessionComplete && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--pa-accent-success)]/30 bg-[var(--pa-accent-success-soft)] p-4 text-sm font-medium text-[var(--pa-accent-success)]">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Session complete! Great work. Start another or take a break.
          </div>
        )}

        <section className="pa-card p-8">
          <div className="flex flex-col items-center gap-6">
            <PageHeader title="Focus Mode" />

            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  onClick={() => handlePreset(p.minutes)}
                  disabled={isRunning && !isPaused}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    currentPresetMinutes === p.minutes && !showCustom
                      ? 'bg-accent-violet text-white'
                      : 'bg-surface-secondary text-secondary hover:bg-accent-violet-soft hover:accent-violet'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustom((v) => !v)}
                disabled={isRunning && !isPaused}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  showCustom
                    ? 'bg-accent-violet text-white'
                    : 'bg-surface-secondary text-secondary hover:bg-accent-violet-soft hover:accent-violet'
                }`}
              >
                Custom
              </button>
            </div>

            {showCustom && (
              <div className="flex w-full max-w-xs flex-col items-center gap-2">
                <div className="flex w-full items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    placeholder="Minutes (1–180)"
                    value={customInput}
                    onChange={(e) => {
                      setCustomInput(e.target.value);
                      setCustomError('');
                    }}
                    className="pa-input flex-1 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleCustomApply}
                    className="pa-btn-primary px-4 py-2 text-sm font-semibold"
                  >
                    Set
                  </button>
                </div>
                {customError && <p className="text-xs text-[var(--pa-accent-danger)]">{customError}</p>}
              </div>
            )}

            <CircularProgress
              progress={progress}
              timeLeft={timeLeft}
              isRunning={isRunning}
              isPaused={isPaused}
            />

            <div className="w-full max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isPaused ? 'bg-[var(--pa-accent-warning)]' : 'bg-accent-violet'
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-muted">
                {Math.round(progress * 100)}% complete
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleStartPause}
                className={`flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-bold text-white shadow-pa-sm transition-all hover:scale-105 ${
                  isPaused || isRunning
                    ? 'bg-[var(--pa-accent-warning)] hover:opacity-90'
                    : 'bg-accent-violet hover:opacity-90'
                }`}
              >
                {isRunning && !isPaused ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start
                  </>
                )}
              </button>

              <button
                onClick={reset}
                className="pa-btn-secondary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-primary">Session Statistics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={CheckCircle2} label="Sessions Done" value={sessionCount} color="violet" />
            <StatCard icon={Flame} label="Total Minutes" value={totalFocusMinutes} color="emerald" />
            <StatCard icon={TrendingUp} label="Avg Session (min)" value={averageSessionMinutes} color="amber" />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-default bg-accent-violet-soft p-6 shadow-pa-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
            <Timer className="h-5 w-5 accent-violet" />
            Current Session
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-secondary">Duration set</span>
              <span className="font-semibold text-primary">{Math.round(totalDuration / 60)} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Time remaining</span>
              <span className="font-semibold text-primary">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Status</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isRunning && !isPaused
                    ? 'bg-accent-violet-soft accent-violet'
                    : isPaused
                    ? 'bg-[var(--pa-accent-warning)]/10 text-[var(--pa-accent-warning)]'
                    : isSessionComplete
                    ? 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]'
                    : 'bg-surface-secondary text-secondary'
                }`}
              >
                {isRunning && !isPaused
                  ? 'Focusing'
                  : isPaused
                  ? 'Paused'
                  : isSessionComplete
                  ? 'Complete'
                  : 'Ready'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Session #</span>
              <span className="font-semibold text-primary">{sessionCount + 1}</span>
            </div>
          </div>
        </section>

        <section className="pa-card p-6">
          <h2 className="mb-4 text-lg font-bold text-primary">Quick Actions</h2>
          <p className="mb-4 text-xs text-muted">
            Timer keeps running while you visit other pages.
          </p>
          <div className="space-y-2">
            {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex w-full items-center gap-3 rounded-xl border border-subtle bg-surface-secondary px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-default hover:bg-accent-violet-soft hover:accent-violet"
              >
                <Icon className="h-4 w-4 shrink-0 accent-violet" />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-default bg-accent-violet-soft/50 p-6">
          <h2 className="mb-2 text-sm font-semibold accent-violet">AI Study Coach</h2>
          <p className="text-xs text-muted">
            Coming soon — AI coaching, productivity insights, and
            roadmap-aware session suggestions will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
