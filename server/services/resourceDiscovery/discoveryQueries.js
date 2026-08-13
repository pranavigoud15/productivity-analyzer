const WEAK_QUERY_WORDS = new Set([
  'week', 'learn', 'apply', 'task', 'roadmap', 'path', 'track', 'plan', 'study',
  'learning', 'developer', 'development', 'fundamentals', 'basics', 'concepts',
  'module', 'course', 'practice', 'review', 'introduction', 'intro',
]);

function cleanQueryPart(value) {
  return String(value || '')
    .replace(/^week \d+:\s*/i, '')
    .trim();
}

function buildDiscoveryQueries(enrichment, context) {
  const { task, goal } = context;
  const subject = cleanQueryPart(enrichment.subject);
  const topic = cleanQueryPart(enrichment.topic || task?.title);
  const domain = cleanQueryPart(enrichment.domain);
  const queries = new Set();

  if (subject && topic) queries.add(`${subject} ${topic}`);
  if (topic && goal?.title) {
    const goalHint = cleanQueryPart(goal.title);
    if (goalHint && !WEAK_QUERY_WORDS.has(goalHint.split(/\s+/)[0])) {
      queries.add(`${topic} ${goalHint}`);
    }
  }
  if (domain && topic) queries.add(`${domain.replace(/-/g, ' ')} ${topic}`);

  for (const subtopic of (enrichment.subtopics || []).slice(0, 2)) {
    const part = cleanQueryPart(subtopic);
    if (part && part.length >= 4) {
      queries.add(subject ? `${subject} ${part}` : part);
    }
  }

  if (!queries.size && topic) queries.add(topic);

  return [...queries]
    .map((query) => query.replace(/\s+/g, ' ').trim())
    .filter((query) => query.length >= 4)
    .slice(0, 3);
}

module.exports = { buildDiscoveryQueries };
