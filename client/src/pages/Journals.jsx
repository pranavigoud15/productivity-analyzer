import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2, Clock3, CalendarDays, BookOpen } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

const MOOD_META = {
  great: { emoji: '🤩', label: 'Great', color: 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]' },
  good: { emoji: '🙂', label: 'Good', color: 'bg-[var(--pa-accent-blue-soft)] text-[var(--pa-accent-blue)]' },
  okay: { emoji: '😐', label: 'Okay', color: 'bg-surface-secondary text-secondary' },
  low: { emoji: '😔', label: 'Low', color: 'bg-[var(--pa-accent-warning)]/10 text-[var(--pa-accent-warning)]' },
  stressed: { emoji: '😣', label: 'Stressed', color: 'bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]' },
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function JournalEntryCard({ entry, isPending, onDelete }) {
  const moodMeta = MOOD_META[entry.mood] || MOOD_META.okay;
  const formattedDate = entry.date
    ? new Date(entry.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <li className="rounded-2xl border border-subtle bg-surface-secondary p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-primary">{entry.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formattedDate}
              </span>
            )}
            {entry.studyHours > 0 && (
              <span className="flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {entry.studyHours}h studied
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${moodMeta.color}`}>
            <span>{moodMeta.emoji}</span>
            {moodMeta.label}
          </span>
          <button
            onClick={() => onDelete(entry)}
            disabled={isPending}
            aria-label="Delete journal entry"
            className="rounded-lg p-1.5 text-muted hover:bg-[var(--pa-accent-danger)]/10 hover:text-[var(--pa-accent-danger)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-secondary">{entry.content}</p>
    </li>
  );
}

function AddJournalForm({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('okay');
  const [studyHours, setStudyHours] = useState('');
  const [date, setDate] = useState(todayInputValue());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (!trimmedContent) {
      setError('Content is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title: trimmedTitle,
        content: trimmedContent,
        mood,
        studyHours: studyHours === '' ? 0 : Number(studyHours),
        date,
      });
      setTitle('');
      setContent('');
      setMood('okay');
      setStudyHours('');
      setDate(todayInputValue());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save journal entry. Please try again.');
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
        placeholder="Entry title"
        disabled={isSubmitting}
        className="pa-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind today?"
        disabled={isSubmitting}
        rows={4}
        className="pa-input w-full resize-none px-3 py-2 text-sm disabled:opacity-60"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          disabled={isSubmitting}
          className="pa-input px-3 py-2 text-sm disabled:opacity-60"
        >
          {Object.entries(MOOD_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.emoji} {meta.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.5"
          value={studyHours}
          onChange={(e) => setStudyHours(e.target.value)}
          placeholder="Study hours"
          disabled={isSubmitting}
          className="pa-input px-3 py-2 text-sm disabled:opacity-60"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isSubmitting}
          className="pa-input px-3 py-2 text-sm disabled:opacity-60"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save Entry
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

export default function Journals() {
  const [entries, setEntries] = useState([]);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/journals', { headers: getAuthHeaders() });
      setEntries(Array.isArray(res.data) ? res.data : res.data.entries || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setLoadError('Could not load your journal entries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      clearAuthAndRedirect();
      return;
    }
    fetchEntries();
  }, [fetchEntries]);

  const handleAddEntry = async (payload) => {
    await API.post('/journals', payload, { headers: getAuthHeaders() });
    await fetchEntries();
  };

  const setPending = (id, isPending) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDeleteEntry = async (entry) => {
    const id = entry._id || entry.id;
    setPending(id, true);
    try {
      await API.delete(`/journals/${id}`, { headers: getAuthHeaders() });
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== id));
    } catch (err) {
      setLoadError('Could not delete that entry. Please try again.');
      setPending(id, false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your journal...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Journal"
        description={`${entries.length} entries logged`}
      />

      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
          <span>{loadError}</span>
          <button type="button" onClick={fetchEntries} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      <section className="pa-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">All Entries</h2>
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </button>
        </div>

        <div className="mt-5">
          {isAdding && <AddJournalForm onSubmit={handleAddEntry} onClose={() => setIsAdding(false)} />}

          {entries.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No journal entries yet"
              description="Write your first one to start tracking your streak."
              action={
                <button type="button" onClick={() => setIsAdding(true)} className="pa-btn-primary px-4 py-2 text-sm font-medium">
                  New Entry
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <JournalEntryCard
                  key={entry._id || entry.id}
                  entry={entry}
                  isPending={pendingIds.has(entry._id || entry.id)}
                  onDelete={handleDeleteEntry}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
