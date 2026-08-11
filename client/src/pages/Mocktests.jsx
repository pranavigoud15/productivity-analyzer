import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Trophy,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import ContextAI from '../components/assistant/ContextAI';

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

const DIFFICULTY_COLORS = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-rose-100 text-rose-700',
};

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

// 1. Test list card
function TestCard({ test, stats, onStart, onHistory }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{test.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{test.subject} · {test.topic}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_COLORS[test.difficulty]}`}>
          {test.difficulty}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
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
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            Best: {stats.bestPercentage}%
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onStart(test)}
          className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Start Test
        </button>
        {stats && stats.attemptCount > 0 && (
          <button
            onClick={() => onHistory(test)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-700">{test.title}</p>
          <p className="text-xs text-slate-400">{currentIndex + 1} / {totalQ}</p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold ${isTimeLow ? 'bg-rose-100 text-rose-700' : 'bg-violet-100 text-violet-700'}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="mb-1 text-xs font-medium text-slate-400">Question {currentIndex + 1} of {totalQ}</p>
        <p className="text-base font-semibold leading-relaxed text-slate-800">{question.questionText}</p>

        <div className="mt-5 space-y-3">
          {question.options.map((opt) => {
            const selected = answers[String(question._id)] === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => handleAnswer(opt.label)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-all ${
                  selected
                    ? 'border-violet-400 bg-violet-50 text-violet-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-300 hover:bg-violet-50/50'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-violet-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
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
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="text-xs text-slate-400">{answeredCount} / {totalQ} answered</span>

        {currentIndex < totalQ - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Submit
          </button>
        )}
      </div>

      {/* Question nav dots */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium text-slate-500">Jump to question</p>
        <div className="flex flex-wrap gap-2">
          {test.questions.map((q, i) => {
            const answered = answers[String(q._id)];
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                  i === currentIndex
                    ? 'bg-violet-600 text-white'
                    : answered
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
          <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Submit Test?</h3>
            <p className="mt-2 text-sm text-slate-500">
              You have answered <span className="font-semibold text-slate-700">{answeredCount}</span> of{' '}
              <span className="font-semibold text-slate-700">{totalQ}</span> questions.
              {totalQ - answeredCount > 0 && (
                <> <span className="text-amber-600 font-medium">{totalQ - answeredCount} unanswered</span> questions will be marked incorrect.</>
              )}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
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
      <div className={`rounded-3xl p-8 text-center ${isPassed ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black ${isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {attempt.percentage}%
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-800">{isPassed ? 'Well Done!' : 'Keep Practising!'}</h2>
        <p className="mt-1 text-sm text-slate-500">{attempt.title}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Correct', value: attempt.correctCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Incorrect', value: attempt.incorrectCount, icon: XCircle, color: 'text-rose-600 bg-rose-50' },
          { label: 'Unanswered', value: attempt.unansweredCount, icon: Circle, color: 'text-slate-500 bg-slate-50' },
          { label: 'Score', value: `${attempt.score}/${attempt.totalQuestions}`, icon: Trophy, color: 'text-violet-600 bg-violet-50' },
          { label: 'Time Taken', value: formatDuration(attempt.timeTakenSeconds), icon: Clock, color: 'text-sky-600 bg-sky-50' },
          { label: 'Difficulty', value: attempt.difficulty, icon: BarChart3, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
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
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-violet-500" />
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
                  ? 'border-emerald-100 bg-emerald-50/60'
                  : qr.selectedOption
                  ? 'border-rose-100 bg-rose-50/60'
                  : 'border-slate-100 bg-slate-50/60'
              }`}
            >
              <div className="flex items-start gap-2">
                {qr.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                )}
                <p className="text-sm font-medium text-slate-800">Q{i + 1}. {qr.questionText}</p>
              </div>

              <div className="mt-3 space-y-2">
                {qr.options.map((opt) => {
                  const isCorrect = opt.label === qr.correctOption;
                  const isSelected = opt.label === qr.selectedOption;
                  let cls = 'border-slate-200 bg-white text-slate-700';
                  if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                  else if (isSelected && !isCorrect) cls = 'border-rose-400 bg-rose-50 text-rose-800';

                  return (
                    <div key={opt.label} className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${cls}`}>
                      <span className="font-bold shrink-0">{opt.label}.</span>
                      {opt.text}
                      {isCorrect && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                      {isSelected && !isCorrect && <XCircle className="ml-auto h-3.5 w-3.5 shrink-0 text-rose-500" />}
                    </div>
                  );
                })}
              </div>

              {qr.explanation && (
                <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Explanation: </span>
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
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          All Tests
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
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
    return <div className="py-16 text-center text-sm text-slate-400">Loading history…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{test.title}</h2>
          <p className="text-xs text-slate-500">Attempt history</p>
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
            <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {attempts.map((a, i) => (
          <div key={a._id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Attempt {attempts.length - i} — {a.percentage}%
              </p>
              <p className="text-xs text-slate-400">
                {new Date(a.completedAt).toLocaleDateString()} · {a.correctCount}/{a.totalQuestions} correct · {formatDuration(a.timeTakenSeconds)}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.percentage >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {a.percentage >= 50 ? 'Pass' : 'Fail'}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onStart(test)}
        className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
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

  const [view, setView] = useState(VIEW.LIST);
  const [tests, setTests] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [activeTest, setActiveTest] = useState(null);       // full test with questions
  const [activeTestMeta, setActiveTestMeta] = useState(null); // list-level test object
  const [latestAttempt, setLatestAttempt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/mock-tests', { headers: getAuthHeaders() });
      const list = Array.isArray(res.data) ? res.data : [];
      setTests(list);
      // Fetch per-test stats in parallel (lightweight queries)
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
    } catch (err) {
      if (err.response?.status === 401) { clearAuthAndRedirect(); return; }
      setLoadError('Could not load mock tests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) { clearAuthAndRedirect(); return; }
    fetchTests();
  }, [fetchTests]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await API.post('/mock-tests/seed', {}, { headers: getAuthHeaders() });
      await fetchTests();
    } catch {
      setLoadError('Seed failed.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleStartTest = async (testMeta) => {
    try {
      const res = await API.get(`/mock-tests/${testMeta._id}`, { headers: getAuthHeaders() });
      setActiveTest(res.data);
      setActiveTestMeta(testMeta);
      setView(VIEW.TEST);
    } catch {
      setLoadError('Could not load test. Please try again.');
    }
  };

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

  const subjects = ['All', ...new Set(tests.map((t) => t.subject))];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const filteredTests = tests.filter((t) => {
    const subjectOk = filterSubject === 'All' || t.subject === filterSubject;
    const diffOk = filterDifficulty === 'All' || t.difficulty === filterDifficulty;
    return subjectOk && diffOk;
  });

  // ---- ACTIVE TEST VIEW ----
  if (view === VIEW.TEST && activeTest) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => { setView(VIEW.LIST); setActiveTest(null); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
        Loading mock tests…
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Mock Tests</h1>
          <p className="mt-1 text-slate-500">{tests.length} test{tests.length === 1 ? '' : 's'} available</p>
        </div>
        {tests.length === 0 && (
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isSeeding ? 'Loading…' : 'Load Sample Tests'}
          </button>
        )}
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{loadError}</span>
          <button onClick={fetchTests} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-red-100">
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      {tests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSubject(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${filterSubject === s ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {difficulties.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDifficulty(d)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${filterDifficulty === d ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Test grid */}
      {filteredTests.length === 0 && tests.length > 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No tests match the selected filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((t) => (
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

      {tests.length === 0 && !isLoading && !loadError && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">No mock tests yet.</p>
          <p className="mt-1 text-xs text-slate-400">Click "Load Sample Tests" to add pre-built tests.</p>
        </div>
      )}
    </>
  );
}