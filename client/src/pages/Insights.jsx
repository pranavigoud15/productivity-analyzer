import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Target, BookOpen, StickyNote,
  ClipboardList, Flame, Star, AlertTriangle, Lightbulb,
  Trophy, BarChart3, TrendingUp, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import ContextAI from '../components/assistant/ContextAI';

// ── Design tokens (match project palette) ────────────────────────────────────
const C = {
  violet:  '#7c3aed',
  sky:     '#0ea5e9',
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  slate:   '#94a3b8',
  indigo:  '#6366f1',
};

const DIFF_COLOR = { Easy: C.emerald, Medium: C.amber, Hard: C.rose };

const MOOD_LABEL = {
  great:   { emoji: '😄', label: 'Great',   color: 'text-emerald-600 bg-emerald-50' },
  good:    { emoji: '🙂', label: 'Good',    color: 'text-sky-600 bg-sky-50' },
  okay:    { emoji: '😐', label: 'Okay',    color: 'text-amber-600 bg-amber-50' },
  low:     { emoji: '😔', label: 'Low',     color: 'text-rose-400 bg-rose-50' },
  stressed:{ emoji: '😤', label: 'Stressed',color: 'text-rose-600 bg-rose-50' },
};

const PRIORITY_CFG = {
  high:     { bg: 'bg-rose-50',    border: 'border-rose-100',    text: 'text-rose-700',    badge: 'High' },
  medium:   { bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   badge: 'Medium' },
  low:      { bg: 'bg-sky-50',     border: 'border-sky-100',     text: 'text-sky-700',     badge: 'Low' },
  positive: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', badge: '🎉 Great' },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

function SkCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <Sk className="h-9 w-9 rounded-xl" />
      <Sk className="h-7 w-20" />
      <Sk className="h-3 w-28" />
    </div>
  );
}

function SkChart({ h = 'h-52' }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${h}`}>
      <Sk className="h-4 w-32 mb-4" />
      <div className="flex items-end gap-2 h-28">
        {[60, 85, 45, 95, 70, 55, 80].map((v, i) => (
          <div key={i} className="flex-1 bg-slate-100 rounded-t-lg animate-pulse" style={{ height: `${v}%` }} />
        ))}
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'violet' }) {
  const map = {
    violet:  { bg: 'bg-violet-50',  ic: 'text-violet-600',  val: 'text-violet-700' },
    sky:     { bg: 'bg-sky-50',     ic: 'text-sky-600',     val: 'text-sky-700' },
    emerald: { bg: 'bg-emerald-50', ic: 'text-emerald-600', val: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   ic: 'text-amber-600',   val: 'text-amber-700' },
    rose:    { bg: 'bg-rose-50',    ic: 'text-rose-600',    val: 'text-rose-700' },
    indigo:  { bg: 'bg-indigo-50',  ic: 'text-indigo-600',  val: 'text-indigo-700' },
  };
  const c = map[color] || map.violet;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}>
        <Icon className={`h-5 w-5 ${c.ic}`} />
      </div>
      <p className={`mt-3 text-2xl font-bold ${c.val}`}>{value}</p>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, iconColor = 'text-violet-600', children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Empty({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10">
      <Icon className="h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-500">{message}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function ChipRow({ items }) {
  // items: [{ label, count, color }]
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ label, count, color }) => (
        <span key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
          {label}{count !== undefined ? ` · ${count}` : ''}
        </span>
      ))}
    </div>
  );
}

// Custom recharts tooltip
function CT({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-md text-xs space-y-0.5">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-semibold">{p.value}{unit || (p.unit ?? '')}</span>
        </p>
      ))}
    </div>
  );
}

// Score ring SVG
function ScoreRing({ score }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? C.emerald : score >= 40 ? C.amber : C.rose;
  const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Good' : 'Needs Work';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.9s ease' }}
        />
        <text x="65" y="61" textAnchor="middle" fontSize="24" fontWeight="700" fill="#1e293b">{score}</text>
        <text x="65" y="77" textAnchor="middle" fontSize="10" fill="#94a3b8">/ 100</text>
      </svg>
      <p className="text-sm font-semibold text-slate-600">Productivity Score</p>
      <span
        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ background: `${color}20`, color }}
      >{label}</span>
    </div>
  );
}

// Progress bar row
function ProgressRow({ label, value, max = 100, color = C.violet }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{value}{typeof max === 'number' && max !== 100 ? ` / ${max}` : '%'}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Insights() {
  const [data, setData]         = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/insights', { headers: getAuthHeaders() });
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) { clearAuthAndRedirect(); return; }
      setError('Could not load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) { clearAuthAndRedirect(); return; }
    load();
  }, [load]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Sk className="h-8 w-44 mb-2" /><Sk className="h-4 w-64" /></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[...Array(4)].map((_, i) => <SkCard key={i} />)}</div>
        <SkChart h="h-60" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><SkChart /><SkChart /></div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
        <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span>
        <button onClick={load} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-red-100">Retry</button>
      </div>
    );
  }

  const { productivityScore, tasks, goals, mockTests, journals, notes, recommendations } = data;
  const hasAnyData = tasks.total > 0 || goals.total > 0 || mockTests.totalAttempts > 0 || journals.total > 0;

  // Pie data for tasks
  const taskPie = [
    { name: 'Completed', value: tasks.completed },
    { name: 'Pending',   value: tasks.pending },
  ].filter(d => d.value > 0);

  const taskSourcePie = [
    { name: 'Manual',    value: tasks.manual },
    { name: 'Generated', value: tasks.generated },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-10">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Insights</h1>
        <p className="mt-1 text-slate-500">A complete view of your productivity and learning progress.</p>
      </div>

      {/* ── Context AI — Insights summary ────────────────────────────────── */}
      {data && hasAnyData && (
        <ContextAI
          module="insights"
          context={{
            productivityScore: data.productivityScore,
            tasks: {
              total: data.tasks.total,
              completed: data.tasks.completed,
              pending: data.tasks.pending,
              completionRate: data.tasks.completionRate,
              streak: data.tasks.streak,
            },
            goals: {
              total: data.goals.total,
              completed: data.goals.completed,
              active: data.goals.active,
              avgProgress: data.goals.avgProgress,
              completionRate: data.goals.completionRate,
            },
            mockTests: {
              totalAttempts: data.mockTests.totalAttempts,
              avgScore: data.mockTests.avgScore,
              bestScore: data.mockTests.bestScore,
              passCount: data.mockTests.passCount,
            },
            journals: {
              total: data.journals.total,
              streak: data.journals.streak,
              avgStudyHours: data.journals.avgStudyHours,
              totalStudyHours: data.journals.totalStudyHours,
            },
            notes: {
              total: data.notes.total,
              pinned: data.notes.pinned,
            },
          }}
        />
      )}

      {/* ── No data at all ───────────────────────────────────────────────── */}
      {!hasAnyData && (
        <Empty
          icon={BarChart3}
          message="No data yet"
          sub="Add tasks, goals, journal entries or complete mock tests to see your insights."
        />
      )}

      {hasAnyData && (
        <>
          {/* ── Hero row: score ring + 4 summary cards ───────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-1">
              <ScoreRing score={productivityScore} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-4 sm:grid-cols-4">
              <StatCard icon={CheckCircle2} label="Tasks Done"      value={tasks.completed}            color="emerald" sub={`${tasks.completionRate}% completion rate`} />
              <StatCard icon={Flame}        label="Task Streak"     value={`${tasks.streak}d`}         color="amber"   sub="Consecutive active days" />
              <StatCard icon={Target}       label="Goal Progress"   value={`${goals.avgProgress ?? 0}%`} color="violet" sub={`${goals.completed}/${goals.total} completed`} />
              <StatCard icon={Trophy}       label="Best Test Score" value={`${mockTests.bestScore}%`}  color="sky"     sub={`Avg: ${mockTests.avgScore}%`} />
            </div>
          </div>

          {/* ══ TASK ANALYTICS ═══════════════════════════════════════════════ */}
          {tasks.total > 0 && (
            <Section title="Task Analytics" icon={CheckCircle2} iconColor="text-emerald-600">

              {/* Stat row */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total',           value: tasks.total },
                  { label: 'Completed',       value: tasks.completed },
                  { label: 'Pending',         value: tasks.pending },
                  { label: 'Completion Rate', value: `${tasks.completionRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                    <p className="text-xl font-bold text-slate-800">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* 7-day line chart */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-sm font-semibold text-slate-700">7-Day Task Activity</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={tasks.weeklyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day"       tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CT />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="created"   name="Created"   stroke={C.sky}     strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke={C.emerald} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie: completed vs pending */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Completed vs Pending</p>
                  {taskPie.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={taskPie} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                          {taskPie.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? C.emerald : C.rose} />
                          ))}
                        </Pie>
                        <Tooltip content={<CT />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty icon={CheckCircle2} message="No task data" />
                  )}
                </div>
              </div>

              {/* Source breakdown — only show if both exist */}
              {tasks.manual > 0 && tasks.generated > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-slate-700">Task Source Breakdown</p>
                  <div className="flex gap-4">
                    {taskSourcePie.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="h-3 w-3 rounded-full" style={{ background: i === 0 ? C.violet : C.sky }} />
                        {d.name}: <span className="font-semibold text-slate-800">{d.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    <ProgressRow label="Manual"    value={tasks.manual}    max={tasks.total} color={C.violet} />
                    <ProgressRow label="Generated" value={tasks.generated} max={tasks.total} color={C.sky} />
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ══ MOCK TEST ANALYTICS ══════════════════════════════════════════ */}
          {mockTests.totalAttempts > 0 && (
            <Section title="Mock Test Analytics" icon={ClipboardList} iconColor="text-violet-600">

              {/* Stat row */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Attempts',       value: mockTests.totalAttempts },
                  { label: 'Average Score',  value: `${mockTests.avgScore}%` },
                  { label: 'Best Score',     value: `${mockTests.bestScore}%` },
                  { label: 'Passed',         value: mockTests.passCount },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                    <p className="text-xl font-bold text-violet-700">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Score area chart — only when more than 1 attempt */}
              {mockTests.trend.length > 1 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Score Progress Over Time</p>
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={mockTests.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.violet} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={C.violet} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date"    tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CT unit="%" />} />
                      <Area
                        type="monotone" dataKey="score" name="Score"
                        stroke={C.violet} fill="url(#sg)" strokeWidth={2}
                        dot={{ r: 3, fill: C.violet }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Subject bar chart */}
                {mockTests.subjectPerformance.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-slate-700">Average by Subject</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={mockTests.subjectPerformance} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip content={<CT unit="%" />} />
                        <Bar dataKey="average" name="Avg %" fill={C.sky} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Difficulty bar chart with per-bar color */}
                {mockTests.difficultyPerformance.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-slate-700">Average by Difficulty</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={mockTests.difficultyPerformance} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="difficulty" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis domain={[0, 100]}     tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip content={<CT unit="%" />} />
                        <Bar dataKey="average" name="Avg %" radius={[6, 6, 0, 0]}>
                          {mockTests.difficultyPerformance.map((e, i) => (
                            <Cell key={i} fill={DIFF_COLOR[e.difficulty] || C.slate} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* No attempts yet */}
          {mockTests.totalAttempts === 0 && (
            <Section title="Mock Test Analytics" icon={ClipboardList} iconColor="text-violet-600">
              <Empty icon={ClipboardList} message="No mock test attempts yet" sub="Complete a test to see your performance analytics here." />
            </Section>
          )}

          {/* ══ GOAL ANALYTICS ═══════════════════════════════════════════════ */}
          {goals.total > 0 && (
            <Section title="Goal Analytics" icon={Target} iconColor="text-amber-600">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total Goals',     value: goals.total },
                  { label: 'Completed',       value: goals.completed },
                  { label: 'Active',          value: goals.active },
                  { label: 'Completion Rate', value: `${goals.completionRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                    <p className="text-xl font-bold text-amber-600">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <p className="text-sm font-semibold text-slate-700">Goal Progress Overview</p>
                <ProgressRow label="Overall completion" value={goals.completionRate} max={100} color={C.violet} />
                <ProgressRow label="Average progress"   value={goals.avgProgress}   max={100} color={C.amber} />

                {/* Progress buckets */}
                {goals.buckets.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-slate-500 mb-2">Distribution</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {goals.buckets.map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                          <p className="text-lg font-bold text-slate-800">{value}</p>
                          <p className="text-xs text-slate-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ══ JOURNAL ANALYTICS ════════════════════════════════════════════ */}
          {journals.total > 0 && (
            <Section title="Journal Analytics" icon={BookOpen} iconColor="text-rose-500">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total Entries',     value: journals.total },
                  { label: 'This Week',         value: journals.thisWeek },
                  { label: 'Journal Streak',    value: `${journals.streak}d` },
                  { label: 'Total Study Hours', value: `${journals.totalStudyHours}h` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                    <p className="text-xl font-bold text-rose-600">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Weekly study hours bar chart */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Study Hours — Last 7 Days</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={journals.weeklyStudyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day"   tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis allowDecimals  tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CT unit="h" />} />
                      <Bar dataKey="hours" name="Hours" fill={C.rose} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Mood distribution */}
                {journals.moodDistribution.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-slate-700">Mood Distribution</p>
                    <div className="space-y-2.5">
                      {journals.moodDistribution.map(({ mood, count }) => {
                        const cfg = MOOD_LABEL[mood] || { emoji: '❓', label: mood, color: 'text-slate-600 bg-slate-50' };
                        const pct = journals.total > 0 ? Math.round((count / journals.total) * 100) : 0;
                        return (
                          <div key={mood} className="flex items-center gap-3">
                            <span className={`flex w-24 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                              {cfg.emoji} {cfg.label}
                            </span>
                            <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-rose-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-right text-xs text-slate-500">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    {journals.avgStudyHours > 0 && (
                      <p className="mt-4 text-xs text-slate-400">
                        Avg <span className="font-semibold text-slate-600">{journals.avgStudyHours}h</span> study per entry
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ══ NOTES SNAPSHOT ════════════════════════════════════════════════ */}
          {notes.total > 0 && (
            <Section title="Notes Snapshot" icon={StickyNote} iconColor="text-indigo-600">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Notes', value: notes.total },
                  { label: 'Pinned',      value: notes.pinned },
                  { label: 'Tags Used',   value: notes.topTags.length },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                    <p className="text-xl font-bold text-indigo-600">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {notes.topTags.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-slate-700">Top Tags</p>
                  <ChipRow items={notes.topTags.map(({ tag, count }) => ({
                    label: `#${tag}`,
                    count,
                    color: 'bg-indigo-50 text-indigo-700',
                  }))} />
                </div>
              )}
            </Section>
          )}

          {/* ══ RECOMMENDATIONS ══════════════════════════════════════════════ */}
          {recommendations.length > 0 && (
            <Section title="Recommended Next Actions" icon={Lightbulb} iconColor="text-amber-500">
              <div className="space-y-3">
                {recommendations.map((rec, i) => {
                  const cfg = PRIORITY_CFG[rec.priority] || PRIORITY_CFG.low;
                  return (
                    <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                      <Star className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.text}`} />
                      <p className={`flex-1 text-sm font-medium ${cfg.text}`}>{rec.text}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                        {cfg.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}