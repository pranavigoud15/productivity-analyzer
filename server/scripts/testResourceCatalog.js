/**
 * Context-aware catalog matching regression matrix — run with: node scripts/testResourceCatalog.js
 * Set DEBUG_MATCH=1 to print rejection reasons for failing cases.
 */
const { matchCatalogResources, evaluateEntry, TRUSTED_RESOURCE_CATALOG } = require('../services/resourceCatalogService');
const { fallbackEnrichment } = require('../services/resourceAiService');
const { buildAnalysis } = require('../services/resourceSearchService');

const DEBUG = process.env.DEBUG_MATCH === '1';

const CASES = [
  { label: 'Java + Java Developer Roadmap', title: 'Java Fundamentals', goal: { title: 'Learn Java Programming', description: '' }, roadmap: { title: 'Java Developer Roadmap' }, expectMatch: true, expectAny: ['Oracle Java Documentation'], mustExclude: ['TensorFlow Learn', 'PyTorch Tutorials'] },
  { label: 'Python + Python Developer Roadmap', title: 'Python Fundamentals', goal: { title: 'Learn Python Programming', description: '' }, roadmap: { title: 'Python Developer Roadmap' }, expectMatch: true, expectAny: ['Python Official Documentation'] },
  { label: 'JavaScript goal', title: 'JavaScript Fundamentals', goal: { title: 'Learn JavaScript', description: '' }, roadmap: null, expectMatch: true, expectAny: ['MDN Web Docs'] },
  { label: 'OOP + Developer Roadmap', title: 'OOP Concepts', goal: { title: 'Learn Java Programming', description: '' }, roadmap: { title: 'Developer Roadmap' }, expectMatch: true, expectAny: ['Oracle Java Documentation'], mustExclude: ['TensorFlow Learn', 'PyTorch Tutorials'] },
  { label: 'Arrays + DSA', title: 'Arrays', goal: { title: 'Master DSA', description: '' }, roadmap: null, expectMatch: true, expectAny: ['LeetCode'] },
  { label: 'Graphs + DSA', title: 'Graph Algorithms', goal: { title: 'Master DSA', description: '' }, roadmap: null, expectMatch: true, expectAny: ['LeetCode'] },
  { label: 'Developer Path roadmap', title: 'Java Fundamentals', goal: { title: 'Learn Java Programming', description: '' }, roadmap: { title: 'Developer Path' }, expectMatch: true, expectAny: ['Oracle Java Documentation'], mustExclude: ['TensorFlow Learn', 'PyTorch Tutorials'] },
  { label: 'Machine Learning', title: 'Machine Learning', goal: { title: 'AI/ML Foundations', description: '' }, roadmap: null, expectMatch: true, expectAny: ['TensorFlow Learn', 'scikit-learn Documentation'] },
  { label: 'Deep Learning', title: 'Deep Learning', goal: { title: 'AI/ML Foundations', description: '' }, roadmap: null, expectMatch: true, expectAny: ['PyTorch Tutorials', 'TensorFlow Learn'] },
  { label: 'Thermodynamics ME', title: 'Thermodynamics', goal: { title: 'Mechanical Engineering', description: '' }, roadmap: { title: 'Thermal Engineering Roadmap' }, expectMatch: true, expectAny: ['MIT OpenCourseWare — Mechanical Engineering'] },
  { label: 'Structural Civil', title: 'Structural Engineering', goal: { title: 'Civil Engineering Study', description: '' }, roadmap: null, expectMatch: true, expectAny: ['MIT OpenCourseWare — Civil and Environmental Engineering'] },
  { label: 'Circuit Analysis EE', title: 'Circuit Analysis', goal: { title: 'Electrical Engineering', description: '' }, roadmap: null, expectMatch: true, expectAny: ['All About Circuits'] },
  { label: 'Pharmacology', title: 'Pharmacology', goal: { title: 'Medicine Study Plan', description: '' }, roadmap: null, expectMatch: true, expectAny: ['PubMed'] },
  { label: 'Anatomy', title: 'Anatomy', goal: { title: 'Medicine Study Plan', description: '' }, roadmap: null, expectMatch: true, expectAny: ['PubMed', 'MedlinePlus'] },
  { label: 'Contract Law', title: 'Contract Law', goal: { title: 'Law Foundations', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Cornell Legal Information Institute (LII)'] },
  { label: 'Constitutional Law', title: 'Constitutional Law', goal: { title: 'Law Foundations', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Cornell Legal Information Institute (LII)'] },
  { label: 'Finance', title: 'Finance', goal: { title: 'Business Administration', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Investopedia', 'Khan Academy — Economics & Finance'] },
  { label: 'Economics', title: 'Economics', goal: { title: 'Business Administration', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Khan Academy — Economics & Finance'] },
  { label: 'Marketing', title: 'Marketing', goal: { title: 'Business Administration', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Investopedia', 'Khan Academy — Economics & Finance'] },
  { label: 'Calculus', title: 'Calculus', goal: { title: 'Mathematics Study', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Khan Academy', 'OpenStax Mathematics & Statistics'] },
  { label: 'Physics', title: 'Physics', goal: { title: 'Physics Study', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Khan Academy'] },
  { label: 'Chemistry', title: 'Chemistry', goal: { title: 'Chemistry Study', description: '' }, roadmap: null, expectMatch: true, expectAny: ['Khan Academy'] },
  { label: 'Unknown topic', title: 'Obscure Underwater Basket Weaving 9000', goal: { title: 'Unknown Hobby', description: '' }, roadmap: null, expectMatch: false },
];

function debugRejections(context, analysis, resources) {
  if (!DEBUG || resources.length > 0) return;
  const ranked = TRUSTED_RESOURCE_CATALOG
    .map((entry) => evaluateEntry(entry, analysis))
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  console.log('  Debug top rejected candidates:');
  for (const item of ranked) {
    console.log(`    ${item.id} score=${item.score} strong=${item.strongSignal} domain=${item.domainCompatible} subject=${item.subjectCompatible} topic=${item.topicMatch} inferred=${item.inferredDomains.join('|')}`);
  }
}

let passed = 0;
let failed = 0;

for (const testCase of CASES) {
  const context = {
    task: { title: testCase.title, description: '' },
    goal: testCase.goal || null,
    roadmap: testCase.roadmap || null,
    milestone: null,
  };
  const enrichment = fallbackEnrichment(context);
  const analysis = buildAnalysis(enrichment, context);
  const resources = matchCatalogResources(analysis);
  const matched = resources.length > 0;
  const ok = matched === testCase.expectMatch
    && (!testCase.expectAny || testCase.expectAny.some((name) => resources.some((resource) => resource.title === name)))
    && (!testCase.mustExclude || !testCase.mustExclude.some((name) => resources.some((resource) => resource.title === name)));

  if (ok) {
    passed += 1;
    console.log(`PASS  ${testCase.label} -> ${resources.length} resource(s)`);
    resources.slice(0, 4).forEach((resource) => console.log(`      - [${resource.category}] ${resource.title}`));
  } else {
    failed += 1;
    console.log(`FAIL  ${testCase.label} -> expected match=${testCase.expectMatch}, got ${resources.length}`);
    if (resources.length) resources.forEach((resource) => console.log(`      - ${resource.title}`));
    debugRejections(context, analysis, resources);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
