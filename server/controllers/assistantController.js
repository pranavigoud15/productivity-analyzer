const { callAI } = require("../ai/aiProvider");
const { buildPrompt } = require("../ai/promptBuilder");
const { buildContext } = require("../ai/contextBuilder");
const { getSystemPrompt } = require("../ai/systemPrompt");

const chat = async (req, res) => {
  try {
    const { message, module: mod, context } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const normalizedModule = (mod || "global").toLowerCase().trim();
    const cleanContext = buildContext({ module: normalizedModule, context: context || null });
    const systemPrompt = getSystemPrompt(normalizedModule);
    const userMessage = buildPrompt({
      message: message.trim(),
      module: normalizedModule,
      context: cleanContext,
    });

    const result = await callAI({
      systemPrompt,
      userMessage,
      context: cleanContext,
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: result.message || "AI provider returned an error.",
      });
    }

    return res.status(200).json({
      success: true,
      reply: result.reply,
      suggestions: result.suggestions || [],
      module: normalizedModule,
      isContextual: !!cleanContext,
    });
  } catch (err) {
    console.error("[AssistantController] Unhandled error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Assistant failed to respond. Please try again.",
    });
  }
};

module.exports = { chat };