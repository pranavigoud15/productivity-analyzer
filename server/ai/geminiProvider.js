// server/ai/geminiProvider.js
const { GoogleGenAI } = require("@google/genai");

async function callGemini({ systemPrompt, userMessage }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

  const response = await ai.models.generateContent({
    model,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          suggestions: { type: "array", items: { type: "string" } },
        },
        required: ["reply", "suggestions"],
      },
    },
  });

  const rawText = typeof response.text === "function" ? response.text() : response.text;
  const parsed = JSON.parse(rawText);
  return {
    success: true,
    provider: "gemini",
    model,
    reply: parsed.reply,
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 3)
      : [],
  };
}

module.exports = { callGemini };