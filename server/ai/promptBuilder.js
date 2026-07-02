// promptBuilder.js
// Builds a structured prompt string from message, module, and sanitized context.
// Uses a consistent format that works well with Gemini and Groq instruction-following.

function buildPrompt({ message, module, context }) {
  if (!context) {
    // Global AI Chat — no context, plain conversational prompt
    return `Module: global\nUser Request: ${message}`;
  }

  // Serialize context fields into readable key-value lines
  const contextLines = Object.entries(context)
    .map(([key, value]) => {
      if (value === null || value === undefined) return null;
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ")}`;
      }
      if (typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");

  return `Module: ${module}
Context:
${contextLines}

User Request: ${message}`;
}

module.exports = { buildPrompt };