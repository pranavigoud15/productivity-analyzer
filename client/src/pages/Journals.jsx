import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2, Clock3, CalendarDays } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';

const MOOD_META = {
  great: { emoji: '🤩', label: 'Great', color: 'bg-emerald-100 text-emerald-700' },
  good: { emoji: '🙂', label: 'Good', color: 'bg-sky-100 text-sky-700' },
  okay: { emoji: '😐', label: 'Okay', color: 'bg-slate-100 text-slate-600' },
  low: { emoji: '😔', label: 'Low', color: 'bg-amber-100 text-amber-700' },
  stressed: { emoji: '😣', label: 'Stressed', color: 'bg-rose-100 text-rose-700' },
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
    <li className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-700">{entry.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
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
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{entry.content}</p>
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
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-2xl bg-slate-50 p-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Entry title"
        disabled={isSubmitting}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind today?"
        disabled={isSubmitting}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
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
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save Entry
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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your journal...
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Journal</h1>
        <p className="mt-1 text-slate-500">{entries.length} entries logged</p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <span>{loadError}</span>
          <button
            onClick={fetchEntries}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">All Entries</h2>
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </button>
        </div>

        <div className="mt-5">
          {isAdding && <AddJournalForm onSubmit={handleAddEntry} onClose={() => setIsAdding(false)} />}

          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No journal entries yet — write your first one to start tracking your streak.
            </p>
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
