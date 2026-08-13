import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Trophy,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  BookOpen,
  Loader2,
  Sparkles,
} from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import ContextAI from '../components/assistant/ContextAI';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

const QUESTION_COUNTS = [5, 10, 15, 30];
const DIFFICULTY_OPTIONS = ['Adaptive', 'Easy', 'Medium', 'Hard'];

const DIFFICULTY_COLORS = {
  Easy: 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]',
  Medium: 'bg-[var(--pa-accent-warning)]/10 text-[var(--pa-accent-warning)]',
  Hard: 'bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]',
};

function SelectorGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              value === option
                ? 'bg-accent-violet text-white'
                : 'bg-surface-secondary text-secondary hover:bg-accent-violet-soft accent-violet'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function AttemptHistoryRow({ attempt, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(attempt)}
      className="flex w-full items-center justify-between rounded-xl border border-subtle bg-surface-secondary p-3 text-left transition hover:border-default hover:bg-hover"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-primary">{attempt.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {new Date(attempt.completedAt).toLocaleDateString()} · {attempt.difficulty} · {attempt.correctCount}/{attempt.totalQuestions} correct
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        attempt.percentage >= 60
          ? 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]'
          : 'bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]'
      }`}>
        {attempt.percentage}%
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pad(n) {
  return String(n).padStart(2, '0');
}
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

// 1. Test list card
function TestCard({ test, stats, onStart, onHistory }) {
  return (
    <div className="pa-card p-5 transition-shadow hover:shadow-pa-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-primary">{test.title}</p>
          <p className="mt-0.5 text-xs text-secondary">{test.subject} · {test.topic}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_COLORS[test.difficulty]}`}>
          {test.difficulty}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-secondary">
        <span className="flex items-center gap-1">
          <ClipboardList className="h-3.5 w-3.5" />
          {test.totalQuestions} questions
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {test.durationMinutes} min
        </span>
        {stats && (
          <span className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-[var(--pa-accent-warning)]" />
            Best: {stats.bestPercentage}%
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onStart(test)}
          className="flex-1 pa-btn-primary py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Start Test
        </button>
        {stats && stats.attemptCount > 0 && (
          <button
            onClick={() => onHistory(test)}
            className="pa-btn-secondary px-3 py-2 text-sm font-medium"
          >
            History
          </button>
        )}
      </div>
    </div>
  );
}

// 2. Active test view
function ActiveTest({ test, onSubmit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(test.durationMinutes * 60);
  const [showConfirm, setShowConfirm] = useState(false);
  const startedAt = useRef(Date.now());
  const totalDuration = test.durationMinutes * 60;

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const question = test.questions[currentIndex];
  const totalQ = test.questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (currentIndex + 1) / totalQ;
  const isTimeLow = timeLeft <= 60;

  const handleAnswer = (label) => {
    setAnswers((prev) => ({ ...prev, [String(question._id)]: label }));
  };

  const handleSubmit = (auto = false) => {
    const timeTaken = Math.round((Date.now() - startedAt.current) / 1000);
    onSubmit({ answers, startedAt: startedAt.current, timeTakenSeconds: timeTaken, auto });
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="pa-card flex items-center justify-between px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-secondary">{test.title}</p>
          <p className="text-xs text-muted">{currentIndex + 1} / {totalQ}</p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold ${isTimeLow ? 'bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]' : 'bg-accent-violet-soft accent-violet'}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="h-full rounded-full bg-accent-violet transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="pa-card p-6">
        <p className="mb-1 text-xs font-medium text-muted">Question {currentIndex + 1} of {totalQ}</p>
        <p className="text-base font-semibold leading-relaxed text-primary">{question.questionText}</p>

        <div className="mt-5 space-y-3">
          {question.options.map((opt) => {
            const selected = answers[String(question._id)] === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => handleAnswer(opt.label)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-all ${
                  selected
                    ? 'border-[var(--pa-accent-violet)] bg-accent-violet-soft text-primary'
                    : 'border-default bg-surface-secondary text-secondary hover:border-[var(--pa-accent-violet)] hover:bg-accent-violet-soft'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-accent-violet text-white' : 'bg-surface border border-default text-secondary'}`}>
                  {opt.label}
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 rounded-xl border border-default px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-secondary disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="text-xs text-muted">{answeredCount} / {totalQ} answered</span>

        {currentIndex < totalQ - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex items-center gap-1.5 pa-btn-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--pa-accent-success)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Submit
          </button>
        )}
      </div>

      {/* Question nav dots */}
      <div className="pa-card p-4">
        <p className="mb-2 text-xs font-medium text-secondary">Jump to question</p>
        <div className="flex flex-wrap gap-2">
          {test.questions.map((q, i) => {
            const answered = answers[String(q._id)];
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                  i === currentIndex
                    ? 'bg-accent-violet text-white'
                    : answered
                    ? 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]'
                    : 'bg-surface-secondary text-secondary hover:bg-hover'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="pa-card-elevated mx-4 w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-primary">Submit Test?</h3>
            <p className="mt-2 text-sm text-secondary">
              You have answered <span className="font-semibold text-secondary">{answeredCount}</span> of{' '}
              <span className="font-semibold text-secondary">{totalQ}</span> questions.
              {totalQ - answeredCount > 0 && (
                <> <span className="font-medium text-[var(--pa-accent-warning)]">{totalQ - answeredCount} unanswered</span> questions will be marked incorrect.</>
              )}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-default py-2 text-sm font-medium text-secondary hover:bg-surface-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                className="flex-1 rounded-xl bg-[var(--pa-accent-success)] py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Results view
function ResultsView({ attempt, onRetry, onBack }) {
  const [showReview, setShowReview] = useState(false);
  const isPassed = attempt.percentage >= 50;

  return (
    <div className="space-y-6">
      {/* Score banner */}
      <div className={`rounded-3xl border p-8 text-center ${isPassed ? 'border-[var(--pa-accent-success)]/30 bg-[var(--pa-accent-success-soft)]' : 'border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10'}`}>
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black ${isPassed ? 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]' : 'bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]'}`}>
          {attempt.percentage}%
        </div>
        <h2 className="mt-4 text-2xl font-bold text-primary">{isPassed ? 'Well Done!' : 'Keep Practising!'}</h2>
        <p className="mt-1 text-sm text-secondary">{attempt.title}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Correct', value: attempt.correctCount, icon: CheckCircle2, color: 'text-[var(--pa-accent-success)] bg-[var(--pa-accent-success-soft)]' },
          { label: 'Incorrect', value: attempt.incorrectCount, icon: XCircle, color: 'text-[var(--pa-accent-danger)] bg-[var(--pa-accent-danger)]/10' },
          { label: 'Unanswered', value: attempt.unansweredCount, icon: Circle, color: 'text-secondary bg-surface-secondary' },
          { label: 'Score', value: `${attempt.score}/${attempt.totalQuestions}`, icon: Trophy, color: 'accent-violet bg-accent-violet-soft' },
          { label: 'Time Taken', value: formatDuration(attempt.timeTakenSeconds), icon: Clock, color: 'text-[var(--pa-accent-blue)] bg-[var(--pa-accent-blue-soft)]' },
          { label: 'Difficulty', value: attempt.difficulty, icon: BarChart3, color: 'text-[var(--pa-accent-warning)] bg-[var(--pa-accent-warning)]/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="pa-card p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-primary">{value}</p>
            <p className="text-xs text-secondary">{label}</p>
          </div>
        ))}
      </div>

      <ContextAI
        module="mocktests"
        context={{
          title: attempt.title,
          percentage: attempt.percentage,
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          correctCount: attempt.correctCount,
          incorrectCount: attempt.incorrectCount,
          unansweredCount: attempt.unansweredCount,
          difficulty: attempt.difficulty,
          timeTakenSeconds: attempt.timeTakenSeconds,
        }}
        title={attempt.title}
      />

      {/* Answer review toggle */}
      <button
        onClick={() => setShowReview((v) => !v)}
        className="pa-btn-secondary flex w-full items-center justify-between px-5 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 accent-violet" />
          {showReview ? 'Hide' : 'Show'} Answers &amp; Explanations
        </span>
        <ChevronRight className={`h-4 w-4 transition-transform ${showReview ? 'rotate-90' : ''}`} />
      </button>

      {showReview && (
        <div className="space-y-4">
          {attempt.questionResults.map((qr, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-5 ${
                qr.isCorrect
                  ? 'border-[var(--pa-accent-success)]/30 bg-[var(--pa-accent-success-soft)]'
                  : qr.selectedOption
                  ? 'border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10'
                  : 'border-subtle bg-surface-secondary'
              }`}
            >
              <div className="flex items-start gap-2">
                {qr.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pa-accent-success)]" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pa-accent-danger)]" />
                )}
                <p className="text-sm font-medium text-primary">Q{i + 1}. {qr.questionText}</p>
              </div>

              <div className="mt-3 space-y-2">
                {qr.options.map((opt) => {
                  const isCorrect = opt.label === qr.correctOption;
                  const isSelected = opt.label === qr.selectedOption;
                  let cls = 'border-default bg-surface text-secondary';
                  if (isCorrect) cls = 'border-[var(--pa-accent-success)] bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]';
                  else if (isSelected && !isCorrect) cls = 'border-[var(--pa-accent-danger)] bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]';

                  return (
                    <div key={opt.label} className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${cls}`}>
                      <span className="font-bold shrink-0">{opt.label}.</span>
                      {opt.text}
                      {isCorrect && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--pa-accent-success)]" />}
                      {isSelected && !isCorrect && <XCircle className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--pa-accent-danger)]" />}
                    </div>
                  );
                })}
              </div>

              {qr.explanation && (
                <div className="mt-3 rounded-xl bg-surface/70 px-3 py-2 text-xs text-secondary">
                  <span className="font-semibold text-secondary">Explanation: </span>
                  {qr.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="pa-btn-secondary flex-1 py-2.5 text-sm font-medium"
        >
          All Tests
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 pa-btn-primary py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

// 4. History view for a specific test
function HistoryView({ test, onBack, onStart }) {
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [attRes, statRes] = await Promise.all([
        API.get('/mock-tests/attempts', { headers: getAuthHeaders() }),
        API.get(`/mock-tests/${test._id}/stats`, { headers: getAuthHeaders() }),
      ]);
      const all = Array.isArray(attRes.data) ? attRes.data : [];
      setAttempts(all.filter((a) => String(a.mockTest) === String(test._id)));
      setStats(statRes.data);
      setIsLoading(false);
    };
    load();
  }, [test._id]);

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted">Loading history…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="pa-btn-secondary p-2">
          <ChevronLeft className="h-4 w-4 text-secondary" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-primary">{test.title}</h2>
          <p className="text-xs text-secondary">Attempt history</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Attempts', value: stats.attemptCount },
            { label: 'Best Score', value: stats.bestPercentage != null ? `${stats.bestPercentage}%` : '—' },
            { label: 'Average', value: stats.averagePercentage != null ? `${stats.averagePercentage}%` : '—' },
            { label: 'Latest', value: stats.latestAttempt ? `${stats.latestAttempt.percentage}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="pa-card p-4 text-center">
              <p className="text-xl font-bold text-primary">{value}</p>
              <p className="text-xs text-secondary">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {attempts.map((a, i) => (
          <div key={a._id} className="pa-card flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-secondary">
                Attempt {attempts.length - i} — {a.percentage}%
              </p>
              <p className="text-xs text-muted">
                {new Date(a.completedAt).toLocaleDateString()} · {a.correctCount}/{a.totalQuestions} correct · {formatDuration(a.timeTakenSeconds)}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.percentage >= 50 ? 'bg-[var(--pa-accent-success-soft)] text-[var(--pa-accent-success)]' : 'bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]'}`}>
              {a.percentage >= 50 ? 'Pass' : 'Fail'}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onStart(test)}
        className="w-full pa-btn-primary py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Start New Attempt
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MockTests() {
  const VIEW = { LIST: 'list', TEST: 'test', RESULTS: 'results', HISTORY: 'history' };
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingStartTestId = searchParams.get('startTestId');
  const autoStartHandled = useRef(false);

  const [view, setView] = useState(VIEW.LIST);
  const [roadmapTests, setRoadmapTests] = useState([]);
  const [dailyTests, setDailyTests] = useState([]);
  const [sampleTests, setSampleTests] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [activeTestMeta, setActiveTestMeta] = useState(null);
  const [latestAttempt, setLatestAttempt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCreatingDaily, setIsCreatingDaily] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('Adaptive');
  const [showSampleTests, setShowSampleTests] = useState(false);
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');

  const loadStatsForTests = useCallback(async (list) => {
    if (!list.length) {
      setStatsMap({});
      return;
    }
    const statResults = await Promise.allSettled(
      list.map((t) => API.get(`/mock-tests/${t._id}/stats`, { headers: getAuthHeaders() }))
    );
    const map = {};
    list.forEach((t, i) => {
      if (statResults[i].status === 'fulfilled') {
        map[t._id] = statResults[i].value.data;
      }
    });
    setStatsMap(map);
  }, []);

  const fetchRecentAttempts = useCallback(async () => {
    try {
      const res = await API.get('/mock-tests/attempts', { headers: getAuthHeaders() });
      const list = Array.isArray(res.data) ? res.data : [];
      setRecentAttempts(list.slice(0, 8));
    } catch {
      setRecentAttempts([]);
    }
  }, []);

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/mock-tests', { headers: getAuthHeaders() });
      const data = res.data || {};
      const roadmap = data.roadmapVerification || [];
      const daily = data.dailyAssessments || [];
      const samples = data.sampleTests || [];
      setRoadmapTests(roadmap);
      setDailyTests(daily);
      setSampleTests(samples);
      await loadStatsForTests([...roadmap, ...daily, ...samples]);
      await fetchRecentAttempts();
    } catch (err) {
      if (err.response?.status === 401) { clearAuthAndRedirect(); return; }
      setLoadError('Could not load mock tests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [loadStatsForTests, fetchRecentAttempts]);

  useEffect(() => {
    if (!localStorage.getItem('token')) { clearAuthAndRedirect(); return; }
    fetchTests();
  }, [fetchTests]);

  const handleStartTest = async (testMeta) => {
    try {
      const res = await API.get(`/mock-tests/${testMeta._id}`, { headers: getAuthHeaders() });
      setActiveTest(res.data);
      setActiveTestMeta(testMeta);
      setView(VIEW.TEST);
      if (searchParams.get('startTestId')) {
        setSearchParams({});
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Could not load test. Please try again.';
      setLoadError(message);
    }
  };

  const handleStartDailyAssessment = async () => {
    setIsCreatingDaily(true);
    setLoadError('');
    try {
      const res = await API.post(
        '/mock-tests/daily-assessment',
        { questionCount, difficulty },
        { headers: getAuthHeaders() }
      );
      const created = res.data.test;
      await fetchTests();
      await handleStartTest(created);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not create daily assessment.';
      setLoadError(message);
    } finally {
      setIsCreatingDaily(false);
    }
  };

  const handleOpenAttempt = async (attempt) => {
    try {
      const res = await API.get(`/mock-tests/attempts/${attempt._id}`, { headers: getAuthHeaders() });
      setLatestAttempt(res.data);
      setActiveTestMeta({ _id: attempt.mockTest, title: attempt.title });
      setView(VIEW.RESULTS);
    } catch {
      setLoadError('Could not load attempt details.');
    }
  };
  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await API.post('/mock-tests/seed', {}, { headers: getAuthHeaders() });
      await fetchTests();
      setShowSampleTests(true);
    } catch {
      setLoadError('Seed failed.');
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (!pendingStartTestId || isLoading || autoStartHandled.current) return;
    const listed = [...roadmapTests, ...dailyTests, ...sampleTests];
    const testMeta = listed.find((t) => String(t._id) === String(pendingStartTestId));
    if (!testMeta) return;
    autoStartHandled.current = true;

    (async () => {
      try {
        const res = await API.get(`/mock-tests/${testMeta._id}`, { headers: getAuthHeaders() });
        setActiveTest(res.data);
        setActiveTestMeta(testMeta);
        setView(VIEW.TEST);
        setSearchParams({});
      } catch (err) {
        const message = err.response?.data?.message || 'Could not load test. Please try again.';
        setLoadError(message);
      }
    })();
  }, [pendingStartTestId, isLoading, roadmapTests, dailyTests, sampleTests, setSearchParams]);

  const handleSubmit = async ({ answers, startedAt, timeTakenSeconds }) => {
    try {
      const res = await API.post(
        `/mock-tests/${activeTest._id}/submit`,
        { answers, startedAt, timeTakenSeconds },
        { headers: getAuthHeaders() }
      );
      setLatestAttempt(res.data);
      setView(VIEW.RESULTS);
      fetchTests(); // refresh stats
    } catch {
      setLoadError('Submission failed. Please try again.');
    }
  };

  const filteredSampleTests = sampleTests.filter((t) => {
    const subjectOk = filterSubject === 'All' || t.subject === filterSubject;
    const diffOk = filterDifficulty === 'All' || t.difficulty === filterDifficulty;
    return subjectOk && diffOk;
  });

  const sampleSubjects = ['All', ...new Set(sampleTests.map((t) => t.subject))];
  const sampleDifficulties = ['All', 'Easy', 'Medium', 'Hard'];

  // ---- ACTIVE TEST VIEW ----
  if (view === VIEW.TEST && activeTest) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => { setView(VIEW.LIST); setActiveTest(null); }}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
          Exit test
        </button>
        <ActiveTest test={activeTest} onSubmit={handleSubmit} />
      </div>
    );
  }

  // ---- RESULTS VIEW ----
  if (view === VIEW.RESULTS && latestAttempt) {
    return (
      <ResultsView
        attempt={latestAttempt}
        onBack={() => setView(VIEW.LIST)}
        onRetry={() => handleStartTest(activeTestMeta)}
      />
    );
  }

  // ---- HISTORY VIEW ----
  if (view === VIEW.HISTORY && activeTestMeta) {
    return (
      <HistoryView
        test={activeTestMeta}
        onBack={() => setView(VIEW.LIST)}
        onStart={handleStartTest}
      />
    );
  }

  // ---- LIST VIEW ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-default border-t-[var(--pa-accent-violet)]" />
        Loading mock tests…
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Mock Tests"
        description="Daily assessments from your tasks · roadmap verification tests"
      />

      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{loadError}</span>
          <button type="button" onClick={fetchTests} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      <section className="pa-card p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-accent-violet-soft p-2.5">
            <Sparkles className="h-5 w-5 accent-violet" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-primary">Daily Assessment</h2>
            <p className="mt-1 text-sm text-secondary">
              Generate a personalized test from your goals, tasks, learning guides, resources, and notes.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <SelectorGroup
            label="Questions"
            options={QUESTION_COUNTS}
            value={questionCount}
            onChange={setQuestionCount}
          />
          <SelectorGroup
            label="Difficulty"
            options={DIFFICULTY_OPTIONS}
            value={difficulty}
            onChange={setDifficulty}
          />
        </div>

        <button
          type="button"
          onClick={handleStartDailyAssessment}
          disabled={isCreatingDaily}
          className="mt-5 pa-btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:px-6"
        >
          {isCreatingDaily ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isCreatingDaily ? 'Generating assessment…' : 'Start Daily Assessment'}
        </button>
      </section>

      {roadmapTests.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Roadmap Verification Tests</h2>
            <p className="mt-1 text-sm text-secondary">Week-specific verification tests linked to your learning roadmap.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roadmapTests.map((t) => (
              <TestCard
                key={t._id}
                test={t}
                stats={statsMap[t._id]}
                onStart={handleStartTest}
                onHistory={(test) => { setActiveTestMeta(test); setView(VIEW.HISTORY); }}
              />
            ))}
          </div>
        </section>
      )}

      {recentAttempts.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Recent Assessment History</h2>
            <p className="mt-1 text-sm text-secondary">Your latest mock test attempts.</p>
          </div>
          <div className="space-y-2">
            {recentAttempts.map((attempt) => (
              <AttemptHistoryRow key={attempt._id} attempt={attempt} onOpen={handleOpenAttempt} />
            ))}
          </div>
        </section>
      )}

      {(sampleTests.length > 0 || !roadmapTests.length) && (
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setShowSampleTests((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-subtle bg-surface-secondary px-4 py-3 text-left"
          >
            <div>
              <h2 className="text-sm font-bold text-primary">Sample / Demo Tests</h2>
              <p className="mt-0.5 text-xs text-muted">Optional pre-built subject tests for practice.</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted transition-transform ${showSampleTests ? 'rotate-180' : ''}`} />
          </button>

          {showSampleTests && (
            <>
              {sampleTests.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No sample tests loaded"
                  description="Load demo tests for optional practice."
                  action={
                    <button type="button" onClick={handleSeed} disabled={isSeeding} className="pa-btn-secondary px-4 py-2 text-sm font-medium disabled:opacity-60">
                      {isSeeding ? 'Loading…' : 'Load Sample Tests'}
                    </button>
                  }
                />
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {sampleSubjects.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFilterSubject(s)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${filterSubject === s ? 'bg-accent-violet text-white' : 'bg-surface-secondary text-secondary hover:bg-accent-violet-soft accent-violet'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sampleDifficulties.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFilterDifficulty(d)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${filterDifficulty === d ? 'bg-accent-violet text-white' : 'bg-surface-secondary text-secondary hover:bg-accent-violet-soft accent-violet'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredSampleTests.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">No sample tests match the selected filters.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredSampleTests.map((t) => (
                        <TestCard
                          key={t._id}
                          test={t}
                          stats={statsMap[t._id]}
                          onStart={handleStartTest}
                          onHistory={(test) => { setActiveTestMeta(test); setView(VIEW.HISTORY); }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}