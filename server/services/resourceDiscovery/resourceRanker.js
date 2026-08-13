const { expandAnalysisVocabulary, inferredDomains, analysisHasSpecificSubject } = require('../resourceCatalogService');

const WEAK_TERMS = new Set([
  'developer', 'development', 'fundamentals', 'programming', 'learning', 'study',
  'roadmap', 'path', 'track', 'plan', 'basics', 'concepts', 'module', 'course',
]);

function scoreDiscoveredResource(candidate, analysis) {
  const expanded = expandAnalysisVocabulary(analysis);
  const inferred = inferredDomains(expanded);
  let score = 0;

  const text = `${candidate.title} ${candidate.description || ''}`.toLowerCase();
  const subject = String(expanded.subject || '').toLowerCase();
  const topic = String(expanded.topic || '').toLowerCase();

  if (subject && subject.length >= 3 && text.includes(subject)) score += 4;
  if (topic && topic.length >= 4 && text.includes(topic)) score += 3;

  for (const term of expanded.matchingTerms || []) {
    if (WEAK_TERMS.has(term) || term.length < 3) continue;
    if (text.includes(term)) score += term.length >= 5 ? 2 : 1;
  }

  if (candidate.source === 'wikipedia') score += 1;
  if (candidate.trustLevel === 'curated') score += 2;
  if (candidate.trustLevel === 'academic') score += 2;

  return { score, expanded, inferred };
}

function discoveredSubjectAligns(candidate, analysis) {
  const text = `${candidate.title} ${candidate.description || ''}`.toLowerCase();
  const expanded = expandAnalysisVocabulary(analysis);

  const subject = String(expanded.subject || '').toLowerCase();
  const topic = String(expanded.topic || '').toLowerCase();
  if (subject.length >= 3 && text.includes(subject)) return true;
  if (topic.length >= 4 && text.includes(topic)) return true;

  let strongTermHits = 0;
  for (const term of expanded.matchingTerms || []) {
    if (WEAK_TERMS.has(term) || term.length < 4) continue;
    if (text.includes(term)) strongTermHits += 1;
  }

  if (strongTermHits > 0) return true;
  if (!analysisHasSpecificSubject(expanded) && !topic) return true;
  return false;
}

function passesDiscoveredFilters(candidate, analysis) {
  if (!discoveredSubjectAligns(candidate, analysis)) return false;
  const { score } = scoreDiscoveredResource(candidate, analysis);
  if (candidate.source === 'wikipedia') return score >= 2;
  if (candidate.source === 'openalex') return score >= 3;
  return score >= 2;
}

function mergeAndRankResources(catalogResources, discoveredResources, analysis, options = {}) {
  const maxTotal = options.maxTotal || 8;
  const catalogSufficient = catalogResources.length >= (options.catalogSufficientThreshold || 3);
  const maxDiscovery = catalogSufficient ? 2 : 5;

  const usedUrls = new Set();
  const merged = [];

  for (const resource of catalogResources) {
    if (usedUrls.has(resource.url)) continue;
    usedUrls.add(resource.url);
    merged.push({
      ...resource,
      source: resource.source || 'catalog',
      trustLevel: resource.trustLevel || 'curated',
    });
  }

  const rankedDiscovery = discoveredResources
    .map((candidate) => ({
      candidate,
      ...scoreDiscoveredResource(candidate, analysis),
    }))
    .filter(({ candidate }) => !usedUrls.has(candidate.url) && passesDiscoveredFilters(candidate, analysis))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDiscovery);

  for (const { candidate, score } of rankedDiscovery) {
    if (usedUrls.has(candidate.url)) continue;
    usedUrls.add(candidate.url);
    merged.push({
      category: candidate.category || 'other',
      title: candidate.title,
      url: candidate.url,
      source: candidate.source,
      description: candidate.description || '',
      trustLevel: candidate.trustLevel || 'reference',
      relevanceScore: score,
    });
    if (merged.length >= maxTotal) break;
  }

  return merged.slice(0, maxTotal);
}

module.exports = {
  mergeAndRankResources,
  scoreDiscoveredResource,
  passesDiscoveredFilters,
};
