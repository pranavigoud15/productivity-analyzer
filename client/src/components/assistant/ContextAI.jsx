import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import api from "../../services/api";
import { clearAuthAndRedirect } from "../../utils/auth";

const MODULE_ACTIONS = {
  notes: [
    { label: "Explain", prompt: "Explain this note in simple, clear terms." },
    { label: "Summarize", prompt: "Summarize this note in 3-5 sentences." },
    { label: "Key Points", prompt: "List the most important key points from this note." },
    { label: "Flashcards", prompt: "Generate 5 flashcard question-and-answer pairs from this note." },
    { label: "Quiz Me", prompt: "Create a 5-question quiz based on this note with answers." },
  ],
  tasks: [
    { label: "Prioritize", prompt: "Help me understand how to prioritize this task effectively." },
    { label: "Break into subtasks", prompt: "Break this task into smaller, actionable subtasks." },
    { label: "Estimate time", prompt: "Estimate the realistic time required to complete this task." },
  ],
  goals: [
    { label: "Improve goal", prompt: "Suggest improvements to make this goal clearer and more achievable using SMART criteria." },
    { label: "Generate milestones", prompt: "Generate 5 actionable milestones to achieve this goal." },
  ],
  roadmaps: [
    { label: "Next topic", prompt: "Recommend the next topic I should study based on this roadmap progress." },
  ],
  mocktests: [
    { label: "Explain mistakes", prompt: "Analyze the mistakes in this test attempt and explain how to fix them." },
    { label: "Study plan", prompt: "Create a targeted study plan based on this test performance." },
  ],
  insights: [
    { label: "Explain analytics", prompt: "Explain these productivity analytics in simple terms and suggest improvements." },
  ],
};

function SuggestionChips({ suggestions, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="w-full text-xs text-muted">Follow-up suggestions:</span>
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="flex items-center gap-1 rounded-full border border-default bg-surface px-3 py-1 text-xs accent-violet transition-colors hover:bg-accent-violet-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={10} />
          {s}
        </button>
      ))}
    </div>
  );
}

export default function ContextAI({ module, context, title }) {
  const [result, setResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const actions = MODULE_ACTIONS[module?.toLowerCase()] || [];

  if (actions.length === 0) return null;

  const handleAction = async (action) => {
    if (loading) return;
    setLoading(true);
    setActiveAction(action.label);
    setError(null);
    setResult(null);
    setSuggestions([]);

    const enrichedContext = title
      ? { title, ...context }
      : context;

    try {
      const { data } = await api.post("/assistant/chat", {
        message: action.prompt,
        module: module.toLowerCase(),
        context: enrichedContext,
      });

      if (!data.success) {
        throw new Error(data.message || "Unknown error");
      }

      setResult(data.reply);
      setSuggestions(data.suggestions || []);
      setExpanded(true);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setError(
        err.response?.data?.message ||
          "Failed to get AI response. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (suggestion) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const enrichedContext = title ? { title, ...context } : context;

    try {
      const { data } = await api.post("/assistant/chat", {
        message: suggestion,
        module: module.toLowerCase(),
        context: enrichedContext,
      });

      if (!data.success) throw new Error(data.message || "Unknown error");

      setResult(data.reply);
      setSuggestions(data.suggestions || []);
      setExpanded(true);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setError(
        err.response?.data?.message ||
          "Failed to get AI response. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
    setSuggestions([]);
    setActiveAction(null);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-default bg-accent-violet-soft">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="accent-violet" />
          <span className="text-sm font-medium accent-violet">AI Actions</span>
        </div>
        <div className="flex items-center gap-2">
          {(result || error) && (
            <button
              onClick={clearResult}
              className="text-muted transition-colors hover:text-secondary"
              title="Clear result"
            >
              <X size={14} />
            </button>
          )}
          {result && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="accent-violet opacity-70 transition-opacity hover:opacity-100"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-3">
        {actions.map((action) => {
          const isActive = activeAction === action.label && loading;
          return (
            <button
              key={action.label}
              onClick={() => handleAction(action)}
              disabled={loading}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "border-transparent bg-accent-violet text-white"
                  : "border-default bg-surface accent-violet hover:bg-accent-violet hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isActive && <Loader2 size={11} className="animate-spin" />}
              {action.label}
            </button>
          );
        })}
      </div>

      {(result || error) && expanded && (
        <div className="px-4 pb-4">
          <div
            className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              error
                ? "border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]"
                : "border border-default bg-surface text-secondary"
            }`}
          >
            {error || result}
          </div>
          {result && (
            <SuggestionChips
              suggestions={suggestions}
              onSelect={handleFollowUp}
              disabled={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}
