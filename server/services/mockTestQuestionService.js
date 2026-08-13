const { callAI } = require('../ai/aiProvider');

const VALID_LABELS = new Set(['A', 'B', 'C', 'D']);
const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 30;

const MOCK_TEST_SYSTEM_PROMPT = `You are a professional academic assessor.
Generate multiple-choice questions (MCQs) for ONE assessment scope.

Rules:
1. Generate EXACTLY the requested number of questions with exactly 4 options each (A, B, C, D).
2. Each question has one correct option and a clear explanation.
3. Questions MUST test ONLY the provided assessment scope — do not introduce unrelated topics.
4. Match the requested difficulty level when provided.
5. Cover a mix across questions: conceptual understanding, application, scenario/problem solving, common misconception, and practical decision-making.
6. Every question must be answerable from the scope provided.
7. Return a JSON object: {"reply": "<JSON array of questions>", "suggestions": []}.
   The reply value must be a string containing ONLY the JSON array (no prose before or after).
8. Do not include markdown, introductions, or commentary outside the JSON object.

Question array schema:
[
  {
    "questionText": "Question?",
    "options": [
      { "label": "A", "text": "..." },
      { "label": "B", "text": "..." },
      { "label": "C", "text": "..." },
      { "label": "D", "text": "..." }
    ],
    "correctOption": "A",
    "explanation": "Why A is correct."
  }
]`;

function extractBalancedJsonArray(text) {
  const start = text.indexOf('[');
  if (start < 0) throw new Error('No JSON array found in AI response');

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }

  throw new Error('Unclosed JSON array in AI response');
}

function extractJsonArrayCandidate(text) {
  if (text == null) throw new Error('AI returned empty response');
  if (Array.isArray(text)) return text;
  if (typeof text === 'object') {
    if (Array.isArray(text.questions)) return text.questions;
    if (typeof text.reply === 'string' || Array.isArray(text.reply)) {
      return extractJsonArrayCandidate(text.reply);
    }
    throw new Error('AI response object did not contain a question array.');
  }

  let cleaned = String(text).trim();
  if (cleaned.startsWith('```')) {
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (match?.[1]) cleaned = match[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return extractJsonArrayCandidate(parsed);
  } catch (firstErr) {
    try {
      return extractBalancedJsonArray(cleaned);
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${firstErr.message}`);
    }
  }
}

function extractAndParseJson(text) {
  return extractJsonArrayCandidate(text);
}

function normaliseQuestionCount(questionCount) {
  const count = Number(questionCount);
  if (!Number.isFinite(count)) return DEFAULT_QUESTION_COUNT;
  return Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, Math.round(count)));
}

function buildAssessmentScope(metadata = {}) {
  const {
    title,
    subject,
    topic,
    difficulty,
    description,
    scope,
    tags,
  } = metadata;

  return [
    title ? `Assessment title: ${title}` : '',
    subject ? `Subject: ${subject}` : '',
    topic ? `Topic: ${topic}` : '',
    difficulty ? `Difficulty: ${difficulty}` : '',
    description ? `Description: ${description}` : '',
    Array.isArray(tags) && tags.length ? `Tags: ${tags.join(', ')}` : '',
    scope ? `Learning scope:\n${scope}` : '',
  ].filter(Boolean).join('\n');
}

function fitQuestionCount(questions, expectedCount) {
  if (!Array.isArray(questions)) throw new Error('AI response is not a JSON array.');
  if (questions.length === expectedCount) return questions;
  if (questions.length > expectedCount) {
    console.warn(
      `[MockTest] AI returned ${questions.length} questions; using first ${expectedCount}.`
    );
    return questions.slice(0, expectedCount);
  }
  throw new Error(`AI generated ${questions.length} questions, expected exactly ${expectedCount}.`);
}

function validateQuestionStructure(question, index) {
  const questionNumber = index + 1;
  if (!question.questionText?.trim()) throw new Error(`Question ${questionNumber} is missing questionText.`);
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    throw new Error(`Question ${questionNumber} must have 4 options.`);
  }

  const seenLabels = new Set();
  for (const option of question.options) {
    if (!VALID_LABELS.has(option.label)) throw new Error(`Question ${questionNumber} has invalid option label.`);
    if (seenLabels.has(option.label)) throw new Error(`Question ${questionNumber} has duplicate option labels.`);
    seenLabels.add(option.label);
    if (!option.text?.trim()) throw new Error(`Question ${questionNumber} option ${option.label} missing text.`);
  }

  if (!VALID_LABELS.has(question.correctOption)) {
    throw new Error(`Question ${questionNumber} has invalid correctOption.`);
  }
  if (typeof question.explanation !== 'string') {
    throw new Error(`Question ${questionNumber} missing explanation.`);
  }
}

function validateQuestionBatch(questions) {
  if (!Array.isArray(questions)) throw new Error('AI response is not a JSON array.');
  for (let i = 0; i < questions.length; i++) {
    validateQuestionStructure(questions[i], i);
  }
  return questions;
}

function validateMockQuestions(questions, expectedCount) {
  const fitted = fitQuestionCount(questions, expectedCount);
  return validateQuestionBatch(fitted);
}

function normaliseQuestionBatch(questions, maxCount) {
  const batch = validateQuestionBatch(questions);
  if (batch.length > maxCount) {
    console.warn(`[MockTest] AI returned ${batch.length} questions; using first ${maxCount}.`);
    return batch.slice(0, maxCount);
  }
  return batch;
}

async function fetchQuestionBatch({
  assessmentScope,
  requestedCount,
  metadata,
  expectedCount,
  round,
  priorQuestionTexts = [],
}) {
  const userMessage = round === 0
    ? `Generate ${requestedCount} assessment MCQs for this scope:

${assessmentScope}`
    : `Generate exactly ${requestedCount} additional assessment MCQs for this scope.

Do NOT repeat or closely rephrase these existing questions:
${priorQuestionTexts.map((text, index) => `${index + 1}. ${text}`).join('\n')}

Scope:
${assessmentScope}

IMPORTANT: Return exactly ${requestedCount} new questions.`;

  const response = await callAI({
    systemPrompt: MOCK_TEST_SYSTEM_PROMPT,
    userMessage: round === 0
      ? userMessage
      : `${userMessage}\n\nIMPORTANT: Return ONLY valid JSON. The reply field must contain the question array with exactly ${requestedCount} items and no extra text.`,
    context: { metadata, questionCount: expectedCount, round, requestedCount },
  });

  if (!response) throw new Error('No response received from AI provider.');
  if (response.success === false) {
    throw new Error(response.reply || 'AI provider failed to generate questions.');
  }

  const rawText = typeof response === 'string' ? response : response.reply;
  const parsed = extractAndParseJson(rawText);
  return normaliseQuestionBatch(parsed, requestedCount);
}

async function generateMockTestQuestions(metadata = {}, questionCount = DEFAULT_QUESTION_COUNT) {
  const expectedCount = normaliseQuestionCount(questionCount);
  const assessmentScope = buildAssessmentScope(metadata);

  if (!assessmentScope.trim()) {
    throw new Error('Assessment scope is required to generate mock test questions.');
  }

  let collected = [];
  let lastError;
  const maxRounds = 4;

  for (let round = 0; round < maxRounds && collected.length < expectedCount; round++) {
    const requestedCount = expectedCount - collected.length;
    try {
      const batch = await fetchQuestionBatch({
        assessmentScope,
        requestedCount: round === 0 ? expectedCount : requestedCount,
        metadata,
        expectedCount,
        round,
        priorQuestionTexts: collected.map((question) => question.questionText),
      });

      collected = collected.concat(batch);
      if (collected.length >= expectedCount) {
        return collected.slice(0, expectedCount);
      }

      console.warn(
        `[MockTest] Round ${round + 1} produced ${batch.length} questions; total ${collected.length}/${expectedCount}.`
      );
    } catch (err) {
      lastError = err;
      console.warn(`Mock test generation round ${round + 1} failed: ${err.message}`);
    }
  }

  if (collected.length >= expectedCount) {
    return collected.slice(0, expectedCount);
  }

  throw lastError || new Error(`AI generated ${collected.length} questions, expected exactly ${expectedCount}.`);
}

module.exports = {
  DEFAULT_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  buildAssessmentScope,
  fitQuestionCount,
  validateMockQuestions,
  normaliseQuestionCount,
  generateMockTestQuestions,
};
