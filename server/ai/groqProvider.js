// server/ai/groqProvider.js
const Groq = require("groq-sdk");

async function callGroq({ systemPrompt, userMessage }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt + '\n\nRespond with JSON: {"reply": string, "suggestions": string[]}' },
      { role: "user",   content: userMessage },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  return {
    success: true,
    provider: "groq",
    reply: parsed.reply,
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 3)
      : [],
  };
}

module.exports = { callGroq };