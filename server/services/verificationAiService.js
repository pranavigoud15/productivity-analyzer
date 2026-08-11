const { callAI } = require('../ai/aiProvider');

const VERIFICATION_SYSTEM_PROMPT = `You are a professional academic assessor.
Your task is to generate EXACTLY 5 multiple-choice questions (MCQs) to verify the user's understanding of the provided study task.

Follow these strict formatting and content constraints:
1. Generate exactly 5 questions. No more, no less.
2. Each question must have exactly 4 options with labels: 'A', 'B', 'C', and 'D'.
3. Each question must have exactly one correct option.
4. Provide a clear, educational explanation of why the correct option is right.
5. Focus the questions specifically on the subject, topic, and context of the provided task.
6. Return your entire response as a raw JSON array of objects. Do not include any conversational text, markdown formatting (outside of markdown code fences), or introduction.

The JSON schema must match exactly:
[
  {
    "questionText": "Question string?",
    "options": [
      { "label": "A", "text": "Option text 1" },
      { "label": "B", "text": "Option text 2" },
      { "label": "C", "text": "Option text 3" },
      { "label": "D", "text": "Option text 4" }
    ],
    "correctOption": "A", // Must be one of 'A', 'B', 'C', or 'D'
    "explanation": "Brief explanation of why option A is correct."
  }
]`;

/**
 * Safely extracts and parses JSON from the AI response text,
 * handling cases where responses are wrapped in markdown code fences.
 */
function extractAndParseJson(text) {
  if (!text) {
    throw new Error("AI returned empty response");
  }

  let cleaned = text.trim();

  // Match and extract anything between ```json and ``` or ``` and ```
  if (cleaned.startsWith("```")) {
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Failed to parse AI response as JSON: " + err.message);
  }
}

/**
 * Strictly validates that the AI generated exactly 5 questions 
 * and that all required nested fields conform to the target schema.
 */
function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    throw new Error("AI response is not a JSON array.");
  }

  if (questions.length !== 5) {
    throw new Error(`AI generated ${questions.length} questions, expected exactly 5.`);
  }

  const validLabels = new Set(['A', 'B', 'C', 'D']);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    
    if (!q.questionText || typeof q.questionText !== 'string' || !q.questionText.trim()) {
      throw new Error(`Question ${i + 1} is missing a valid 'questionText'.`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question ${i + 1} must have exactly 4 options.`);
    }

    const seenLabels = new Set();
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (!opt || !opt.label || !validLabels.has(opt.label)) {
        throw new Error(`Question ${i + 1} option ${j + 1} has an invalid or missing label. Must be A, B, C, or D.`);
      }
      if (seenLabels.has(opt.label)) {
        throw new Error(`Question ${i + 1} contains duplicate option label '${opt.label}'.`);
      }
      seenLabels.add(opt.label);

      if (!opt.text || typeof opt.text !== 'string' || !opt.text.trim()) {
        throw new Error(`Question ${i + 1} option '${opt.label}' has missing or invalid text.`);
      }
    }

    if (!q.correctOption || !validLabels.has(q.correctOption)) {
      throw new Error(`Question ${i + 1} has an invalid or missing 'correctOption'. Must be A, B, C, or D.`);
    }

    if (q.explanation === undefined || typeof q.explanation !== 'string') {
      throw new Error(`Question ${i + 1} is missing an 'explanation' string.`);
    }
  }

  return true;
}

/**
 * Generates exactly 5 MCQ questions based on a task title and context.
 * 
 * @param {string} taskTitle - The title of the task
 * @param {string} taskContext - Optional descriptive/contextual information
 * @returns {Promise<Array>} Exactly 5 validated questions compatible with TaskVerificationAttempt
 */
async function generateVerificationQuestions(taskTitle, taskContext = "") {
  if (!taskTitle || !taskTitle.trim()) {
    throw new Error("Task title is required to generate verification questions.");
  }

  const userMessage = `Generate 5 verification MCQs for the following task:
Title: ${taskTitle.trim()}
Additional Context: ${taskContext ? taskContext.trim() : "None provided."}`;

  const response = await callAI({
    systemPrompt: VERIFICATION_SYSTEM_PROMPT,
    userMessage,
    context: { taskTitle, taskContext }
  });

  if (!response) {
    throw new Error("No response received from AI provider.");
  }

  if (response.success === false) {
    throw new Error(response.reply || "AI provider failed to generate questions.");
  }

  let rawText = "";
  if (typeof response === "string") {
    rawText = response;
  } else if (typeof response.reply === "string") {
    rawText = response.reply;
  } else {
    throw new Error("Unrecognized response format from AI provider.");
  }

  const questions = extractAndParseJson(rawText);
  validateQuestions(questions);

  return questions;
}

module.exports = {
  generateVerificationQuestions,
};