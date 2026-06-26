import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// FocusContext — single source of truth for the timer across all pages.
// The timer interval lives here, not in FocusMode.jsx, so it survives
// page navigation. FloatingTimer and FocusMode.jsx both consume this
// context — neither owns the timer state.
//
// Future AI integration point: extend this context with:
//   - aiCoachMessage (string from AI Study Coach)
//   - productivityScore (from AI Productivity Coach)
//   - suggestedDuration (from AI-generated roadmap adjustments)
// The context shape is designed to accept those fields without refactoring
// the timer logic.
// ---------------------------------------------------------------------------

const FocusContext = createContext(null);

const STORAGE_KEY = 'focus_mode_state';

const DEFAULT_STATE = {
  isRunning: false,
  isPaused: false,
  timeLeft: 25 * 60,       // seconds
  totalDuration: 25 * 60,  // seconds — what the session was started with
  sessionCount: 0,
  totalFocusSeconds: 0,
  lastStartedAt: null,      // Date.now() when last started/resumed — for drift correction
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw);

    // If the timer was running when the page closed/refreshed, calculate
    // how many seconds have elapsed and subtract from timeLeft.
    if (saved.isRunning && saved.lastStartedAt) {
      const elapsed = Math.floor((Date.now() - saved.lastStartedAt) / 1000);
      const adjusted = saved.timeLeft - elapsed;

      if (adjusted <= 0) {
        // Session would have completed while the page was closed.
        return {
          ...saved,
          isRunning: false,
          isPaused: false,
          timeLeft: 0,
          lastStartedAt: null,
          sessionCount: saved.sessionCount + 1,
          totalFocusSeconds: saved.totalFocusSeconds + saved.timeLeft,
        };
      }

      return { ...saved, timeLeft: adjusted, lastStartedAt: Date.now() };
    }

    return saved;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently swallow — storage quota or private browsing.
  }
}

export function FocusProvider({ children }) {
  const [state, setStateRaw] = useState(() => loadFromStorage());
  const intervalRef = useRef(null);

  // Wrap setState so every mutation is also persisted.
  const setState = useCallback((updater) => {
    setStateRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(next);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Tick logic. Runs only when isRunning is true.
  // ---------------------------------------------------------------------------
  const tick = useCallback(() => {
    setState((prev) => {
      if (!prev.isRunning || prev.isPaused) return prev;

      const next = prev.timeLeft - 1;

      if (next <= 0) {
        // Session complete.
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          timeLeft: 0,
          lastStartedAt: null,
          sessionCount: prev.sessionCount + 1,
          totalFocusSeconds: prev.totalFocusSeconds + prev.totalDuration,
        };
      }

      return { ...prev, timeLeft: next };
    });
  }, [setState]);

  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => clearInterval(intervalRef.current);
  }, [state.isRunning, state.isPaused, tick]);

  // ---------------------------------------------------------------------------
  // Public actions.
  // ---------------------------------------------------------------------------
  const selectDuration = useCallback((minutes) => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      timeLeft: minutes * 60,
      totalDuration: minutes * 60,
      lastStartedAt: null,
    }));
  }, [setState]);

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      lastStartedAt: Date.now(),
    }));
  }, [setState]);

  const pause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: true,
      lastStartedAt: null,
    }));
  }, [setState]);

  const resume = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: false,
      lastStartedAt: Date.now(),
    }));
  }, [setState]);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      timeLeft: prev.totalDuration,
      lastStartedAt: null,
    }));
  }, [setState]);

  const clearStats = useCallback(() => {
    setState({
      ...DEFAULT_STATE,
      totalDuration: state.totalDuration,
      timeLeft: state.totalDuration,
    });
  }, [setState, state.totalDuration]);

  const value = {
    // State
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    timeLeft: state.timeLeft,
    totalDuration: state.totalDuration,
    sessionCount: state.sessionCount,
    totalFocusSeconds: state.totalFocusSeconds,

    // Derived
    progress: state.totalDuration > 0
      ? Math.max(0, (state.totalDuration - state.timeLeft) / state.totalDuration)
      : 0,
    totalFocusMinutes: Math.floor(state.totalFocusSeconds / 60),
    averageSessionMinutes: state.sessionCount > 0
      ? Math.round(state.totalFocusSeconds / 60 / state.sessionCount)
      : 0,

    // Actions
    selectDuration,
    start,
    pause,
    resume,
    reset,
    clearStats,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus must be used inside FocusProvider');
  return ctx;
}
