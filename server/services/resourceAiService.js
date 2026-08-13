const { callAI } = require('../ai/aiProvider');
const { formatContextBlock } = require('./taskContextService');
const { TRUSTED_RESOURCE_CATALOG } = require('../data/trustedResourceCatalog');

const ENRICHMENT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    learningObjective: { type: 'string' },
    domain: { type: 'string' },
    subject: { type: 'string' },
    topic: { type: 'string' },
    subtopics: { type: 'array', items: { type: 'string' } },
    difficulty: { type: 'string' },
    matchingTerms: { type: 'array', items: { type: 'string' } },
    learningGuide: {
      type: 'object',
      properties: {
        overview: { type: 'string' },
        whatToLearn: { type: 'array', items: { type: 'string' } },
        keyConcepts: { type: 'array', items: { type: 'string' } },
        learningSteps: { type: 'array', items: { type: 'string' } },
        examples: { type: 'array', items: { type: 'string' } },
        practicalApplications: { type: 'array', items: { type: 'string' } },
        commonMistakes: { type: 'array', items: { type: 'string' } },
        prerequisites: { type: 'array', items: { type: 'string' } },
        practiceSuggestions: { type: 'array', items: { type: 'string' } },
        expectedOutcome: { type: 'string' },
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['learningObjective', 'learningGuide', 'matchingTerms', 'suggestions'],
};

const ENRICHMENT_PROMPT = `You create task-specific learning packages for students in ANY academic or professional domain.
Use the FULL goal, roadmap, milestone, and task context. Short milestone titles such as "Strings" or "OOP Concepts" must be interpreted using the parent goal/roadmap (e.g. Java vs Python vs another domain).

Return a single flat JSON object with:
- "learningObjective": one clear, specific sentence
- "domain": slug such as computer-science, programming, web-development, data-structures-algorithms, ai-ml, mechanical-engineering, civil-engineering, electrical-engineering, medicine, business-finance, law, mathematics-science
- "subject": narrower subject slug (e.g. java, python, thermodynamics)
- "topic": specific topic phrase for this task
- "subtopics": array of 4-10 specific concepts the student must learn for THIS task in THIS domain
- "difficulty": beginner | intermediate | advanced | ""
- "matchingTerms": array of 8-16 lowercase keywords/subtopics for resource matching
- "learningGuide": object with substantive, task-specific content (not generic filler):
      - "overview", "whatToLearn", "keyConcepts", "learningSteps", "examples",
        "practicalApplications", "commonMistakes", "prerequisites",
        "practiceSuggestions", "expectedOutcome"
- "suggestions": an empty array

Rules:
- Teach what the student actually needs for this task in this domain.
- Never include URLs or external links.
- keyConcepts and whatToLearn must name real concepts, not vague placeholders.`;

function extractJson(text) {
  if (text == null) throw new Error('AI returned empty response');
  if (typeof text === 'object') return text;
  let cleaned = String(text).trim();
  if (cleaned.startsWith('```')) {
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (match?.[1]) cleaned = match[1].trim();
  }
  const parsed = JSON.parse(cleaned);
  if (parsed?.learningObjective) return parsed;
  if (typeof parsed?.reply === 'string' && parsed.reply.trim()) {
    return extractJson(parsed.reply);
  }
  if (parsed?.reply && typeof parsed.reply === 'object') return parsed.reply;
  return parsed;
}

function normalizeEnrichmentPayload(response) {
  if (response?.data?.learningObjective) return response.data;
  const rawText = typeof response === 'string' ? response : response?.reply;
  if (!rawText) throw new Error('AI returned empty enrichment payload');
  return extractJson(rawText);
}

function tokenizeText(...values) {
  const tokens = new Set();
  for (const value of values) {
    String(value || '')
      .toLowerCase()
      .replace(/^week \d+:\s*/i, '')
      .split(/[^a-z0-9+#.]+/)
      .filter((term) => term.length >= 2)
      .forEach((term) => tokens.add(term));
  }
  return [...tokens];
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeGuide(raw = {}) {
  return {
    overview: String(raw.overview || '').trim(),
    whatToLearn: asStringArray(raw.whatToLearn),
    keyConcepts: asStringArray(raw.keyConcepts),
    learningSteps: asStringArray(raw.learningSteps),
    examples: asStringArray(raw.examples),
    practicalApplications: asStringArray(raw.practicalApplications),
    commonMistakes: asStringArray(raw.commonMistakes),
    prerequisites: asStringArray(raw.prerequisites),
    practiceSuggestions: asStringArray(raw.practiceSuggestions),
    expectedOutcome: String(raw.expectedOutcome || '').trim(),
  };
}

function collectContextTerms(context) {
  const { task, goal, roadmap, milestone } = context;
  return tokenizeText(
    task.title,
    task.description,
    goal?.title,
    goal?.description,
    roadmap?.title,
    milestone?.title,
    milestone?.description,
  );
}

function mergeMatchingTerms(context, matchingTerms = []) {
  return [...new Set([
    ...matchingTerms.map((term) => String(term).trim().toLowerCase()).filter(Boolean),
    ...collectContextTerms(context),
  ])];
}

const GENERIC_SUBJECTS = new Set([
  'programming', 'algorithms', 'data-structures', 'coding', 'problem-solving', 'web', 'database', 'backend', 'frontend',
]);

function inferSubjectFromContext(context) {
  const terms = collectContextTerms(context);
  const termSet = new Set(terms);
  const matches = [];

  for (const entry of TRUSTED_RESOURCE_CATALOG) {
    for (const subject of entry.subjects || []) {
      const value = String(subject).toLowerCase();
      if (termSet.has(value)) matches.push(value);
    }
  }
  if (!matches.length) return '';

  const specific = matches.filter((value) => !GENERIC_SUBJECTS.has(value));
  const pool = specific.length ? specific : matches;
  return pool.sort((a, b) => b.length - a.length)[0];
}

function fallbackEnrichment(context) {
  const topic = context.task.title.replace(/^Week \d+:\s*/i, '').trim() || context.task.title;
  const goalHint = context.goal?.title ? ` as part of ${context.goal.title}` : '';
  const matchingTerms = collectContextTerms(context);
  const subject = inferSubjectFromContext(context);

  return {
    learningObjective: `Learn and apply ${topic}${goalHint}.`,
    domain: '',
    subject,
    topic,
    subtopics: [],
    difficulty: '',
    matchingTerms,
    learningGuide: normalizeGuide({
      overview: `This task focuses on ${topic}${goalHint}. Use the guide below to study the topic in a structured way.`,
      whatToLearn: [`Core ideas behind ${topic}`, `How ${topic} fits into your broader learning goal`],
      keyConcepts: [topic],
      learningSteps: [
        'Review prerequisites and clarify terminology.',
        `Study the core concepts of ${topic}.`,
        'Apply the concept through examples or exercises.',
        'Summarize what you learned and note open questions.',
      ],
      examples: [`Work through one concrete example related to ${topic}.`],
      practicalApplications: [`Identify one real-world use case for ${topic}.`],
      commonMistakes: ['Studying passively without practice.', 'Skipping prerequisite concepts.'],
      prerequisites: context.milestone?.title ? [`Earlier milestone: ${context.milestone.title}`] : [],
      practiceSuggestions: [`Practice ${topic} with exercises or small problems.`],
      expectedOutcome: `You can explain and apply ${topic} confidently.`,
    }),
  };
}

function guideHasContent(guide) {
  if (!guide) return false;
  if (guide.overview?.trim() || guide.expectedOutcome?.trim()) return true;
  return ['whatToLearn', 'keyConcepts', 'learningSteps', 'examples', 'practicalApplications', 'commonMistakes', 'prerequisites', 'practiceSuggestions']
    .some((field) => Array.isArray(guide[field]) && guide[field].length);
}

async function generateTaskEnrichment(context) {
  if (!context?.task?.title?.trim()) throw new Error('Task title is required.');

  try {
    const response = await callAI({
      systemPrompt: ENRICHMENT_PROMPT,
      userMessage: formatContextBlock(context),
      context: { taskId: context.task._id },
      responseSchema: ENRICHMENT_RESPONSE_SCHEMA,
      flatJson: true,
    });

    if (response?.success === false) throw new Error(response.reply || 'AI unavailable');

    const parsed = normalizeEnrichmentPayload(response);
    const learningObjective = String(parsed.learningObjective || '').trim();
    if (!learningObjective) throw new Error('Missing learning objective');

    const matchingTerms = Array.isArray(parsed.matchingTerms)
      ? parsed.matchingTerms.map((term) => String(term).trim().toLowerCase()).filter(Boolean).slice(0, 16)
      : [];
    const subtopics = Array.isArray(parsed.subtopics)
      ? parsed.subtopics.map((term) => String(term).trim().toLowerCase()).filter(Boolean).slice(0, 10)
      : [];

    const fallback = fallbackEnrichment(context);
    let learningGuide = normalizeGuide(parsed.learningGuide);
    if (!guideHasContent(learningGuide)) learningGuide = fallback.learningGuide;

    return {
      learningObjective,
      domain: String(parsed.domain || '').trim().toLowerCase(),
      subject: String(parsed.subject || '').trim().toLowerCase(),
      topic: String(parsed.topic || '').trim(),
      subtopics,
      difficulty: String(parsed.difficulty || '').trim().toLowerCase(),
      matchingTerms: mergeMatchingTerms(context, [...matchingTerms, ...subtopics]),
      learningGuide,
    };
  } catch (err) {
    console.warn(`[Enrichment] AI fallback for taskId=${context.task._id}: ${err.message}`);
    return fallbackEnrichment(context);
  }
}

module.exports = {
  generateTaskEnrichment,
  fallbackEnrichment,
  normalizeGuide,
  normalizeEnrichmentPayload,
  tokenizeText,
  mergeMatchingTerms,
  collectContextTerms,
};
