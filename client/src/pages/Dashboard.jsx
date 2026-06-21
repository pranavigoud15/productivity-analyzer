import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ListChecks,
  Plane,
  BarChart3,
  Target,
  History,
  StickyNote,
  Star,
  ClipboardList,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  ListTodo,
  Mail,
  X,
  Loader2,
  Trophy,
  Award,
  CalendarDays,
  Trash2,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import API from '../services/api';

const NAV_ITEMS = [
  { label: 'Tasks', icon: ListChecks },
  { label: 'Travel', icon: Plane },
  { label: 'Insights', icon: BarChart3 },
  { label: 'My Goals', icon: Target },
  { label: 'History', icon: History },
  { label: 'Notes', icon: StickyNote },
  { label: 'Key Points', icon: Star },
  { label: 'Mock Tests', icon: ClipboardList },
  { label: 'Mistakes', icon: AlertTriangle },
];

const COLOR_STYLES = {
  violet: { border: 'border-violet-100', bg: 'bg-violet-50', iconBg: 'bg-violet-100', text: 'text-violet-600' },
  emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', text: 'text-emerald-600' },
  sky: { border: 'border-sky-100', bg: 'bg-sky-50', iconBg: 'bg-sky-100', text: 'text-sky-600' },
  orange: { border: 'border-orange-100', bg: 'bg-orange-50', iconBg: 'bg-orange-100', text: 'text-orange-600' },
  indigo: { border: 'border-indigo-100', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', text: 'text-indigo-600' },
  teal: { border: 'border-teal-100', bg: 'bg-teal-50', iconBg: 'bg-teal-100', text: 'text-teal-600' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Streak = consecutive days (ending today, or yesterday if nothing has
// been completed yet today) with at least one completed task. Pure
// client-side derivation from completedAt timestamps — no backend call.
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

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const styles = COLOR_STYLES[color];
  return (
    <div className={`rounded-2xl border ${styles.border} ${styles.bg} p-5 shadow-sm transition-shadow hover:shadow-md`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${styles.iconBg}`}>
        <Icon className={`h-5 w-5 ${styles.text}`} />
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

// TaskItem now supports: toggling complete, inline title editing, delete.
function TaskItem({ task, isPending, onToggleComplete, onUpdate, onDelete }) {
  const isCompleted = Boolean(task.completed);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const createdTime = task.createdAt
    ? new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const startEditing = () => {
    setDraftTitle(task.title);
    setError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setError('Title cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onUpdate(task, trimmed);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <li className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Save"
            className="rounded-lg bg-violet-600 p-2 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={cancelEditing}
            disabled={isSaving}
            aria-label="Cancel"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => onToggleComplete(task)}
          disabled={isPending}
          aria-label={isCompleted ? 'Mark as pending' : 'Mark as complete'}
          className="shrink-0 disabled:opacity-50"
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300 hover:text-violet-400" />
          )}
        </button>
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            {task.title}
          </p>
          {createdTime && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {createdTime}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isCompleted ? 'Completed' : 'Pending'}
        </span>
        <button
          onClick={startEditing}
          disabled={isPending}
          aria-label="Edit task"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(task)}
          disabled={isPending}
          aria-label="Delete task"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function AddTaskForm({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(trimmed);
      setTitle('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to get done?"
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cancel"
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </form>
  );
}

function GoalCard({ goal, isPending, onComplete, onDelete, onProgressChange }) {
  const isCompleted = goal.status === 'completed';
  const savedProgress = Math.min(100, Math.max(0, Number(goal.progress) || 0));

  const [sliderValue, setSliderValue] = useState(savedProgress);

  useEffect(() => {
    setSliderValue(savedProgress);
  }, [savedProgress]);

  const formattedDate = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const commitProgress = () => {
    if (sliderValue !== savedProgress) {
      onProgressChange(goal, sliderValue);
    }
  };

  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700">{goal.title}</p>
          {goal.description && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{goal.description}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {isCompleted ? 'Completed' : 'Active'}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${sliderValue}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
          <span>{sliderValue}% complete</span>
          {formattedDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formattedDate}
            </span>
          )}
        </div>

        {!isCompleted && (
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={sliderValue}
            disabled={isPending}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            onMouseUp={commitProgress}
            onTouchEnd={commitProgress}
            aria-label="Update goal progress"
            className="mt-2 w-full accent-indigo-600 disabled:opacity-50"
          />
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!isCompleted && (
          <button
            onClick={() => onComplete(goal)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Complete
          </button>
        )}
        <button
          onClick={() => onDelete(goal)}
          disabled={isPending}
          aria-label="Delete goal"
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function AddGoalForm({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (!targetDate) {
      setError('Target date is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({ title: trimmedTitle, description: description.trim(), targetDate });
      setTitle('');
      setDescription('');
      setTargetDate('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-2xl bg-slate-50 p-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal title"
        disabled={isSubmitting}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        disabled={isSubmitting}
        rows={2}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cancel"
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </form>
  );
}

function RoadmapCard({ roadmap, pendingMilestoneIds, onToggleMilestone }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const milestones = roadmap.milestones || [];
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const pendingMilestones = totalMilestones - completedMilestones;
  const progress = totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700">{roadmap.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {completedMilestones} completed · {pendingMilestones} pending
          </p>
        </div>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200"
        >
          {isExpanded ? 'Hide Weeks' : 'View Weeks'}
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{progress}% complete</p>
      </div>

      {isExpanded && (
        <ul className="mt-4 space-y-2 border-t border-slate-200 pt-3">
          {milestones.map((milestone) => {
            const isCompleted = milestone.status === 'completed';
            const isPending = pendingMilestoneIds.has(milestone._id);
            const range =
              milestone.startDate && milestone.endDate
                ? `${new Date(milestone.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(
                    milestone.endDate
                  ).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                : null;

            return (
              <li key={milestone._id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={() => onToggleMilestone(roadmap, milestone)}
                    disabled={isPending}
                    aria-label={isCompleted ? 'Mark week as pending' : 'Mark week as complete'}
                    className="shrink-0 disabled:opacity-50"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 hover:text-sky-400" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-xs font-medium ${
                        isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}
                    >
                      {milestone.title}
                    </p>
                    {range && <p className="text-[11px] text-slate-400">{range}</p>}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isCompleted ? 'Done' : 'Pending'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('Tasks');
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [pendingTaskIds, setPendingTaskIds] = useState(new Set());
  const [goals, setGoals] = useState([]);
  const [pendingGoalIds, setPendingGoalIds] = useState(new Set());
  const [roadmaps, setRoadmaps] = useState([]);
  const [isRoadmapsLoading, setIsRoadmapsLoading] = useState(true);
  const [roadmapsError, setRoadmapsError] = useState('');
  const [pendingMilestoneIds, setPendingMilestoneIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }, []);

  const fetchTasks = useCallback(async () => {
    const res = await API.get('/tasks', { headers: getAuthHeaders() });
    setTasks(Array.isArray(res.data) ? res.data : res.data.tasks || []);
  }, []);

  const fetchGoals = useCallback(async () => {
    const res = await API.get('/goals', { headers: getAuthHeaders() });
    setGoals(Array.isArray(res.data) ? res.data : res.data.goals || []);
  }, []);

  const fetchRoadmaps = useCallback(async () => {
    setIsRoadmapsLoading(true);
    setRoadmapsError('');
    try {
      const res = await API.get('/roadmaps', { headers: getAuthHeaders() });
      setRoadmaps(Array.isArray(res.data) ? res.data : res.data.roadmaps || []);
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthFailure();
        return;
      }
      setRoadmapsError('Could not load your roadmaps. Please try again.');
    } finally {
      setIsRoadmapsLoading(false);
    }
  }, [handleAuthFailure]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [dashboardRes] = await Promise.all([
        API.get('/dashboard', { headers: getAuthHeaders() }),
        fetchTasks(),
        fetchGoals(),
      ]);
      setUser(dashboardRes.data.user || dashboardRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthFailure();
        return;
      }
      setLoadError('Could not load your dashboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchTasks, fetchGoals, handleAuthFailure]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      handleAuthFailure();
      return;
    }
    fetchDashboardData();
  }, [fetchDashboardData, handleAuthFailure]);

  // Roadmaps load independently of the rest of the dashboard, with their
  // own loading/error state — a roadmap fetch failure shouldn't block
  // Tasks or Goals from rendering, and vice versa.
  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  const handleAddTask = async (title) => {
    await API.post('/tasks', { title }, { headers: getAuthHeaders() });
    await fetchTasks();
  };

  const setTaskPending = (id, isPending) => {
    setPendingTaskIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleTaskComplete = async (task) => {
    const id = task._id || task.id;
    setTaskPending(id, true);
    try {
      const res = await API.patch(`/tasks/${id}/complete`, {}, { headers: getAuthHeaders() });
      const updated = res.data;
      setTasks((prev) => prev.map((t) => ((t._id || t.id) === id ? updated : t)));
      // If this task is linked to a roadmap milestone, the backend just
      // recalculated that milestone's status — refresh roadmaps so the
      // progress bar reflects it without a full page reload.
      if (updated.roadmap) {
        fetchRoadmaps();
      }
    } catch (err) {
      setLoadError('Could not update that task. Please try again.');
    } finally {
      setTaskPending(id, false);
    }
  };

  const handleUpdateTask = async (task, title) => {
    const id = task._id || task.id;
    setTaskPending(id, true);
    try {
      const res = await API.patch(`/tasks/${id}`, { title }, { headers: getAuthHeaders() });
      const updated = res.data;
      setTasks((prev) => prev.map((t) => ((t._id || t.id) === id ? updated : t)));
    } finally {
      setTaskPending(id, false);
    }
  };

  const handleDeleteTask = async (task) => {
    const id = task._id || task.id;
    setTaskPending(id, true);
    try {
      await API.delete(`/tasks/${id}`, { headers: getAuthHeaders() });
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
      if (task.roadmap) {
        fetchRoadmaps();
      }
    } catch (err) {
      setLoadError('Could not delete that task. Please try again.');
      setTaskPending(id, false);
    }
  };

  const handleAddGoal = async ({ title, description, targetDate }) => {
    await API.post('/goals', { title, description, targetDate }, { headers: getAuthHeaders() });
    // Goal creation auto-generates a roadmap AND auto-generates tasks for
    // each milestone — all three need to refresh for everything new to
    // show up immediately.
    await Promise.all([fetchGoals(), fetchRoadmaps(), fetchTasks()]);
  };

  const setGoalPending = (id, isPending) => {
    setPendingGoalIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleCompleteGoal = async (goal) => {
    const id = goal._id || goal.id;
    setGoalPending(id, true);
    try {
      const res = await API.patch(`/goals/${id}/complete`, {}, { headers: getAuthHeaders() });
      const updated = res.data;
      setGoals((prev) => prev.map((g) => ((g._id || g.id) === id ? updated : g)));
    } catch (err) {
      setLoadError('Could not mark that goal complete. Please try again.');
    } finally {
      setGoalPending(id, false);
    }
  };

  const handleUpdateGoalProgress = async (goal, progress) => {
    const id = goal._id || goal.id;
    setGoalPending(id, true);
    try {
      const res = await API.patch(`/goals/${id}`, { progress }, { headers: getAuthHeaders() });
      const updated = res.data;
      setGoals((prev) => prev.map((g) => ((g._id || g.id) === id ? updated : g)));
    } catch (err) {
      setLoadError('Could not update goal progress. Please try again.');
    } finally {
      setGoalPending(id, false);
    }
  };

  const handleDeleteGoal = async (goal) => {
    const id = goal._id || goal.id;
    setGoalPending(id, true);
    try {
      await API.delete(`/goals/${id}`, { headers: getAuthHeaders() });
      setGoals((prev) => prev.filter((g) => (g._id || g.id) !== id));
      // Backend cascade-deletes the linked roadmap AND any roadmap-generated
      // tasks for this goal — mirror both locally.
      setRoadmaps((prev) => prev.filter((r) => (r.goal?._id || r.goal) !== id));
      setTasks((prev) => prev.filter((t) => !t.goal || String(t.goal) !== String(id)));
    } catch (err) {
      setLoadError('Could not delete that goal. Please try again.');
      setGoalPending(id, false);
    }
  };

  const setMilestonePending = (id, isPending) => {
    setPendingMilestoneIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleMilestone = async (roadmap, milestone) => {
    const milestoneId = milestone._id;
    setMilestonePending(milestoneId, true);
    try {
      const res = await API.patch(
        `/roadmaps/${roadmap._id}/milestones/${milestoneId}/complete`,
        {},
        { headers: getAuthHeaders() }
      );
      const updated = res.data;
      setRoadmaps((prev) => prev.map((r) => ((r._id || r.id) === (updated._id || updated.id) ? updated : r)));
    } catch (err) {
      setLoadError('Could not update that milestone. Please try again.');
    } finally {
      setMilestonePending(milestoneId, false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const currentStreak = calculateStreak(tasks);

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

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
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      <aside className="flex w-16 flex-col border-r border-slate-100 bg-white px-2 py-6 md:w-64 md:px-4">
        <div className="mb-8 flex items-center gap-2 px-1 md:px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="hidden truncate text-base font-bold tracking-tight text-slate-800 md:inline">
            Productivity Analyzer
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.label}
              onClick={() => setActiveNav(item.label)}
            />
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {loadError && (
            <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              <span>{loadError}</span>
              <button
                onClick={fetchDashboardData}
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

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Today's Tasks</h2>
                <p className="text-sm text-slate-400">{totalTasks} tasks scheduled</p>
              </div>
              <button
                onClick={() => setIsAddingTask((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>

            <div className="mt-5">
              {isAddingTask && <AddTaskForm onSubmit={handleAddTask} onClose={() => setIsAddingTask(false)} />}

              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No tasks yet — add one to get started.</p>
              ) : (
                <ul className="space-y-3">
                  {tasks.map((task) => (
                    <TaskItem
                      key={task._id || task.id}
                      task={task}
                      isPending={pendingTaskIds.has(task._id || task.id)}
                      onToggleComplete={handleToggleTaskComplete}
                      onUpdate={handleUpdateTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">My Goals</h2>
                <p className="text-sm text-slate-400">{totalGoals} goals tracked</p>
              </div>
              <button
                onClick={() => setIsAddingGoal((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Goal
              </button>
            </div>

            <div className="mt-5">
              {isAddingGoal && <AddGoalForm onSubmit={handleAddGoal} onClose={() => setIsAddingGoal(false)} />}

              {goals.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No goals yet — set one to start tracking progress.</p>
              ) : (
                <ul className="space-y-3">
                  {goals.map((goal) => (
                    <GoalCard
                      key={goal._id || goal.id}
                      goal={goal}
                      isPending={pendingGoalIds.has(goal._id || goal.id)}
                      onComplete={handleCompleteGoal}
                      onDelete={handleDeleteGoal}
                      onProgressChange={handleUpdateGoalProgress}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Learning Roadmaps</h2>
                <p className="text-sm text-slate-400">
                  {roadmaps.length} roadmap{roadmaps.length === 1 ? '' : 's'} generated from your goals
                </p>
              </div>
            </div>

            <div className="mt-5">
              {isRoadmapsLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading roadmaps...
                </div>
              ) : roadmapsError ? (
                <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                  <span>{roadmapsError}</span>
                  <button
                    onClick={fetchRoadmaps}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100"
                  >
                    Retry
                  </button>
                </div>
              ) : roadmaps.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No roadmaps yet — creating a goal automatically generates one.
                </p>
              ) : (
                <ul className="space-y-3">
                  {roadmaps.map((roadmap) => (
                    <RoadmapCard
                      key={roadmap._id || roadmap.id}
                      roadmap={roadmap}
                      pendingMilestoneIds={pendingMilestoneIds}
                      onToggleMilestone={handleToggleMilestone}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}