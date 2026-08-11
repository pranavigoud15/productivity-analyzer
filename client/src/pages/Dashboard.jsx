import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  BookOpen,
  StickyNote,
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

function CurrentGoalCard({ goal }) {
  if (!goal) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Current Goal</h2>
        <p className="mt-4 text-sm text-slate-400">
          No active goals yet — create one to get started.
        </p>
      </div>
    );
  }

  const progress = Math.min(100, Math.max(0, Number(goal.progress) || 0));
  const formattedDate = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Current Goal</h2>
      <p className="mt-3 truncate text-sm font-medium text-slate-700">
        {goal.title}
      </p>
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${progress}%` }}
          />
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
        <p className="mt-4 text-sm text-slate-400">
          No active roadmap yet.
        </p>
      </div>
    );
  }

  const progress = Math.min(100, Math.max(0, Number(roadmap.progress) || 0));
  const currentMilestone = roadmap.currentMilestone;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Roadmap Progress</h2>
      <p className="mt-3 truncate text-sm font-medium text-slate-700">
        {roadmap.title}
      </p>
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {progress}% complete
        </p>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Map className="h-3.5 w-3.5 text-sky-500" />
        {currentMilestone
          ? `Current: ${currentMilestone.title}`
          : 'All milestones complete'}
      </p>
    </div>
  );
}

function RecentJournalCard({ entry }) {
  if (!entry) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">
          Recent Journal Entry
        </h2>
        <p className="mt-4 text-sm text-slate-400">
          No journal entries yet.
        </p>
      </div>
    );
  }

  const formattedDate = entry.date
    ? new Date(entry.date).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">
        Recent Journal Entry
      </h2>
      <p className="mt-3 truncate text-sm font-medium text-slate-700">
        {entry.title}
      </p>
      {formattedDate && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <CalendarDays className="h-3 w-3" />
          {formattedDate}
        </p>
      )}
      {entry.content && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-500">
          {entry.content}
        </p>
      )}
    </div>
  );
}

function PendingTaskRow({ task }) {
  const taskId = task._id || task.id;

  return (
    <li>
      <Link
        to={`/tasks?verifyTaskId=${taskId}`}
        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-slate-200 hover:bg-slate-100/80"
      >
        <Circle className="h-4 w-4 shrink-0 text-slate-300" />
        <p className="truncate text-sm font-medium text-slate-700">
          {task.title}
        </p>
      </Link>
    </li>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const [dashboardRes, summaryRes] = await Promise.all([
        API.get('/dashboard', { headers: getAuthHeaders() }),
        API.get('/dashboard/summary', { headers: getAuthHeaders() }),
      ]);

      setUser(dashboardRes.data.user || dashboardRes.data);
      setSummary(summaryRes.data);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your dashboard...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
        <span>{loadError || 'Could not load your dashboard.'}</span>
        <button
          onClick={fetchOverview}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const taskGoalStats = [
    {
      label: 'Total Tasks',
      value: summary.totalTasks,
      icon: ListTodo,
      color: 'violet',
    },
    {
      label: 'Completed Tasks',
      value: summary.completedTasks,
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      label: 'Pending Tasks',
      value: summary.pendingTasks,
      icon: Target,
      color: 'sky',
    },
    {
      label: 'Current Streak',
      value: `${summary.currentStreak} day${
        summary.currentStreak === 1 ? '' : 's'
      }`,
      icon: Flame,
      color: 'orange',
    },
    {
      label: 'Total Goals',
      value: summary.totalGoals,
      icon: Trophy,
      color: 'indigo',
    },
    {
      label: 'Completed Goals',
      value: summary.completedGoals,
      icon: Award,
      color: 'teal',
    },
  ];

  const journalNoteStats = [
    {
      label: 'Journal Entries',
      value: summary.journalCount,
      icon: BookOpen,
      color: 'cyan',
    },
    {
      label: 'Notes',
      value: summary.notesCount,
      icon: StickyNote,
      color: 'amber',
    },
    {
      label: 'Journal Streak',
      value: `${summary.journalStreak} day${
        summary.journalStreak === 1 ? '' : 's'
      }`,
      icon: Flame,
      color: 'rose',
    },
  ];

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
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          {getGreeting()}
        </h1>

        <p className="mt-1 text-slate-500">
          Welcome back! Let's make today productive.
        </p>

        {user?.email && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
            <Mail className="h-3.5 w-3.5" />
            {user.email}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {taskGoalStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {journalNoteStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CurrentGoalCard goal={summary.activeGoal} />
        <RoadmapProgressCard roadmap={summary.activeRoadmap} />
        <RecentJournalCard entry={summary.recentJournalEntry} />
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">
          Top Pending Tasks
        </h2>

        <div className="mt-4">
          {summary.topPendingTasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Nothing pending — you're all caught up.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.topPendingTasks.map((task) => (
                <PendingTaskRow
                  key={task._id || task.id}
                  task={task}
                />
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
          You've completed{' '}
          <span className="font-semibold text-slate-800">
            {summary.completedTasks}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-slate-800">
            {summary.totalTasks}
          </span>{' '}
          tasks, with a current streak of{' '}
          <span className="font-semibold text-slate-800">
            {summary.currentStreak} day
            {summary.currentStreak === 1 ? '' : 's'}
          </span>
          . You have{' '}
          <span className="font-semibold text-slate-800">
            {summary.activeGoals}
          </span>{' '}
          active goal
          {summary.activeGoals === 1 ? '' : 's'}
          {summary.activeGoal
            ? ` — currently focused on "${summary.activeGoal.title}".`
            : '.'}
        </p>
      </section>
    </>
  );
}