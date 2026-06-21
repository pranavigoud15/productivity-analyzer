import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Loader2,
  ListTodo,
  CheckCircle2,
  Circle,
  Target,
  Flame,
  Trophy,
  Award,
  CalendarDays,
  Map,
  Sparkles,
} from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import StatCard from '../components/common/StatCard';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Consecutive days (today, or yesterday if nothing's completed yet today)
// with at least one completed task. Pure client-side derivation.
function calculateStreak(tasks) {
  const completedDates = new Set(
    tasks
      .filter((t) => t.completed && t.completedAt)
      .map((t) => new Date(t.completedAt).toDateString())
  );

  if (completedDates.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  if (!completedDates.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completedDates.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function CurrentGoalCard({ goal }) {
  if (!goal) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Current Goal</h2>
        <p className="mt-4 text-sm text-slate-400">No active goals yet — create one to get started.</p>
      </div>
    );
  }

  const progress = Math.min(100, Math.max(0, Number(goal.progress) || 0));
  const formattedDate = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Current Goal</h2>
      <p className="mt-3 truncate text-sm font-medium text-slate-700">{goal.title}</p>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
          <span>{progress}% complete</span>
          {formattedDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formattedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RoadmapProgressCard({ roadmap }) {
  if (!roadmap) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Roadmap Progress</h2>
        <p className="mt-4 text-sm text-slate-400">No active roadmap yet.</p>
      </div>
    );
  }

  const milestones = roadmap.milestones || [];
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === 'completed').length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const currentMilestone = milestones.find((m) => m.status !== 'completed');

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Roadmap Progress</h2>
      <p className="mt-3 truncate text-sm font-medium text-slate-700">{roadmap.title}</p>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{progress}% complete</p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Map className="h-3.5 w-3.5 text-sky-500" />
        {currentMilestone ? `Current: ${currentMilestone.title}` : 'All milestones complete'}
      </p>
    </div>
  );
}

function PendingTaskRow({ task }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
      <Circle className="h-4 w-4 shrink-0 text-slate-300" />
      <p className="truncate text-sm font-medium text-slate-700">{task.title}</p>
    </li>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [dashboardRes, tasksRes, goalsRes, roadmapsRes] = await Promise.all([
        API.get('/dashboard', { headers: getAuthHeaders() }),
        API.get('/tasks', { headers: getAuthHeaders() }),
        API.get('/goals', { headers: getAuthHeaders() }),
        API.get('/roadmaps', { headers: getAuthHeaders() }),
      ]);
      setUser(dashboardRes.data.user || dashboardRes.data);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data.tasks || []);
      setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : goalsRes.data.goals || []);
      setRoadmaps(Array.isArray(roadmapsRes.data) ? roadmapsRes.data : roadmapsRes.data.roadmaps || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setLoadError('Could not load your dashboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      clearAuthAndRedirect();
      return;
    }
    fetchOverview();
  }, [fetchOverview]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const currentStreak = calculateStreak(tasks);

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  // "Current" goal: most recently created active (non-completed) goal.
  // goals[] is already sorted newest-first by the backend, so the first
  // non-completed entry is exactly that.
  const currentGoal = goals.find((g) => g.status !== 'completed') || null;

  // Prefer the roadmap linked to the current goal; fall back to the most
  // recently created roadmap if there's no current goal (or no match).
  const currentRoadmap =
    roadmaps.find((r) => String(r.goal?._id || r.goal) === String(currentGoal?._id || currentGoal?.id)) ||
    roadmaps[0] ||
    null;

  // First 3 pending tasks in API order (newest-created first) — there's
  // no due-date field on Task yet, so this isn't a priority queue, just
  // a quick glance at what's outstanding.
  const topPendingTasks = tasks.filter((t) => !t.completed).slice(0, 3);

  const stats = [
    { label: 'Total Tasks', value: totalTasks, icon: ListTodo, color: 'violet' },
    { label: 'Completed Tasks', value: completedTasks, icon: CheckCircle2, color: 'emerald' },
    { label: 'Pending Tasks', value: pendingTasks, icon: Target, color: 'sky' },
    {
      label: 'Current Streak',
      value: `${currentStreak} day${currentStreak === 1 ? '' : 's'}`,
      icon: Flame,
      color: 'orange',
    },
    { label: 'Total Goals', value: totalGoals, icon: Trophy, color: 'indigo' },
    { label: 'Completed Goals', value: completedGoals, icon: Award, color: 'teal' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your dashboard...
      </div>
    );
  }

  return (
    <>
      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <span>{loadError}</span>
          <button
            onClick={fetchOverview}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-white bg-gradient-to-br from-violet-100 via-sky-50 to-emerald-50 p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{getGreeting()}</h1>
        <p className="mt-1 text-slate-500">Welcome back! Let's make today productive.</p>
        {user?.email && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
            <Mail className="h-3.5 w-3.5" />
            {user.email}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CurrentGoalCard goal={currentGoal} />
        <RoadmapProgressCard roadmap={currentRoadmap} />
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Top Pending Tasks</h2>
        <div className="mt-4">
          {topPendingTasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nothing pending — you're all caught up.</p>
          ) : (
            <ul className="space-y-2">
              {topPendingTasks.map((task) => (
                <PendingTaskRow key={task._id || task.id} task={task} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Sparkles className="h-5 w-5 text-violet-500" />
          Quick Summary
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          You've completed <span className="font-semibold text-slate-800">{completedTasks}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalTasks}</span> tasks, with a current streak of{' '}
          <span className="font-semibold text-slate-800">
            {currentStreak} day{currentStreak === 1 ? '' : 's'}
          </span>
          . You have <span className="font-semibold text-slate-800">{totalGoals - completedGoals}</span> active
          goal{totalGoals - completedGoals === 1 ? '' : 's'}
          {currentGoal ? ` — currently focused on "${currentGoal.title}".` : '.'}
        </p>
      </section>
    </>
  );
}
