import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  X,
  Loader2,
  Trash2,
  Pencil,
  Check,
  ShieldCheck,
  ListTodo,
  BookOpen,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import ContextAI from '../components/assistant/ContextAI';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

const RESOURCE_CATEGORIES = {
  official: 'Official Documentation',
  tutorial: 'Tutorial / Article',
  video: 'Video Tutorial',
  practice: 'Practice / Coding',
  other: 'Other',
};

function hasLinkedMockTest(task) {
  const mockTest = task?.mockTest;
  if (mockTest == null) return false;
  if (typeof mockTest === 'string') return mockTest.length > 0;
  if (typeof mockTest === 'object' && mockTest._id != null) return true;
  return Boolean(mockTest);
}

function getMockTestId(task) {
  if (!task?.mockTest) return null;
  return typeof task.mockTest === 'object' ? task.mockTest._id : task.mockTest;
}

function GuideSection({ title, items, paragraph }) {
  if (paragraph) {
    return (
      <div className="rounded-xl border border-subtle bg-surface-secondary p-3">
        <h4 className="text-sm font-semibold text-primary">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-secondary">{paragraph}</p>
      </div>
    );
  }
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border border-subtle bg-surface-secondary p-3">
      <h4 className="text-sm font-semibold text-primary">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function TaskGuide({ guide, loading, failed }) {
  if (loading) {
    return (
      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing your learning guide…
      </p>
    );
  }
  if (failed) {
    return (
      <p className="mt-2 flex items-center gap-2 text-sm text-[var(--pa-accent-danger)]">
        <AlertTriangle className="h-4 w-4" />
        Learning guide could not be generated. Please try again later.
      </p>
    );
  }
  if (!guide) return null;

  return (
    <div className="mt-3 space-y-3">
      <GuideSection title="Overview" paragraph={guide.overview} />
      <GuideSection title="What to Learn" items={guide.whatToLearn} />
      <GuideSection title="Key Concepts" items={guide.keyConcepts} />
      <GuideSection title="Learning Steps" items={guide.learningSteps} />
      <GuideSection title="Examples" items={guide.examples} />
      <GuideSection title="Practical Applications" items={guide.practicalApplications} />
      <GuideSection title="Common Mistakes" items={guide.commonMistakes} />
      <GuideSection title="Prerequisites" items={guide.prerequisites} />
      <GuideSection title="Practice Suggestions" items={guide.practiceSuggestions} />
      <GuideSection title="Expected Outcome" paragraph={guide.expectedOutcome} />
    </div>
  );
}

function TaskDetail({ taskId, onClose, onCompleted }) {
  const [task, setTask] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTask, setLoadingTask] = useState(true);
  const [error, setError] = useState('');

  const enrichmentLoading = task?.source === 'roadmap-generated'
    && ['pending', 'processing'].includes(task?.enrichmentStatus);

  const mockTestProcessing = hasLinkedMockTest(task)
    && task.mockTest?.generationStatus === 'processing';

  const fetchTask = useCallback(async () => {
    try {
      const response = await API.get(`/tasks/${taskId}`, { headers: getAuthHeaders() });
      setTask(response.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setError(err.response?.data?.message || 'Could not load task details.');
    } finally {
      setLoadingTask(false);
    }
  }, [taskId]);

  useEffect(() => {
    setLoadingTask(true);
    setAttempt(null);
    setAnswers([]);
    setResult(null);
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    if (!enrichmentLoading && !mockTestProcessing) return undefined;
    const interval = setInterval(fetchTask, 3000);
    return () => clearInterval(interval);
  }, [enrichmentLoading, mockTestProcessing, fetchTask]);

  const handleStartVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.post(`/tasks/${taskId}/verify/start`, {}, { headers: getAuthHeaders() });
      setAttempt(response.data);
      setAnswers(Array(response.data.questions.length).fill(''));
      setResult(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (answers.some((a) => !a)) {
      setError('Please answer all questions.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await API.post(
        `/tasks/${taskId}/verify/submit`,
        { attemptId: attempt.attemptId, answers },
        { headers: getAuthHeaders() }
      );
      setResult(response.data);
      if (response.data.passed) {
        await fetchTask();
        onCompleted?.();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit verification.');
    } finally {
      setLoading(false);
    }
  };

  const subtopics = task?.enrichmentMetadata?.subtopics || [];
  const resourcesByCategory = (task?.resources || []).reduce((acc, resource) => {
    const key = resource.category || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(resource);
    return acc;
  }, {});

  const mockTestId = getMockTestId(task);
  const mockTestMeta = typeof task?.mockTest === 'object' ? task.mockTest : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="pa-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden shadow-pa-lg">
        <div className="flex items-start justify-between gap-3 border-b border-subtle p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-primary">{task?.title || 'Task Details'}</h2>
            {task?.source === 'roadmap-generated' && (
              <span className="mt-1 inline-flex rounded-full bg-[var(--pa-accent-blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--pa-accent-blue)]">
                Roadmap Week
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted hover:bg-hover hover:text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loadingTask ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading week details…
            </div>
          ) : error && !task ? (
            <p className="text-sm text-[var(--pa-accent-danger)]">{error}</p>
          ) : task ? (
            <div className="space-y-5">
              {task.completed && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--pa-accent-success)]/30 bg-[var(--pa-accent-success-soft)] p-3 text-sm text-[var(--pa-accent-success)]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  This week&apos;s practice task is completed.
                </div>
              )}

              {task.description && (
                <section>
                  <h3 className="text-sm font-semibold text-primary">Learning Objective</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-secondary">{task.description}</p>
                </section>
              )}

              {subtopics.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-primary">Sub-topics</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {subtopics.map((topic) => (
                      <li
                        key={topic}
                        className="rounded-full bg-accent-violet-soft px-3 py-1 text-xs font-medium accent-violet"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <BookOpen className="h-4 w-4" />
                  Learning Resources
                </h3>
                {enrichmentLoading ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finding trusted resources for this week…
                  </p>
                ) : Object.keys(resourcesByCategory).length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No curated resources are available for this task yet.</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {Object.entries(resourcesByCategory).map(([category, items]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {RESOURCE_CATEGORIES[category] || category}
                        </p>
                        <ul className="mt-2 space-y-2">
                          {items.map((resource) => (
                            <li key={resource.url}>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 rounded-xl border border-subtle bg-surface-secondary p-3 text-sm transition hover:border-default hover:bg-hover"
                              >
                                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                                <span className="font-medium text-primary">{resource.title}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-primary">Learning Guide</h3>
                <TaskGuide
                  guide={task.learningGuide}
                  loading={enrichmentLoading}
                  failed={task.enrichmentStatus === 'failed'}
                />
              </section>

              {!task.completed && task.source === 'roadmap-generated' && (
                <section className="rounded-2xl border border-subtle bg-surface-secondary p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    Verification
                  </h3>

                  {hasLinkedMockTest(task) ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-secondary">
                        Complete the week-specific mock test to verify your learning and mark this task complete.
                      </p>
                      {mockTestMeta && (
                        <p className="text-xs text-muted">
                          {mockTestMeta.title} · {mockTestMeta.subject} · {mockTestMeta.topic}
                        </p>
                      )}
                      {mockTestProcessing ? (
                        <p className="flex items-center gap-2 text-sm text-muted">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating your verification test…
                        </p>
                      ) : mockTestMeta?.generationStatus === 'failed' ? (
                        <p className="text-sm text-[var(--pa-accent-danger)]">
                          Mock test generation failed. Please refresh or try again later.
                        </p>
                      ) : mockTestId ? (
                        <Link
                          to={`/mock-tests?startTestId=${mockTestId}`}
                          className="pa-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                        >
                          Start Verification Test
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  ) : enrichmentLoading ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing verification content…
                    </p>
                  ) : result ? (
                    <div className="mt-3 space-y-3">
                      <p className={`text-sm font-semibold ${result.passed ? 'text-[var(--pa-accent-success)]' : 'text-[var(--pa-accent-danger)]'}`}>
                        {result.message} Score: {result.score}/5 ({result.accuracy}%)
                      </p>
                      {!result.passed && (
                        <button
                          type="button"
                          onClick={() => { setAttempt(null); setResult(null); setAnswers([]); }}
                          className="pa-btn-secondary px-4 py-2 text-sm font-medium"
                        >
                          Try Again
                        </button>
                      )}
                    </div>
                  ) : attempt ? (
                    <div className="mt-3 space-y-4">
                      {attempt.questions.map((question, index) => (
                        <div key={question._id} className="rounded-xl border border-subtle bg-surface p-3">
                          <p className="text-sm font-medium text-primary">
                            {index + 1}. {question.questionText}
                          </p>
                          <div className="mt-2 space-y-2">
                            {question.options.map((opt) => (
                              <label
                                key={opt.label}
                                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition ${
                                  answers[index] === opt.label
                                    ? 'border-accent-violet bg-accent-violet-soft'
                                    : 'border-subtle hover:border-default'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q-${index}`}
                                  value={opt.label}
                                  checked={answers[index] === opt.label}
                                  onChange={() => {
                                    const next = [...answers];
                                    next[index] = opt.label;
                                    setAnswers(next);
                                  }}
                                  className="mt-1"
                                />
                                <span><span className="font-semibold">{opt.label}.</span> {opt.text}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleSubmitVerification}
                        disabled={loading}
                        className="pa-btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-60"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Submit Verification
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-sm text-secondary">
                        Answer 5 questions based on this week&apos;s learning content. Pass with 3/5 or higher.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartVerification}
                        disabled={loading || task.enrichmentStatus === 'failed'}
                        className="mt-3 pa-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-60"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Start Verification
                      </button>
                    </div>
                  )}
                </section>
              )}

              {error && <p className="text-sm text-[var(--pa-accent-danger)]">{error}</p>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task, isPending, onToggleComplete, onUpdate, onDelete, onOpenDetail }) {
  const isCompleted = Boolean(task.completed);
  const isAutoVerified = task.source === 'roadmap-generated' && task.mockTest;
  const isRoadmapTask = task.source === 'roadmap-generated';
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
            {isRoadmapTask ? (
              <button
                type="button"
                onClick={() => onOpenDetail?.(task)}
                className="block w-full truncate text-left text-sm font-medium text-primary hover:accent-violet"
              >
                {task.title}
              </button>
            ) : (
              <p className={`truncate text-sm font-medium ${isCompleted ? 'text-muted line-through' : 'text-primary'}`}>
                {task.title}
              </p>
            )}
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
          {isRoadmapTask && (
            <button
              type="button"
              onClick={() => onOpenDetail?.(task)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary hover:bg-accent-violet-soft hover:accent-violet"
            >
              Open
            </button>
          )}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [pendingTaskIds, setPendingTaskIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

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

  useEffect(() => {
    const verifyTaskId = searchParams.get('verifyTaskId');
    if (verifyTaskId) {
      setSelectedTaskId(verifyTaskId);
    }
  }, [searchParams]);

  const openTaskDetail = (task) => {
    const id = task._id || task.id;
    setSelectedTaskId(id);
    setSearchParams({ verifyTaskId: id });
  };

  const closeTaskDetail = () => {
    setSelectedTaskId(null);
    setSearchParams({});
  };

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
      if (selectedTaskId === id) closeTaskDetail();
    } catch (err) {
      setLoadError('Could not delete that task. Please try again.');
      setTaskPending(id, false);
    }
  };

  const handleTaskCompleted = () => {
    fetchTasks();
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
                  onOpenDetail={openTaskDetail}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={closeTaskDetail}
          onCompleted={handleTaskCompleted}
        />
      )}
    </>
  );
}
