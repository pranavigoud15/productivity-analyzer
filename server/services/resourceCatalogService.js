const { TRUSTED_RESOURCE_CATALOG } = require('../data/trustedResourceCatalog');

const STOP_WORDS = new Set([
  'week', 'learn', 'apply', 'the', 'and', 'for', 'with', 'from', 'into', 'about',
  'basics', 'basic', 'intro', 'introduction', 'review', 'practice', 'project', 'task',
]);

const WEAK_INFERENCE_TOKENS = new Set([
  'developer', 'development', 'fundamentals', 'programming', 'learning', 'study',
  'roadmap', 'path', 'track', 'plan', 'basics', 'basic', 'intro', 'introduction',
  'review', 'practice', 'project', 'task', 'week', 'concepts', 'module', 'course',
  'software', 'engineer', 'engineering', 'become', 'proficient', 'master', 'my',
  'goal', 'developer', 'pathway', 'journey', 'skills', 'skill', 'training',
]);

const PROGRAMMING_LANGS = new Set([
  'java', 'python', 'javascript', 'typescript', 'kotlin', 'swift', 'go', 'rust', 'ruby', 'php', 'csharp', 'cpp',
]);

const GENERIC_SUBJECTS = new Set([
  'programming', 'algorithms', 'data-structures', 'coding', 'problem-solving', 'web', 'database',
  'backend', 'frontend', 'computer-science', 'software', 'technology',
]);

const MIN_MATCH_SCORE = 4;
const MIN_STEM_LENGTH = 5;

let catalogVocabularyCache = null;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function tokenize(...values) {
  const tokens = new Set();
  for (const value of values) {
    String(value || '')
      .toLowerCase()
      .replace(/^week \d+:\s*/i, '')
      .split(/[^a-z0-9+#.]+/)
      .filter((term) => term.length >= 2 && !STOP_WORDS.has(term))
      .forEach((term) => tokens.add(term));
  }
  return tokens;
}

function isWeakInferenceToken(term) {
  const normalized = slugify(term) || String(term || '').toLowerCase();
  if (!normalized) return true;
  if (WEAK_INFERENCE_TOKENS.has(normalized)) return true;
  return normalized.split('-').every((part) => WEAK_INFERENCE_TOKENS.has(part));
}

function buildCatalogVocabulary() {
  if (catalogVocabularyCache) return catalogVocabularyCache;

  const slugs = new Set();
  const tokens = new Set();

  for (const entry of TRUSTED_RESOURCE_CATALOG) {
    for (const field of ['domains', 'subjects', 'topics', 'keywords']) {
      for (const term of entry[field] || []) {
        const slug = slugify(term);
        if (slug) slugs.add(slug);
        tokenize(term).forEach((token) => tokens.add(token));
        slug.split('-').filter((part) => part.length >= 3).forEach((part) => tokens.add(part));
      }
    }
  }

  catalogVocabularyCache = { slugs: [...slugs], tokens: [...tokens] };
  return catalogVocabularyCache;
}

function sharedStem(left, right, minStem = MIN_STEM_LENGTH) {
  const a = slugify(left);
  const b = slugify(right);
  if (!a || !b) return '';
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  for (let length = shorter.length; length >= minStem; length -= 1) {
    const stem = shorter.slice(0, length);
    if (longer.startsWith(stem)) return stem;
  }
  return '';
}

function expandTermAgainstCatalog(term, vocabulary) {
  const expanded = new Set();
  const raw = String(term || '').trim().toLowerCase();
  if (!raw) return expanded;

  expanded.add(raw);
  const termSlug = slugify(raw);
  if (termSlug) expanded.add(termSlug);

  for (const token of tokenize(raw)) expanded.add(token);
  if (termSlug) {
    termSlug.split('-').filter((part) => part.length >= 3).forEach((part) => expanded.add(part));
  }

  if (isWeakInferenceToken(raw)) return expanded;

  for (const catalogSlug of vocabulary.slugs) {
    if (termSlug === catalogSlug) {
      expanded.add(catalogSlug);
      continue;
    }
    if (termSlug && sharedStem(termSlug, catalogSlug)) {
      expanded.add(catalogSlug);
    }
    if (termSlug === catalogSlug) {
      expanded.add(catalogSlug);
    } else if (termSlug.length >= 5 && catalogSlug.length >= 5) {
      if (catalogSlug.includes(termSlug) || termSlug.includes(catalogSlug)) {
        expanded.add(catalogSlug);
      }
    }
  }

  for (const catalogToken of vocabulary.tokens) {
    if (catalogToken.length < 4) continue;
    if (raw === catalogToken || termSlug === catalogToken) {
      expanded.add(catalogToken);
      continue;
    }
    if (sharedStem(raw, catalogToken) || sharedStem(termSlug, catalogToken)) {
      expanded.add(catalogToken);
    }
    for (const queryToken of tokenize(raw)) {
      if (queryToken.length >= 4 && (queryToken === catalogToken || sharedStem(queryToken, catalogToken))) {
        expanded.add(catalogToken);
      }
    }
  }

  return expanded;
}

function resolveNearestCatalogSlug(value, vocabularySlugs) {
  const candidate = slugify(value);
  if (!candidate) return String(value || '').trim().toLowerCase();
  if (vocabularySlugs.has(candidate)) return candidate;

  let best = '';
  for (const catalogSlug of vocabularySlugs) {
    if (candidate === catalogSlug) return catalogSlug;
    const stem = sharedStem(candidate, catalogSlug);
    if (stem.length > best.length) best = catalogSlug;
    if (candidate.length >= 4 && catalogSlug.length >= 4
      && (catalogSlug.includes(candidate) || candidate.includes(catalogSlug))) {
      if (catalogSlug.length > best.length) best = catalogSlug;
    }
  }
  return best || candidate;
}

function expandAnalysisVocabulary(analysis) {
  if (!analysis) return analysis;

  const vocabulary = buildCatalogVocabulary();
  const vocabularySlugs = new Set(vocabulary.slugs);

  // Keep matchingTerms bounded to task/AI-provided terms only.
  // Catalog vocabulary expansion here previously injected unrelated slugs
  // (e.g. machine-learning on Java tasks) and caused cross-domain matches.
  const matchingTerms = [...new Set(
    (analysis.matchingTerms || []).map((term) => String(term).trim().toLowerCase()).filter(Boolean),
  )];

  return {
    ...analysis,
    domain: analysis.domain ? resolveNearestCatalogSlug(analysis.domain, vocabularySlugs) : '',
    subject: analysis.subject ? resolveNearestCatalogSlug(analysis.subject, vocabularySlugs) : '',
    topic: analysis.topic,
    matchingTerms,
  };
}

function entryTerms(entry) {
  return [
    ...(entry.domains || []),
    ...(entry.subjects || []),
    ...(entry.topics || []),
    ...(entry.keywords || []),
  ].map((term) => term.toLowerCase());
}

function termsOverlap(queryTerm, catalogTerm) {
  if (queryTerm === catalogTerm) return 3;
  if (queryTerm.length < 4 || catalogTerm.length < 4) return 0;
  if (catalogTerm.includes(queryTerm) || queryTerm.includes(catalogTerm)) return 1;
  return 0;
}

function subjectMatches(entry, analysis) {
  const subjectSlug = slugify(analysis.subject);
  if (!subjectSlug) return false;
  return (entry.subjects || []).some((subject) => {
    const value = slugify(subject);
    if (PROGRAMMING_LANGS.has(subjectSlug) || PROGRAMMING_LANGS.has(value)) return value === subjectSlug;
    return value === subjectSlug
      || (subjectSlug.length >= 4 && (value.includes(subjectSlug) || subjectSlug.includes(value)));
  });
}

function topicMatchScore(entry, analysis) {
  const topicSlug = slugify(analysis.topic);
  if (!topicSlug) return 0;
  return Math.max(
    0,
    ...(entry.topics || []).map((topic) => {
      const value = slugify(topic);
      if (value === topicSlug) return 8;
      if (value.includes(topicSlug) || topicSlug.includes(value)) return 4;
      return 0;
    }),
  );
}

function domainsForSubject(subjectSlug) {
  const domains = new Set();
  if (!subjectSlug) return domains;
  for (const entry of TRUSTED_RESOURCE_CATALOG) {
    const matches = (entry.subjects || []).some((subject) => slugify(subject) === subjectSlug);
    if (matches) (entry.domains || []).forEach((domain) => domains.add(domain));
  }
  return domains;
}

function domainsForTopic(topicSlug) {
  const domains = new Set();
  if (!topicSlug) return domains;
  for (const entry of TRUSTED_RESOURCE_CATALOG) {
    const matches = (entry.topics || []).some((topic) => {
      const value = slugify(topic);
      return value === topicSlug || value.includes(topicSlug) || topicSlug.includes(value);
    });
    if (matches) (entry.domains || []).forEach((domain) => domains.add(domain));
  }
  return domains;
}

function inferredDomains(analysis) {
  const domains = new Set();
  const domainSlug = slugify(analysis.domain);
  if (domainSlug) domains.add(domainSlug);

  const subjectSlug = slugify(analysis.subject);
  domainsForSubject(subjectSlug).forEach((domain) => domains.add(domain));
  domainsForTopic(slugify(analysis.topic)).forEach((domain) => domains.add(domain));

  const strongTerms = tokenize(
    analysis.goalTitle,
    analysis.goalDescription,
    analysis.subject,
    analysis.topic,
    analysis.taskTitle,
    analysis.taskDescription,
    analysis.milestoneTitle,
    analysis.milestoneDescription,
  );

  for (const term of analysis.matchingTerms || []) {
    if (!isWeakInferenceToken(term)) strongTerms.add(term);
  }

  for (const entry of TRUSTED_RESOURCE_CATALOG) {
    if (!entrySubjectAligns(entry, analysis)) continue;
    for (const domain of entry.domains || []) {
      const parts = domain.split('-').filter((part) => part.length >= 3 && !isWeakInferenceToken(part));
      if (parts.some((part) => strongTerms.has(part))) domains.add(domain);
      const compact = domain.replace(/-/g, '');
      if (strongTerms.has(compact)) domains.add(domain);
    }
  }

  return domains;
}

function analysisHasSpecificSubject(analysis) {
  const subject = slugify(analysis?.subject);
  if (!subject || isWeakInferenceToken(subject)) return false;
  if (GENERIC_SUBJECTS.has(subject)) return false;
  return true;
}

function entrySubjectAligns(entry, analysis) {
  const expanded = expandAnalysisVocabulary(analysis);
  const analysisTopic = slugify(expanded.topic);

  if (subjectMatches(entry, expanded)) return true;
  if (topicMatchScore(entry, expanded) > 0) return true;

  if (!analysisHasSpecificSubject(expanded) && !analysisTopic) return true;

  const entrySubjects = (entry.subjects || []).map((subject) => slugify(subject)).filter(Boolean);
  const entryTopics = (entry.topics || []).map((topic) => slugify(topic)).filter(Boolean);
  const entryKeywords = (entry.keywords || []).map((keyword) => slugify(keyword)).filter(Boolean);

  const terms = new Set();
  if (analysisTopic) terms.add(analysisTopic);
  for (const term of expanded.matchingTerms || []) {
    if (isWeakInferenceToken(term)) continue;
    const normalized = slugify(term) || String(term).toLowerCase();
    if (normalized) terms.add(normalized);
  }
  for (const term of tokenize(
    expanded.taskTitle,
    expanded.taskDescription,
    expanded.goalTitle,
    expanded.milestoneTitle,
  )) {
    if (!isWeakInferenceToken(term)) terms.add(term);
  }

  for (const term of terms) {
    if (term.length < 3) continue;
    if (entrySubjects.some((subject) => termsOverlap(term, subject) >= 3 || sharedStem(term, subject, 4))) {
      return true;
    }
    if (entryTopics.some((topic) => termsOverlap(term, topic) >= 3 || sharedStem(term, topic, 4))) {
      return true;
    }
    if (entryKeywords.some((keyword) => termsOverlap(term, keyword) >= 3)) return true;
  }

  return false;
}

function hasStrongSignal(entry, analysis) {
  if (topicMatchScore(entry, analysis) > 0) return true;
  if (subjectMatches(entry, analysis)) return true;

  const contextTerms = tokenize(
    analysis.goalTitle,
    analysis.goalDescription,
    analysis.roadmapTitle,
    analysis.roadmapDescription,
    analysis.milestoneTitle,
    analysis.milestoneDescription,
    analysis.taskTitle,
    analysis.taskDescription,
    ...(analysis.matchingTerms || []),
  );

  for (const term of contextTerms) {
    if (isWeakInferenceToken(term)) continue;
    if ((entry.subjects || []).some((subject) => termsOverlap(term, slugify(subject)) > 0)) return true;
    if ((entry.topics || []).some((topic) => termsOverlap(term, slugify(topic)) > 0)) return true;
    if ((entry.keywords || []).some((keyword) => termsOverlap(term, slugify(keyword)) > 0)) return true;
  }

  return false;
}

function domainCompatible(entry, inferred, analysis) {
  if ((entry.domains || []).some((domain) => inferred.has(domain))) return true;
  if (!inferred.size) return true;

  if (topicMatchScore(entry, analysis) > 0) return true;
  if (subjectMatches(entry, analysis)) return true;

  const domainSlug = slugify(analysis.domain);
  if (domainSlug && (entry.domains || []).includes(domainSlug)) return true;

  return false;
}

function subjectCompatible(entry, analysis) {
  if (!entrySubjectAligns(entry, analysis)) return false;

  const subjectSlug = slugify(analysis.subject);
  if (!subjectSlug) return true;

  if (PROGRAMMING_LANGS.has(subjectSlug)) {
    const entryLangs = (entry.subjects || []).map((subject) => slugify(subject)).filter((value) => PROGRAMMING_LANGS.has(value));
    if (entryLangs.length > 0 && !entryLangs.includes(subjectSlug)) return false;
  }

  const nonProgrammingDomains = new Set(['medicine', 'law', 'business-finance', 'mechanical-engineering', 'civil-engineering', 'electrical-engineering', 'mathematics-science']);
  const analysisDomain = slugify(analysis.domain);
  if (analysisDomain && nonProgrammingDomains.has(analysisDomain)) {
    const entryDomains = entry.domains || [];
    const isProgrammingOnly = entryDomains.every((domain) => (
      ['computer-science', 'programming', 'web-development', 'data-structures-algorithms', 'ai-ml'].includes(domain)
    ));
    if (isProgrammingOnly && entryDomains.length > 0) return false;
  }

  return true;
}

function scoreEntry(entry, analysis) {
  let score = 0;
  const queryTerms = tokenize(
    analysis.domain,
    analysis.subject,
    analysis.topic,
    analysis.learningObjective,
    analysis.goalTitle,
    analysis.goalDescription,
    analysis.roadmapTitle,
    analysis.roadmapDescription,
    analysis.milestoneTitle,
    analysis.milestoneDescription,
    analysis.taskTitle,
    analysis.taskDescription,
    ...(analysis.matchingTerms || []),
  );
  const catalog = entryTerms(entry);

  score += topicMatchScore(entry, analysis);

  if (subjectMatches(entry, analysis)) score += 6;

  const domainSlug = slugify(analysis.domain);
  if (domainSlug && (entry.domains || []).includes(domainSlug)) score += 5;

  for (const queryTerm of queryTerms) {
    if (isWeakInferenceToken(queryTerm)) continue;
    for (const catalogTerm of catalog) {
      score += termsOverlap(queryTerm, catalogTerm);
      score += termsOverlap(queryTerm, slugify(catalogTerm));
    }
  }

  const difficulty = slugify(analysis.difficulty);
  if (difficulty && Array.isArray(entry.difficulty) && entry.difficulty.includes(difficulty)) {
    score += 1;
  }

  if (domainSlug && (entry.domains || []).length && !(entry.domains || []).includes(domainSlug)) {
    score = Math.floor(score * 0.35);
  }

  return score;
}

function toTaskResource(entry) {
  return {
    category: entry.category,
    title: entry.name,
    url: entry.url,
    source: 'catalog',
  };
}

function evaluateEntry(entry, analysis) {
  const expandedAnalysis = expandAnalysisVocabulary(analysis);
  const inferred = inferredDomains(expandedAnalysis);
  const score = scoreEntry(entry, expandedAnalysis);
  const strong = hasStrongSignal(entry, expandedAnalysis);
  const domainOk = domainCompatible(entry, inferred, expandedAnalysis);
  const subjectOk = subjectCompatible(entry, expandedAnalysis);
  const topicScore = topicMatchScore(entry, expandedAnalysis);
  const passes = score >= MIN_MATCH_SCORE && strong && domainOk && subjectOk;

  return {
    id: entry.id,
    name: entry.name,
    score,
    strongSignal: strong,
    domainCompatible: domainOk,
    subjectCompatible: subjectOk,
    topicMatch: topicScore,
    inferredDomains: [...inferred],
    passes,
  };
}

function matchCatalogResources(analysis) {
  if (!analysis) return [];

  const expandedAnalysis = expandAnalysisVocabulary(analysis);
  const inferred = inferredDomains(expandedAnalysis);
  const ranked = TRUSTED_RESOURCE_CATALOG
    .map((entry) => ({ entry, score: scoreEntry(entry, expandedAnalysis) }))
    .filter(({ entry, score }) => (
      score >= MIN_MATCH_SCORE
      && hasStrongSignal(entry, expandedAnalysis)
      && domainCompatible(entry, inferred, expandedAnalysis)
      && subjectCompatible(entry, expandedAnalysis)
    ))
    .sort((a, b) => b.score - a.score);

  const usedUrls = new Set();
  const resources = [];

  for (const { entry } of ranked) {
    if (usedUrls.has(entry.url)) continue;
    usedUrls.add(entry.url);
    resources.push(toTaskResource(entry));
  }

  return resources;
}

module.exports = {
  matchCatalogResources,
  scoreEntry,
  expandAnalysisVocabulary,
  evaluateEntry,
  inferredDomains,
  hasStrongSignal,
  domainCompatible,
  subjectCompatible,
  entrySubjectAligns,
  analysisHasSpecificSubject,
  topicMatchScore,
  TRUSTED_RESOURCE_CATALOG,
};
