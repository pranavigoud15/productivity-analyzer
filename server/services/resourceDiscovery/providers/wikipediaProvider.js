const { validateResourceUrl } = require('../urlValidator');
const { trustLevelForUrl } = require('../trustDomains');

const MAX_WIKIPEDIA_RESULTS = 3;

async function searchWikipedia(query) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    format: 'json',
    origin: '*',
    srlimit: String(MAX_WIKIPEDIA_RESULTS),
  });

  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'ProductivityAnalyzer/1.0 (educational resource discovery)' },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const items = data?.query?.search || [];
  const candidates = [];

  for (const item of items) {
    const title = String(item.title || '').trim();
    if (!title) continue;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    candidates.push({
      category: 'other',
      title: `${title} — Wikipedia`,
      url,
      source: 'wikipedia',
      description: String(item.snippet || '').replace(/<[^>]+>/g, ''),
      provider: 'wikipedia',
      trustLevel: trustLevelForUrl(url, 'wikipedia'),
    });
  }

  return candidates;
}

async function discoverWikipedia(queries) {
  const seen = new Set();
  const results = [];

  for (const query of queries) {
    const items = await searchWikipedia(query);
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

module.exports = { discoverWikipedia, searchWikipedia };
