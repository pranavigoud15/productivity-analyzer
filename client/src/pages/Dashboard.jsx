import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
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
  Timer,
  Bot,
  ArrowRight,
} from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/ui/EmptyState';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function ProgressCard({ title, subtitle, progress, footer, accent = 'violet' }) {
  const barColor = accent === 'blue' ? 'bg-[var(--pa-accent-blue)]' : 'bg-accent-violet';

  return (
    <div className="pa-card p-5">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      {subtitle && <p className="mt-2 truncate text-sm font-medium text-secondary">{subtitle}</p>}
      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{progress}% complete</p>
        </div>
      )}
      {footer && <div className="mt-3 text-xs text-secondary">{footer}</div>}
    </div>
  );
}

function PendingTaskRow({ task }) {
  const taskId = task._id || task.id;

  return (
    <li>
      <Link
        to={`/tasks?verifyTaskId=${taskId}`}
        className="flex items-center gap-3 rounded-xl border border-subtle bg-surface-secondary p-3 transition hover:border-default hover:bg-hover"
      >
        <Circle className="h-4 w-4 shrink-0 text-muted" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{task.title}</p>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
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
    queueMicrotask(fetchOverview);
  }, [fetchOverview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your dashboard...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
        <span>{loadError || 'Could not load your dashboard.'}</span>
        <button type="button" onClick={fetchOverview} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const displayName = user?.name || JSON.parse(localStorage.getItem('user') || '{}').name || 'there';

  const overviewStats = [
    { label: 'Total Tasks', value: summary.totalTasks, icon: ListTodo, color: 'violet' },
    { label: 'Completed', value: summary.completedTasks, icon: CheckCircle2, color: 'emerald' },
    { label: 'Pending', value: summary.pendingTasks, icon: Target, color: 'sky' },
    { label: 'Streak', value: `${summary.currentStreak}d`, icon: Flame, color: 'orange' },
    { label: 'Active Goals', value: summary.activeGoals, icon: Trophy, color: 'indigo' },
    { label: 'Goals Done', value: summary.completedGoals, icon: Award, color: 'teal' },
  ];

  return (
    <>
      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
          <span>{loadError}</span>
          <button type="button" onClick={fetchOverview} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      <section className="pa-card-elevated relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-violet-soft blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium text-secondary">Productivity overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-secondary">
            Here&apos;s your productivity overview for today.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/focus" className="pa-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
              <Timer className="h-4 w-4" />
              Focus Session
            </Link>
            <Link to="/tasks" className="pa-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
              <ListTodo className="h-4 w-4" />
              View Tasks
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {overviewStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="pa-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">Top Pending Tasks</h2>
            <Link to="/tasks" className="text-xs font-medium accent-violet hover:underline">View all</Link>
          </div>
          {summary.topPendingTasks.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No pending tasks"
              description="You're all caught up."
              action={<Link to="/tasks" className="pa-btn-primary px-4 py-2 text-sm font-medium">Add Task</Link>}
            />
          ) : (
            <ul className="space-y-2">
              {summary.topPendingTasks.map((task) => (
                <PendingTaskRow key={task._id || task.id} task={task} />
              ))}
            </ul>
          )}
        </section>

        <section className="pa-card p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 accent-violet" />
            <h2 className="text-sm font-semibold text-primary">Productivity AI</h2>
          </div>
          <p className="mt-2 text-sm text-secondary">Your AI assistant is ready to help you plan and stay on track.</p>
          <Link to="/assistant" className="mt-4 inline-flex w-full items-center justify-center gap-2 pa-btn-primary px-4 py-2.5 text-sm font-medium">
            <Bot className="h-4 w-4" />
            Open Assistant
          </Link>
        </section>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summary.activeGoal ? (
          <ProgressCard
            title="Current Goal"
            subtitle={summary.activeGoal.title}
            progress={Number(summary.activeGoal.progress) || 0}
            footer={
              summary.activeGoal.targetDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Due {new Date(summary.activeGoal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )
            }
          />
        ) : (
          <div className="pa-card p-5">
            <h2 className="text-sm font-semibold text-primary">Current Goal</h2>
            <p className="mt-3 text-sm text-muted">No active goals yet.</p>
            <Link to="/goals" className="mt-4 inline-block text-xs font-medium accent-violet hover:underline">Create a goal</Link>
          </div>
        )}

        {summary.activeRoadmap ? (
          <ProgressCard
            title="Roadmap Progress"
            subtitle={summary.activeRoadmap.title}
            progress={Number(summary.activeRoadmap.progress) || 0}
            accent="blue"
            footer={
              <span className="flex items-center gap-1">
                <Map className="h-3 w-3" />
                {summary.activeRoadmap.currentMilestone
                  ? `Current: ${summary.activeRoadmap.currentMilestone.title}`
                  : 'All milestones complete'}
              </span>
            }
          />
        ) : (
          <div className="pa-card p-5">
            <h2 className="text-sm font-semibold text-primary">Roadmap Progress</h2>
            <p className="mt-3 text-sm text-muted">No active roadmap yet.</p>
            <Link to="/roadmaps" className="mt-4 inline-block text-xs font-medium accent-violet hover:underline">View roadmaps</Link>
          </div>
        )}

        {summary.recentJournalEntry ? (
          <div className="pa-card p-5">
            <h2 className="text-sm font-semibold text-primary">Recent Journal</h2>
            <p className="mt-2 truncate text-sm font-medium text-secondary">{summary.recentJournalEntry.title}</p>
            {summary.recentJournalEntry.content && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">{summary.recentJournalEntry.content}</p>
            )}
            <Link to="/journals" className="mt-4 inline-block text-xs font-medium accent-violet hover:underline">Open journal</Link>
          </div>
        ) : (
          <div className="pa-card p-5">
            <h2 className="text-sm font-semibold text-primary">Recent Journal</h2>
            <p className="mt-3 text-sm text-muted">No journal entries yet.</p>
            <Link to="/journals" className="mt-4 inline-block text-xs font-medium accent-violet hover:underline">Write entry</Link>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Journal Entries" value={summary.journalCount} icon={BookOpen} color="cyan" />
        <StatCard label="Notes" value={summary.notesCount} icon={StickyNote} color="amber" />
        <StatCard label="Journal Streak" value={`${summary.journalStreak}d`} icon={Flame} color="rose" />
      </section>
    </>
  );
}
