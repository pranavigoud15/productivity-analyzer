/**
 * Full resource discovery regression — run with: node scripts/testResourceDiscovery.js
 * Uses catalog + optional wikipedia/openalex (network required for discovery providers).
 */
process.env.RESOURCE_DISCOVERY_ENABLED = process.env.RESOURCE_DISCOVERY_ENABLED ?? 'true';

const { fallbackEnrichment } = require('../services/resourceAiService');
const { buildAnalysis, selectResources } = require('../services/resourceSearchService');

const CASES = [
  { label: 'Java Fundamentals', title: 'Java Fundamentals', goal: 'Learn Java Programming', roadmap: 'Java Developer Roadmap', expectMin: 1 },
  { label: 'Python Fundamentals', title: 'Python Fundamentals', goal: 'Learn Python Programming', roadmap: 'Python Developer Roadmap', expectMin: 1 },
  { label: 'Data Structures', title: 'Data Structures', goal: 'Master DSA', roadmap: null, expectMin: 1 },
  { label: 'Machine Learning', title: 'Machine Learning', goal: 'AI/ML Foundations', roadmap: null, expectMin: 1 },
  { label: 'Thermodynamics', title: 'Thermodynamics', goal: 'Mechanical Engineering', roadmap: null, expectMin: 1 },
  { label: 'Pharmacology', title: 'Pharmacology', goal: 'Medicine Study Plan', roadmap: null, expectMin: 1 },
  { label: 'Contract Law', title: 'Contract Law', goal: 'Law Foundations', roadmap: null, expectMin: 1 },
  { label: 'Finance', title: 'Finance', goal: 'Business Administration', roadmap: null, expectMin: 1 },
  { label: 'Calculus', title: 'Calculus', goal: 'Mathematics Study', roadmap: null, expectMin: 1 },
  { label: 'Physics', title: 'Physics', goal: 'Physics Study', roadmap: null, expectMin: 1 },
  { label: 'Obscure topic', title: 'Obscure Underwater Basket Weaving 9000', goal: 'Unknown Hobby', roadmap: null, expectMin: 0, expectMax: 0 },
];

async function runCase(testCase) {
  const context = {
    task: { title: testCase.title, description: '' },
    goal: testCase.goal ? { title: testCase.goal, description: '' } : null,
    roadmap: testCase.roadmap ? { title: testCase.roadmap, description: '' } : null,
    milestone: null,
  };
  const enrichment = fallbackEnrichment(context);
  const resources = await selectResources(enrichment, context);
  const analysis = buildAnalysis(enrichment, context);

  const okMin = resources.length >= (testCase.expectMin ?? 0);
  const okMax = testCase.expectMax === undefined || resources.length <= testCase.expectMax;

  console.log(`\n${testCase.label}`);
  console.log(`  domain/subject/topic: ${analysis.domain || '-'} / ${analysis.subject || '-'} / ${analysis.topic}`);
  console.log(`  guide-capable enrichment: yes (fallback)`);
  console.log(`  resources: ${resources.length}`);
  resources.slice(0, 5).forEach((r) => console.log(`    - [${r.source}] ${r.title}`));

  return okMin && okMax;
}

async function main() {
  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    try {
      const ok = await runCase(testCase);
      if (ok) {
        passed += 1;
        console.log('  PASS');
      } else {
        failed += 1;
        console.log('  FAIL');
      }
    } catch (err) {
      failed += 1;
      console.log(`  FAIL (${err.message})`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main();
