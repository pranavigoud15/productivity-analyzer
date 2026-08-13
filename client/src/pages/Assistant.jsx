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

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-violet-soft">
        <Bot size={15} className="accent-violet" />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-default bg-surface px-4 py-3 shadow-pa-sm">
        <div className="flex h-4 items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent-violet" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent-violet" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent-violet" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onRetry }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-violet-soft">
          <Bot size={15} className="accent-violet" />
        </div>
      )}
      <div className="max-w-[75%]">
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-pa-sm ${
            isUser
              ? "rounded-br-sm bg-accent-violet text-white"
              : msg.error
              ? "rounded-bl-sm border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 text-[var(--pa-accent-danger)]"
              : "rounded-bl-sm border border-default bg-surface text-secondary"
          }`}
        >
          {msg.content}
        </div>
        {msg.error && onRetry && (
          <button
            onClick={() => onRetry(msg.originalMessage)}
            className="mt-1 flex items-center gap-1 text-xs text-[var(--pa-accent-danger)] transition-colors hover:opacity-80"
          >
            <RotateCcw size={11} /> Retry
          </button>
        )}
        <p className={`mt-1 text-xs text-muted ${isUser ? "text-right" : "text-left"}`}>
          {msg.time}
        </p>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-violet">
          <User size={15} className="text-white" />
        </div>
      )}
    </div>
  );
}

function SuggestionChips({ suggestions, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="flex items-center gap-1 rounded-full border border-default bg-surface px-3 py-1.5 text-xs accent-violet transition-colors hover:bg-accent-violet-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={11} />
          {s}
        </button>
      ))}
    </div>
  );
}

function ChatEmptyState({ onSelect }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-violet-soft">
        <Bot size={32} className="accent-violet" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-primary">How can I help you?</h2>
        <p className="mt-1 text-sm text-muted">
          Ask me anything about your productivity, goals, or study plans.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="rounded-xl border border-default bg-surface px-4 py-2.5 text-left text-sm accent-violet shadow-pa-sm transition-colors hover:border-[var(--pa-accent-violet)] hover:bg-accent-violet-soft"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      <div className="flex items-center justify-between border-b border-default bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-violet-soft">
            <Bot size={17} className="accent-violet" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-primary">Smart Assistant</h1>
            <p className="text-xs text-muted">AI-powered productivity help</p>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-[var(--pa-accent-danger)]/10 hover:text-[var(--pa-accent-danger)]"
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-app px-4 py-4">
        {isEmpty ? (
          <ChatEmptyState onSelect={sendMessage} />
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

      <div className="border-t border-default bg-surface px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-default bg-surface-secondary px-3 py-2 transition-colors focus-within:border-[var(--pa-accent-violet)] focus-within:shadow-[0_0_0_3px_var(--pa-accent-violet-glow)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm leading-relaxed text-primary outline-none placeholder:text-muted"
            style={{ scrollbarWidth: "none" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center pa-btn-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          AI responses may be inaccurate. Verify important information.
        </p>
      </div>
    </div>
  );
}
