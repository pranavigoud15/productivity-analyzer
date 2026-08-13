import { useState, useEffect, useCallback } from 'react';
import { Plus, CalendarDays, Trash2, X, Loader2, Target } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import ContextAI from '../components/assistant/ContextAI';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

function GoalCard({ goal, isPending, onDelete }) {
  const isCompleted = goal.status === 'completed';
  const savedProgress = Math.min(100, Math.max(0, Number(goal.progress) || 0));

  const formattedDate = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <li className="rounded-2xl border border-subtle bg-surface-secondary p-4 transition-colors hover:bg-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-primary">{goal.title}</p>
          {goal.description && (
            <p className="mt-0.5 truncate text-xs text-muted">{goal.description}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            isCompleted
              ? 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]'
              : 'bg-accent-violet-soft accent-violet'
          }`}
        >
          {isCompleted ? 'Completed' : 'Active'}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
          <div
            className={`h-full rounded-full transition-all ${isCompleted ? 'bg-[var(--pa-accent-success)]' : 'bg-accent-violet'}`}
            style={{ width: `${savedProgress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
          <span>{savedProgress}% complete</span>
          {formattedDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formattedDate}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onDelete(goal)}
          disabled={isPending}
          aria-label="Delete goal"
          className="ml-auto rounded-lg p-1.5 text-muted hover:bg-[var(--pa-accent-danger)]/10 hover:text-[var(--pa-accent-danger)] disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ContextAI
        module="goals"
        context={{
          title: goal.title,
          description: goal.description,
          status: goal.status,
          progress: goal.progress,
          targetDate: goal.targetDate,
        }}
        title={goal.title}
      />
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
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-2xl bg-surface-secondary p-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal title"
        disabled={isSubmitting}
        className="pa-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        disabled={isSubmitting}
        rows={2}
        className="pa-input w-full resize-none px-3 py-2 text-sm disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          disabled={isSubmitting}
          className="pa-input flex-1 px-3 py-2 text-sm disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cancel"
          className="rounded-xl p-2 text-muted hover:bg-hover hover:text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs font-medium text-[var(--pa-accent-danger)]">{error}</p>}
    </form>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [pendingGoalIds, setPendingGoalIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/goals', { headers: getAuthHeaders() });
      setGoals(Array.isArray(res.data) ? res.data : res.data.goals || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setLoadError('Could not load your goals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      clearAuthAndRedirect();
      return;
    }
    fetchGoals();
  }, [fetchGoals]);

  const handleAddGoal = async ({ title, description, targetDate }) => {
    await API.post('/goals', { title, description, targetDate }, { headers: getAuthHeaders() });
    await fetchGoals();
  };

  const setGoalPending = (id, isPending) => {
    setPendingGoalIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDeleteGoal = async (goal) => {
    const id = goal._id || goal.id;
    setGoalPending(id, true);
    try {
      await API.delete(`/goals/${id}`, { headers: getAuthHeaders() });
      setGoals((prev) => prev.filter((g) => (g._id || g.id) !== id));
    } catch (err) {
      setLoadError('Could not delete that goal. Please try again.');
      setGoalPending(id, false);
    }
  };

  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your goals...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="My Goals"
        description={`${completedGoals} completed · ${goals.length - completedGoals} active`}
      />

      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
          <span>{loadError}</span>
          <button type="button" onClick={fetchGoals} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      <section className="pa-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">All Goals</h2>
          <button
            onClick={() => setIsAddingGoal((prev) => !prev)}
            className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </button>
        </div>

        <div className="mt-5">
          {isAddingGoal && <AddGoalForm onSubmit={handleAddGoal} onClose={() => setIsAddingGoal(false)} />}

          {goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Set one to start tracking progress."
              action={
                <button type="button" onClick={() => setIsAddingGoal(true)} className="pa-btn-primary px-4 py-2 text-sm font-medium">
                  Add Goal
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal._id || goal.id}
                  goal={goal}
                  isPending={pendingGoalIds.has(goal._id || goal.id)}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
