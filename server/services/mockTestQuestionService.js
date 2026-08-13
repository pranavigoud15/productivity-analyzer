const { callAI } = require('../ai/aiProvider');

const VALID_LABELS = new Set(['A', 'B', 'C', 'D']);
const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 20;

const MOCK_TEST_SYSTEM_PROMPT = `You are a professional academic assessor.
Generate multiple-choice questions (MCQs) for ONE assessment scope.

Rules:
1. Generate EXACTLY the requested number of questions with exactly 4 options each (A, B, C, D).
2. Each question has one correct option and a clear explanation.
3. Questions MUST test ONLY the provided assessment scope — do not introduce unrelated topics.
4. Match the requested difficulty level when provided.
5. Cover a mix across questions: conceptual understanding, application, scenario/problem solving, common misconception, and practical decision-making.
6. Every question must be answerable from the scope provided.
7. Return ONLY a JSON array of question objects. No markdown outside a code fence.

Schema:
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

function extractAndParseJson(text) {
  if (text == null) throw new Error('AI returned empty response');
  if (typeof text === 'object') return text;
  let cleaned = String(text).trim();
  if (cleaned.startsWith('```')) {
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (match?.[1]) cleaned = match[1].trim();
  }
  return JSON.parse(cleaned);
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

function validateMockQuestions(questions, expectedCount) {
  if (!Array.isArray(questions)) throw new Error('AI response is not a JSON array.');
  if (questions.length !== expectedCount) {
    throw new Error(`AI generated ${questions.length} questions, expected exactly ${expectedCount}.`);
  }

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    if (!question.questionText?.trim()) throw new Error(`Question ${i + 1} is missing questionText.`);
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(`Question ${i + 1} must have 4 options.`);
    }

    const seenLabels = new Set();
    for (const option of question.options) {
      if (!VALID_LABELS.has(option.label)) throw new Error(`Question ${i + 1} has invalid option label.`);
      if (seenLabels.has(option.label)) throw new Error(`Question ${i + 1} has duplicate option labels.`);
      seenLabels.add(option.label);
      if (!option.text?.trim()) throw new Error(`Question ${i + 1} option ${option.label} missing text.`);
    }

    if (!VALID_LABELS.has(question.correctOption)) {
      throw new Error(`Question ${i + 1} has invalid correctOption.`);
    }
    if (typeof question.explanation !== 'string') {
      throw new Error(`Question ${i + 1} missing explanation.`);
    }
  }

  return true;
}

async function generateMockTestQuestions(metadata = {}, questionCount = DEFAULT_QUESTION_COUNT) {
  const expectedCount = normaliseQuestionCount(questionCount);
  const assessmentScope = buildAssessmentScope(metadata);

  if (!assessmentScope.trim()) {
    throw new Error('Assessment scope is required to generate mock test questions.');
  }

  const userMessage = `Generate ${expectedCount} assessment MCQs for this scope:

${assessmentScope}`;

  const response = await callAI({
    systemPrompt: MOCK_TEST_SYSTEM_PROMPT,
    userMessage,
    context: { metadata, questionCount: expectedCount },
  });

  if (!response) throw new Error('No response received from AI provider.');
  if (response.success === false) {
    throw new Error(response.reply || 'AI provider failed to generate questions.');
  }

  const rawText = typeof response === 'string' ? response : response.reply;
  const parsed = extractAndParseJson(rawText);
  const questions = Array.isArray(parsed) ? parsed : parsed.questions;
  validateMockQuestions(questions, expectedCount);
  return questions;
}

module.exports = {
  DEFAULT_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  buildAssessmentScope,
  validateMockQuestions,
  normaliseQuestionCount,
  generateMockTestQuestions,
};
