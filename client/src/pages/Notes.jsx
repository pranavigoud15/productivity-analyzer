import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2, Pin, PinOff } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';

function NoteCard({ note, isPending, onTogglePinned, onDelete }) {
  return (
    <li className={`rounded-2xl border p-4 ${note.pinned ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100 bg-slate-50/60'}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{note.title}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => onTogglePinned(note)}
            disabled={isPending}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            className={`rounded-lg p-1.5 disabled:opacity-50 ${
              note.pinned ? 'text-amber-500 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            {note.pinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDelete(note)}
            disabled={isPending}
            aria-label="Delete note"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {note.content && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{note.content}</p>}

      {note.tags && note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {tag}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function AddNoteForm({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({ title: trimmedTitle, content: content.trim(), tags });
      setTitle('');
      setContent('');
      setTagsInput('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save note. Please try again.');
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
        placeholder="Note title"
        disabled={isSubmitting}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Note content (optional)"
        disabled={isSubmitting}
        rows={3}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
      />
      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags, comma separated (optional)"
        disabled={isSubmitting}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add Note
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

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/notes', { headers: getAuthHeaders() });
      setNotes(Array.isArray(res.data) ? res.data : res.data.notes || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setLoadError('Could not load your notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      clearAuthAndRedirect();
      return;
    }
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async (payload) => {
    await API.post('/notes', payload, { headers: getAuthHeaders() });
    await fetchNotes();
  };

  const setPending = (id, isPending) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleTogglePinned = async (note) => {
    const id = note._id || note.id;
    setPending(id, true);
    try {
      await API.patch(`/notes/${id}`, { pinned: !note.pinned }, { headers: getAuthHeaders() });
      // Pinned state affects sort order, so refetch rather than just
      // patching the array in place — keeps pinned-first ordering correct.
      await fetchNotes();
    } catch (err) {
      setLoadError('Could not update that note. Please try again.');
    } finally {
      setPending(id, false);
    }
  };

  const handleDeleteNote = async (note) => {
    const id = note._id || note.id;
    setPending(id, true);
    try {
      await API.delete(`/notes/${id}`, { headers: getAuthHeaders() });
      setNotes((prev) => prev.filter((n) => (n._id || n.id) !== id));
    } catch (err) {
      setLoadError('Could not delete that note. Please try again.');
      setPending(id, false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your notes...
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Notes</h1>
        <p className="mt-1 text-slate-500">{notes.length} notes saved</p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <span>{loadError}</span>
          <button
            onClick={fetchNotes}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">All Notes</h2>
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Add Note
          </button>
        </div>

        <div className="mt-5">
          {isAdding && <AddNoteForm onSubmit={handleAddNote} onClose={() => setIsAdding(false)} />}

          {notes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No notes yet — add one to get started.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <NoteCard
                  key={note._id || note.id}
                  note={note}
                  isPending={pendingIds.has(note._id || note.id)}
                  onTogglePinned={handleTogglePinned}
                  onDelete={handleDeleteNote}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
