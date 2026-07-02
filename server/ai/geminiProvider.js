// server/ai/geminiProvider.js
const { GoogleGenAI } = require("@google/genai");

async function callGemini({ systemPrompt, userMessage }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
          suggestions: { type: "array", items: { type: "string" } },
        },
        required: ["reply", "suggestions"],
      },
    },
  });

  const parsed = JSON.parse(response.text());
  return {
    success: true,
    provider: "gemini",
    reply: parsed.reply,
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 3)
      : [],
  };
}

module.exports = { callGemini };