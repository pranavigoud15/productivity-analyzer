// server/ai/aiProvider.js
const { callGemini } = require("./geminiProvider");
const { callGroq }   = require("./groqProvider");

async function callAI({ systemPrompt, userMessage, context }) {
  // ── Gemini (primary) ──────────────────────────────────────────────────────
  try {
    console.log("Using Gemini");
    return await callGemini({ systemPrompt, userMessage });
  } catch (geminiErr) {
    console.warn("Gemini failed -> Switching to Groq:", geminiErr.message);
  }

  // ── Groq (fallback) ───────────────────────────────────────────────────────
  try {
    console.log("Using Groq");
    return await callGroq({ systemPrompt, userMessage });
  } catch (groqErr) {
    console.error("Groq failed:", groqErr.message);
    return {
      success: false,
      provider: "none",
      reply: "Both AI providers are currently unavailable. Please try again shortly.",
      suggestions: [],
    };
  }
}

module.exports = { callAI };