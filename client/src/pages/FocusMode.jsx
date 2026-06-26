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
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    violet: 'border-violet-100 bg-violet-50 text-violet-600',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    amber: 'border-amber-100 bg-amber-50 text-amber-600',
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${colors[color] || colors.violet}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function CircularProgress({ progress, timeLeft, isRunning, isPaused }) {
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = isPaused
    ? '#f59e0b' // amber
    : isRunning
    ? '#7c3aed' // violet
    : '#e2e8f0'; // slate

  return (
    <div className="relative flex items-center justify-center">
      <svg width={260} height={260} className="-rotate-90">
        {/* Track */}
        <circle cx={130} cy={130} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={12} />
        {/* Progress */}
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
      {/* Timer text */}
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold tracking-tight text-slate-800">
          {formatTime(timeLeft)}
        </span>
        <span className="mt-1 text-sm font-medium text-slate-400">
          {isPaused ? 'Paused' : isRunning ? 'Focusing' : 'Ready'}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
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
    if (isRunning && !isPaused) return; // Don't allow switching mid-session
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
      {/* ---------------------------------------------------------------- */}
      {/* Left + Center (spans 2 cols on large screens) */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-6 lg:col-span-2">

        {/* Session complete banner */}
        {isSessionComplete && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Session complete! Great work. Start another or take a break.
          </div>
        )}

        {/* Timer card */}
        <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-6">

            <h1 className="self-start text-2xl font-bold text-slate-800">Focus Mode</h1>

            {/* Duration presets */}
            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  onClick={() => handlePreset(p.minutes)}
                  disabled={isRunning && !isPaused}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    currentPresetMinutes === p.minutes && !showCustom
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'
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
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom input */}
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
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  />
                  <button
                    onClick={handleCustomApply}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Set
                  </button>
                </div>
                {customError && <p className="text-xs text-red-500">{customError}</p>}
              </div>
            )}

            {/* Circular progress timer */}
            <CircularProgress
              progress={progress}
              timeLeft={timeLeft}
              isRunning={isRunning}
              isPaused={isPaused}
            />

            {/* Linear progress bar */}
            <div className="w-full max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isPaused ? 'bg-amber-400' : 'bg-violet-500'
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-slate-400">
                {Math.round(progress * 100)}% complete
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartPause}
                className={`flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-bold text-white shadow-sm transition-all hover:scale-105 ${
                  isPaused
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : isRunning
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-violet-600 hover:bg-violet-700'
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
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>

          </div>
        </section>

        {/* Statistics */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Session Statistics</h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={CheckCircle2} label="Sessions Done" value={sessionCount} color="violet" />
            <StatCard icon={Flame} label="Total Minutes" value={totalFocusMinutes} color="emerald" />
            <StatCard icon={TrendingUp} label="Avg Session (min)" value={averageSessionMinutes} color="amber" />
          </div>
        </section>

      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Right panel */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-6">

        {/* Current session info */}
        <section className="rounded-3xl border border-violet-100 bg-violet-50/60 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
            <Timer className="h-5 w-5 text-violet-600" />
            Current Session
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Duration set</span>
              <span className="font-semibold text-slate-700">{Math.round(totalDuration / 60)} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Time remaining</span>
              <span className="font-semibold text-slate-700">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isRunning && !isPaused
                    ? 'bg-violet-100 text-violet-700'
                    : isPaused
                    ? 'bg-amber-100 text-amber-700'
                    : isSessionComplete
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
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
              <span className="text-slate-500">Session #</span>
              <span className="font-semibold text-slate-700">{sessionCount + 1}</span>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Quick Actions</h2>
          <p className="mb-4 text-xs text-slate-400">
            Timer keeps running while you visit other pages.
          </p>
          <div className="space-y-2">
            {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
              >
                <Icon className="h-4 w-4 shrink-0 text-violet-500" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Future AI coach placeholder — not implemented, clearly marked */}
        <section className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/30 p-6">
          <h2 className="mb-2 text-sm font-semibold text-violet-600">AI Study Coach</h2>
          <p className="text-xs text-slate-400">
            Coming soon — AI coaching, productivity insights, and
            roadmap-aware session suggestions will appear here.
          </p>
        </section>

      </div>
    </div>
  );
}
