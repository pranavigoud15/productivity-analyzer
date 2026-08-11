import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, Trash2, Bot, User, Sparkles } from "lucide-react";
import api from "../services/api";
import { clearAuthAndRedirect } from "../utils/auth";

const SUGGESTED_PROMPTS = [
  "How can I improve my daily productivity?",
  "Give me a study strategy for this week.",
  "How do I break down a large goal effectively?",
  "What's the best way to review my notes before an exam?",
  "Help me prioritize my tasks for today.",
];

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-indigo-600" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, onRetry }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Bot size={15} className="text-indigo-600" />
        </div>
      )}
      <div className="max-w-[75%]">
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : msg.error
              ? "bg-red-50 border border-red-200 text-red-700 rounded-bl-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
          }`}
        >
          {msg.content}
        </div>
        {msg.error && onRetry && (
          <button
            onClick={() => onRetry(msg.originalMessage)}
            className="mt-1 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <RotateCcw size={11} /> Retry
          </button>
        )}
        <p
          className={`text-xs mt-1 text-gray-400 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {msg.time}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <User size={15} className="text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Suggestion Chips ─────────────────────────────────────────────────────────

function SuggestionChips({ suggestions, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-400 rounded-full px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={11} />
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
        <Bot size={32} className="text-indigo-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-700">How can I help you?</h2>
        <p className="text-sm text-gray-400 mt-1">
          Ask me anything about your productivity, goals, or study plans.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="text-left text-sm text-indigo-600 bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl px-4 py-2.5 transition-colors shadow-sm"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Suggestions are tied to the last assistant message
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    // Clear suggestions when a new message is sent
    setPendingSuggestions([]);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, time: getTime() },
    ]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/assistant/chat", {
        message: trimmed,
        module: "global",
        context: null,
      });

      if (!data.success) {
        throw new Error(data.message || "Unknown error");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, time: getTime() },
      ]);
      setPendingSuggestions(data.suggestions || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      const errMsg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errMsg,
          time: getTime(),
          error: true,
          originalMessage: trimmed,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setPendingSuggestions([]);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <Bot size={17} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-800 text-sm">Smart Assistant</h1>
            <p className="text-xs text-gray-400">AI-powered productivity help</p>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {isEmpty ? (
          <EmptyState onSelect={sendMessage} />
        ) : (
          <>
            {messages.map((msg, i) => {
              const isLastAssistant =
                msg.role === "assistant" && i === messages.length - 1;
              return (
                <div key={i}>
                  <MessageBubble msg={msg} onRetry={sendMessage} />
                  {isLastAssistant && !loading && (
                    <div className="ml-10">
                      <SuggestionChips
                        suggestions={pendingSuggestions}
                        onSelect={sendMessage}
                        disabled={loading}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {loading && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-32 leading-relaxed"
            style={{ scrollbarWidth: "none" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 mb-0.5"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          AI responses may be inaccurate. Verify important information.
        </p>
      </div>
    </div>
  );
}