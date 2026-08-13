/**
 * Cross-domain resource contamination regression tests.
 * Run: node scripts/testResourceContamination.js
 */
const { matchCatalogResources, evaluateEntry, TRUSTED_RESOURCE_CATALOG } = require('../services/resourceCatalogService');
const { fallbackEnrichment } = require('../services/resourceAiService');
const { buildAnalysis } = require('../services/resourceSearchService');

const CASES = [
  {
    label: 'Java Fundamentals',
    title: 'Java Fundamentals',
    goal: { title: 'Learn Java Programming', description: '' },
    roadmap: { title: 'Java Developer Roadmap' },
    enrichment: { domain: 'computer-science', subject: 'java', topic: 'Java Fundamentals' },
    mustIncludeAny: ['Oracle Java Documentation'],
    mustExclude: ['TensorFlow Learn', 'PyTorch Tutorials', 'React Official Documentation', 'MongoDB Documentation'],
  },
  {
    label: 'Python Fundamentals',
    title: 'Python Fundamentals',
    goal: { title: 'Learn Python Programming', description: '' },
    roadmap: { title: 'Python Developer Roadmap' },
    enrichment: { domain: 'computer-science', subject: 'python', topic: 'Python Fundamentals' },
    mustIncludeAny: ['Python Official Documentation'],
    mustExclude: ['TensorFlow Learn', 'PyTorch Tutorials', 'Oracle Java Documentation'],
  },
  {
    label: 'Machine Learning',
    title: 'Machine Learning',
    goal: { title: 'Learn Machine Learning', description: '' },
    enrichment: { domain: 'ai-ml', subject: 'machine-learning', topic: 'Machine Learning' },
    mustIncludeAny: ['TensorFlow Learn', 'scikit-learn Documentation', 'PyTorch Tutorials'],
    mustExclude: ['Oracle Java Documentation', 'Cornell Legal Information Institute (LII)'],
  },
  {
    label: 'Thermodynamics',
    title: 'Thermodynamics',
    goal: { title: 'Learn Thermodynamics', description: '' },
    enrichment: { domain: 'mechanical-engineering', subject: 'thermodynamics', topic: 'Thermodynamics' },
    mustIncludeAny: ['MIT OpenCourseWare — Mechanical Engineering'],
    mustExclude: ['Oracle Java Documentation', 'React Official Documentation', 'TensorFlow Learn'],
  },
  {
    label: 'Pharmacology',
    title: 'Pharmacology',
    goal: { title: 'Learn Pharmacology', description: '' },
    enrichment: { domain: 'medicine', subject: 'pharmacology', topic: 'Pharmacology' },
    mustIncludeAny: ['PubMed'],
    mustExclude: ['Oracle Java Documentation', 'LeetCode', 'TensorFlow Learn'],
  },
  {
    label: 'Contract Law',
    title: 'Contract Law',
    goal: { title: 'Learn Contract Law', description: '' },
    enrichment: { domain: 'law', subject: 'contract-law', topic: 'Contract Law' },
    mustIncludeAny: ['Cornell Legal Information Institute (LII)'],
    mustExclude: ['Oracle Java Documentation', 'Python Official Documentation', 'MongoDB Documentation'],
  },
  {
    label: 'Finance',
    title: 'Finance',
    goal: { title: 'Learn Finance', description: '' },
    enrichment: { domain: 'business-finance', subject: 'finance', topic: 'Finance' },
    mustIncludeAny: ['Investopedia', 'Khan Academy — Economics & Finance'],
    mustExclude: ['Oracle Java Documentation', 'React Official Documentation'],
  },
  {
    label: 'Calculus',
    title: 'Calculus',
    goal: { title: 'Learn Calculus', description: '' },
    enrichment: { domain: 'mathematics-science', subject: 'calculus', topic: 'Calculus' },
    mustIncludeAny: ['Khan Academy'],
    mustExclude: ['Oracle Java Documentation', 'TensorFlow Learn'],
  },
  {
    label: 'Arbitrary new domain',
    title: 'Passive House Design',
    goal: { title: 'Learn Sustainable Architecture and Green Building Design', description: '' },
    enrichment: { domain: 'civil-engineering', subject: 'architecture', topic: 'Passive House Design' },
    mustIncludeAny: [],
    mustExclude: ['Oracle Java Documentation', 'TensorFlow Learn', 'PubMed', 'LeetCode'],
  },
];

let passed = 0;
let failed = 0;

for (const testCase of CASES) {
  const context = {
    task: { title: testCase.title, description: '' },
    goal: testCase.goal,
    roadmap: testCase.roadmap || null,
    milestone: null,
  };
  const enrichment = {
    ...fallbackEnrichment(context),
    ...testCase.enrichment,
    matchingTerms: [
      ...fallbackEnrichment(context).matchingTerms,
      testCase.enrichment.subject,
      testCase.enrichment.topic,
    ],
  };
  const analysis = buildAnalysis(enrichment, context);
  const resources = matchCatalogResources(analysis);
  const titles = resources.map((resource) => resource.title);

  const includeOk = !testCase.mustIncludeAny.length
    || testCase.mustIncludeAny.some((name) => titles.includes(name));
  const excluded = testCase.mustExclude.filter((name) => titles.includes(name));
  const excludeOk = excluded.length === 0;

  if (includeOk && excludeOk) {
    passed += 1;
    console.log(`PASS  ${testCase.label} -> ${resources.length} resource(s)`);
    titles.slice(0, 5).forEach((title) => console.log(`      - ${title}`));
  } else {
    failed += 1;
    console.log(`FAIL  ${testCase.label}`);
    if (!includeOk) console.log(`      missing expected resource`);
    if (!excludeOk) console.log(`      contamination: ${excluded.join(', ')}`);
    titles.forEach((title) => console.log(`      - ${title}`));
  }
}

const javaAnalysis = buildAnalysis({
  learningObjective: 'Learn Java basics',
  domain: 'computer-science',
  subject: 'java',
  topic: 'Java Fundamentals',
  matchingTerms: ['java', 'fundamentals', 'oop'],
}, {
  task: { title: 'Java Fundamentals', description: '' },
  goal: { title: 'Learn Java Programming', description: '' },
  roadmap: null,
  milestone: null,
});

for (const id of ['tensorflow-learn', 'pytorch-tutorials']) {
  const entry = TRUSTED_RESOURCE_CATALOG.find((item) => item.id === id);
  const evaluation = evaluateEntry(entry, javaAnalysis);
  if (!evaluation.passes) {
    passed += 1;
    console.log(`PASS  ${id} rejected for Java analysis`);
  } else {
    failed += 1;
    console.log(`FAIL  ${id} incorrectly passes for Java analysis (score=${evaluation.score})`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
