import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2, Pin, PinOff, Sparkles, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import ContextAI from '../components/assistant/ContextAI';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

function NoteCard({ note, isPending, onTogglePinned, onDelete }) {
  return (
    <li className={`rounded-2xl border p-4 ${note.pinned ? 'border-[var(--pa-accent-warning)]/40 bg-[var(--pa-accent-warning)]/10' : 'border-subtle bg-surface-secondary'}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 truncate text-sm font-semibold text-primary">{note.title}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => onTogglePinned(note)}
            disabled={isPending}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            className={`rounded-lg p-1.5 disabled:opacity-50 ${
              note.pinned ? 'text-[var(--pa-accent-warning)] hover:bg-[var(--pa-accent-warning)]/10' : 'text-muted hover:bg-hover hover:text-secondary'
            }`}
          >
            {note.pinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDelete(note)}
            disabled={isPending}
            aria-label="Delete note"
            className="rounded-lg p-1.5 text-muted hover:bg-[var(--pa-accent-danger)]/10 hover:text-[var(--pa-accent-danger)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {note.content && <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{note.content}</p>}

      {note.tags && note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent-violet-soft px-2.5 py-0.5 text-xs font-medium accent-violet">
              {tag}
            </span>
          ))}
        </div>
      )}

      <ContextAI
        module="notes"
        context={{ title: note.title, content: note.content, tags: note.tags }}
        title={note.title}
      />
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
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-2xl bg-surface-secondary p-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
        disabled={isSubmitting}
        className="pa-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Note content (optional)"
        disabled={isSubmitting}
        rows={3}
        className="pa-input w-full resize-none px-3 py-2 text-sm disabled:opacity-60"
      />
      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags, comma separated (optional)"
        disabled={isSubmitting}
        className="pa-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add Note
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

function AIGeneratorPanel({ onSave, onClose }) {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [editableTags, setEditableTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;

    setIsGenerating(true);
    setGenerateError('');
    setGenerated(null);
    try {
      const res = await API.post(
        '/ai/generate-note',
        { topic: trimmed },
        { headers: getAuthHeaders() }
      );
      const data = res.data;
      setGenerated(data);
      setEditableTitle(data.title);
      setEditableContent(data.content);
      setEditableTags(Array.isArray(data.tags) ? data.tags.join(', ') : '');
    } catch (err) {
      setGenerateError(err.response?.data?.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const trimmedTitle = editableTitle.trim();
    if (!trimmedTitle) {
      setSaveError('Title cannot be empty.');
      return;
    }
    const tags = editableTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSaving(true);
    setSaveError('');
    try {
      await onSave({ title: trimmedTitle, content: editableContent.trim(), tags });
      onClose();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save note. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-default bg-accent-violet-soft p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold accent-violet">
          <Sparkles className="h-4 w-4" />
          AI Note Generator
        </p>
        <button
          onClick={onClose}
          aria-label="Close generator"
          className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleGenerate} className="flex items-center gap-2">
        <input
          autoFocus
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g. Java, React, Data Structures)"
          disabled={isGenerating || isSaving}
          className="pa-input flex-1 px-3 py-2 text-sm disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isGenerating || !topic.trim() || isSaving}
          className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
        >
          {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isGenerating ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {generateError && <p className="text-xs font-medium text-[var(--pa-accent-danger)]">{generateError}</p>}

      {generated && (
        <div className="space-y-3 rounded-xl border border-default bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Preview &amp; Edit
            </p>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-accent-violet-soft px-2.5 py-0.5 text-[11px] font-semibold accent-violet">
                {generated.generatedBy}
              </span>
              <button
                onClick={() => setIsPreviewExpanded((p) => !p)}
                className="text-muted hover:text-secondary"
                aria-label={isPreviewExpanded ? 'Collapse preview' : 'Expand preview'}
              >
                {isPreviewExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {isPreviewExpanded && (
            <div className="space-y-3">
              <input
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                disabled={isSaving}
                className="pa-input w-full px-3 py-2 text-sm font-semibold disabled:opacity-60"
              />
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                disabled={isSaving}
                rows={12}
                className="pa-input w-full resize-y px-3 py-2 text-sm disabled:opacity-60"
              />
              <input
                value={editableTags}
                onChange={(e) => setEditableTags(e.target.value)}
                placeholder="Tags, comma separated"
                disabled={isSaving}
                className="pa-input w-full px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
          )}

          {saveError && <p className="text-xs font-medium text-[var(--pa-accent-danger)]">{saveError}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !editableTitle.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--pa-accent-success)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Note
            </button>
            <button
              onClick={() => {
                setGenerated(null);
                setTopic('');
                setGenerateError('');
                setSaveError('');
              }}
              disabled={isSaving}
              className="pa-btn-secondary px-3 py-2 text-sm disabled:opacity-60"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your notes...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Notes"
        description={`${notes.length} notes saved`}
      />

      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
          <span>{loadError}</span>
          <button type="button" onClick={fetchNotes} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      <section className="pa-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">All Notes</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGenerating((prev) => !prev)}
              className="pa-btn-secondary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold accent-violet"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
            <button
              onClick={() => setIsAdding((prev) => !prev)}
              className="pa-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add Note
            </button>
          </div>
        </div>

        <div className="mt-5">
          {isGenerating && (
            <AIGeneratorPanel
              onSave={handleAddNote}
              onClose={() => setIsGenerating(false)}
            />
          )}
          {isAdding && <AddNoteForm onSubmit={handleAddNote} onClose={() => setIsAdding(false)} />}

          {notes.length === 0 ? (
            <EmptyState
              icon={StickyNote}
              title="No notes yet"
              description="Add one to get started."
              action={
                <button type="button" onClick={() => setIsAdding(true)} className="pa-btn-primary px-4 py-2 text-sm font-medium">
                  Add Note
                </button>
              }
            />
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
