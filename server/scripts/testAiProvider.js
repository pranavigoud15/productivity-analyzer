/**
 * AI provider fallback and response-shape tests (no live API calls required).
 * Run: node scripts/testAiProvider.js
 */
const { classifyProviderError } = require('../ai/aiProvider');
const { normalizeEnrichmentPayload } = require('../services/resourceAiService');
const { extractAndParseJson } = require('../services/verificationAiService');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log('\n=== AI provider utility tests ===\n');

assert(classifyProviderError(new Error('models/gemini-2.0-flash is no longer available')) === 'model_unavailable', 'Gemini 404 classified as model_unavailable');
assert(classifyProviderError(new Error('Gemini request timed out after 45000ms')) === 'timeout', 'Timeout classified correctly');
assert(classifyProviderError(new Error('GEMINI_API_KEY not set')) === 'missing_credentials', 'Missing credentials classified correctly');
assert(classifyProviderError(new Error('Failed to generate JSON')) === 'malformed_response', 'Malformed JSON classified correctly');
assert(classifyProviderError(new Error('Rate limit reached 429')) === 'rate_limited', 'Rate limit classified correctly');

const flatPayload = normalizeEnrichmentPayload({
  data: {
    learningObjective: 'Understand Java syntax.',
    domain: 'computer-science',
    subject: 'java',
    topic: 'Java Fundamentals',
    matchingTerms: ['java', 'syntax'],
    learningGuide: { overview: 'Intro', whatToLearn: ['syntax'] },
    suggestions: [],
  },
});
assert(flatPayload.learningObjective.includes('Java'), 'Flat enrichment payload accepted');

const nestedPayload = normalizeEnrichmentPayload({
  reply: JSON.stringify({
    learningObjective: 'Understand thermodynamics.',
    domain: 'mechanical-engineering',
    subject: 'thermodynamics',
    topic: 'Thermodynamics',
    matchingTerms: ['thermo'],
    learningGuide: { overview: 'Heat and energy' },
    suggestions: [],
  }),
});
assert(nestedPayload.subject === 'thermodynamics', 'Nested reply string enrichment payload parsed');

const verificationJson = extractAndParseJson(JSON.stringify([
  {
    questionText: 'Q1?',
    options: [
      { label: 'A', text: 'a' },
      { label: 'B', text: 'b' },
      { label: 'C', text: 'c' },
      { label: 'D', text: 'd' },
    ],
    correctOption: 'A',
    explanation: 'Because A.',
  },
]));
assert(Array.isArray(verificationJson), 'Verification JSON parser accepts array payload');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
