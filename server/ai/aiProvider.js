// aiProvider.js
// Pluggable AI provider.
// To integrate a different provider: replace ONLY the callAI function body.
// The response shape contract must be maintained exactly.

const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function callAI({ systemPrompt, userMessage, context }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      success: false,
      provider: "gemini",
      reply: "AI provider not configured. Please set GEMINI_API_KEY in your environment.",
      suggestions: [],
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          suggestions: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["reply", "suggestions"],
      },
    },
  });

  const raw = response.text();
  const parsed = JSON.parse(raw);

  return {
    success: true,
    provider: "gemini",
    reply: parsed.reply,
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 3)
      : [],
  };
}

module.exports = { callAI };