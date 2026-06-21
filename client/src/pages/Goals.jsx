import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle2, CalendarDays, Trash2, X, Loader2 } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';

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

  // Note: creating a goal also auto-generates a roadmap and tasks on the
  // backend (unchanged). This page only refetches goals — the new
  // roadmap/tasks will be there next time Roadmaps/Tasks is visited.
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

  // Note: deleting a goal also cascade-deletes its roadmap and
  // roadmap-generated tasks on the backend (unchanged). This page only
  // filters its own `goals` state — Roadmaps/Tasks reflect the deletion
  // next time they're fetched.
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

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your goals...
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">My Goals</h1>
        <p className="mt-1 text-slate-500">
          {completedGoals} completed · {totalGoals - completedGoals} active
        </p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <span>{loadError}</span>
          <button
            onClick={fetchGoals}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">All Goals</h2>
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
    </>
  );
}
