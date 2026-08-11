import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import api from "../../services/api";
import { clearAuthAndRedirect } from "../../utils/auth";

// ─── Per-module action definitions ───────────────────────────────────────────

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

// ─── Suggestion chips ────────────────────────────────────────────────────────

function SuggestionChips({ suggestions, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <span className="text-xs text-gray-400 w-full">Follow-up suggestions:</span>
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-400 rounded-full px-3 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={10} />
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContextAI({ module, context, title }) {
  const [result, setResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const actions = MODULE_ACTIONS[module?.toLowerCase()] || [];

  // Don't render if no actions are defined for this module
  if (actions.length === 0) return null;

  const handleAction = async (action) => {
    if (loading) return;
    setLoading(true);
    setActiveAction(action.label);
    setError(null);
    setResult(null);
    setSuggestions([]);

    // Attach optional title to context so the prompt builder can use it
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

  // Follow-up suggestion sends a new contextual message
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
    <div className="mt-4 border border-indigo-100 rounded-2xl bg-indigo-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-500" />
          <span className="text-sm font-medium text-indigo-700">AI Actions</span>
        </div>
        <div className="flex items-center gap-2">
          {(result || error) && (
            <button
              onClick={clearResult}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear result"
            >
              <X size={14} />
            </button>
          )}
          {result && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-indigo-400 hover:text-indigo-600 transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {actions.map((action) => {
          const isActive = activeAction === action.label && loading;
          return (
            <button
              key={action.label}
              onClick={() => handleAction(action)}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1 ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isActive && <Loader2 size={11} className="animate-spin" />}
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Result Panel */}
      {(result || error) && expanded && (
        <div className="px-4 pb-4">
          <div
            className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              error
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-white border border-indigo-100 text-gray-700"
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