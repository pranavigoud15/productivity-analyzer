import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle2, Circle, Clock, X, Loader2, Trash2, Pencil, Check, ShieldCheck, ListTodo } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import ContextAI from '../components/assistant/ContextAI';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

function TaskItem({ task, isPending, onToggleComplete, onUpdate, onDelete }) {
  const isCompleted = Boolean(task.completed);
  const isAutoVerified =
  task.source === 'roadmap-generated' && task.mockTest;
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
      <li className="rounded-2xl border border-default bg-accent-violet-soft p-4">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            disabled={isSaving}
            className="pa-input flex-1 px-3 py-2 text-sm disabled:opacity-60"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Save"
            className="pa-btn-primary p-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={cancelEditing}
            disabled={isSaving}
            aria-label="Cancel"
            className="rounded-lg p-2 text-muted hover:bg-hover hover:text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-[var(--pa-accent-danger)]">{error}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-subtle bg-surface-secondary p-4 transition-colors hover:bg-hover">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {isAutoVerified ? (
            <span
              aria-label={isCompleted ? 'Completed (auto-verified)' : 'Pending (auto-verified via mock test)'}
              title="Verified automatically via mock test — cannot be marked complete manually"
              className="shrink-0 cursor-default"
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--pa-accent-success)]" />
              ) : (
                <Circle className="h-5 w-5 text-muted" />
              )}
            </span>
          ) : (
            <button
              onClick={() => onToggleComplete(task)}
              disabled={isPending}
              aria-label={isCompleted ? 'Mark as pending' : 'Mark as complete'}
              className="shrink-0 disabled:opacity-50"
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--pa-accent-success)]" />
              ) : (
                <Circle className="h-5 w-5 text-muted hover:accent-violet" />
              )}
            </button>
          )}
          <div className="min-w-0">
            <p className={`truncate text-sm font-medium ${isCompleted ? 'text-muted line-through' : 'text-primary'}`}>
              {task.title}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              {createdTime && (
                <p className="flex items-center gap-1 text-xs text-muted">
                  <Clock className="h-3 w-3" />
                  {createdTime}
                </p>
              )}
              {task.source === 'roadmap-generated' && (
                <span className="rounded-full bg-[var(--pa-accent-blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--pa-accent-blue)]">
                  From Roadmap
                </span>
              )}
              {isAutoVerified && (
                <span className="flex items-center gap-1 rounded-full bg-accent-violet-soft px-2 py-0.5 text-[10px] font-semibold accent-violet">
                  <ShieldCheck className="h-3 w-3" />
                  Auto-verified via Mock Test
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isCompleted
                ? 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]'
                : 'bg-surface-secondary text-secondary'
            }`}
          >
            {isCompleted ? 'Completed' : 'Pending'}
          </span>
          <button
            onClick={startEditing}
            disabled={isPending}
            aria-label="Edit task"
            className="rounded-lg p-1.5 text-muted hover:bg-accent-violet-soft hover:accent-violet disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(task)}
            disabled={isPending}
            aria-label="Delete task"
            className="rounded-lg p-1.5 text-muted hover:bg-[var(--pa-accent-danger)]/10 hover:text-[var(--pa-accent-danger)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ContextAI
        module="tasks"
        context={{
          title: task.title,
          completed: task.completed,
          source: task.source,
        }}
        title={task.title}
      />
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
    <form onSubmit={handleSubmit} className="mb-4 rounded-2xl bg-surface-secondary p-3">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to get done?"
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
      {error && <p className="mt-2 text-xs font-medium text-[var(--pa-accent-danger)]">{error}</p>}
    </form>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [pendingTaskIds, setPendingTaskIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/tasks', { headers: getAuthHeaders() });
      setTasks(Array.isArray(res.data) ? res.data : res.data.tasks || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setLoadError('Could not load your tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      clearAuthAndRedirect();
      return;
    }
    fetchTasks();
  }, [fetchTasks]);

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
    } catch (err) {
      setLoadError('Could not delete that task. Please try again.');
      setTaskPending(id, false);
    }
  };

  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = tasks.length - completedTasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your tasks...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description={`${completedTasks} completed · ${pendingTasks} pending`}
      />

      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
          <span>{loadError}</span>
          <button type="button" onClick={fetchTasks} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      <section className="pa-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">All Tasks</h2>
          <button
            onClick={() => setIsAddingTask((prev) => !prev)}
            className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        <div className="mt-5">
          {isAddingTask && <AddTaskForm onSubmit={handleAddTask} onClose={() => setIsAddingTask(false)} />}

          {tasks.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Add one to get started."
              action={
                <button type="button" onClick={() => setIsAddingTask(true)} className="pa-btn-primary px-4 py-2 text-sm font-medium">
                  Add Task
                </button>
              }
            />
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
    </>
  );
}
