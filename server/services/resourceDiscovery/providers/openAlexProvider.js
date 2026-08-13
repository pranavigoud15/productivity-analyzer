const { validateResourceUrl } = require('../urlValidator');
const { trustLevelForUrl, isTrustedHostname, hostnameFromUrl } = require('../trustDomains');

const ACADEMIC_DOMAINS = new Set([
  'medicine', 'law', 'mechanical-engineering', 'civil-engineering',
  'electrical-engineering', 'mathematics-science', 'ai-ml', 'business-finance',
]);

const MAX_OPENALEX_RESULTS = 3;

function shouldUseOpenAlex(analysis) {
  const domain = String(analysis.domain || '').toLowerCase();
  return ACADEMIC_DOMAINS.has(domain);
}

async function searchOpenAlex(query) {
  const params = new URLSearchParams({
    search: query,
    per_page: String(MAX_OPENALEX_RESULTS),
  });

  const response = await fetch(`https://api.openalex.org/works?${params}`, {
    headers: { 'User-Agent': 'ProductivityAnalyzer/1.0 (mailto:support@example.com)' },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const results = data?.results || [];
  const candidates = [];

  for (const work of results) {
    const title = String(work.title || work.display_name || '').trim();
    const url = work.primary_location?.landing_page_url
      || work.primary_location?.source?.homepage_url
      || '';
    if (!title || !url || !url.startsWith('http')) continue;

    const host = hostnameFromUrl(url);
    if (!isTrustedHostname(host) && !host.endsWith('.edu') && !host.endsWith('.gov')) continue;

    candidates.push({
      category: 'other',
      title,
      url,
      source: 'openalex',
      description: 'Academic reference',
      provider: 'openalex',
      trustLevel: trustLevelForUrl(url, 'openalex'),
    });
  }

  return candidates;
}

async function discoverOpenAlex(queries, analysis) {
  if (!shouldUseOpenAlex(analysis)) return [];

  const seen = new Set();
  const results = [];

  for (const query of queries) {
    const items = await searchOpenAlex(query);
    for (const item of items) {
      if (seen.has(item.url)) continue;
      const validation = await validateResourceUrl(item.url);
      if (!validation.ok) continue;
      seen.add(validation.finalUrl || item.url);
      results.push({
        ...item,
        url: validation.finalUrl || item.url,
      });
    }
  }

  return results;
}

module.exports = { discoverOpenAlex, shouldUseOpenAlex };
