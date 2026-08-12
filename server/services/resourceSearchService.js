const TRUSTED_DOMAINS = {
  official: ['react.dev', 'developer.mozilla.org', 'nodejs.org', 'expressjs.com', 'mongodb.com', 'python.org', 'docs.oracle.com', 'learn.microsoft.com', 'npmjs.com'],
  tutorial: ['freecodecamp.org', 'javascript.info', 'digitalocean.com', 'dev.to', 'geeksforgeeks.org', 'w3schools.com', 'baeldung.com'],
  video: ['youtube.com', 'scrimba.com', 'egghead.io'],
  practice: ['leetcode.com', 'hackerrank.com', 'codewars.com', 'github.com', 'replit.com'],
};

function categoryForUrl(url) {
  let host;
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  return Object.entries(TRUSTED_DOMAINS).find(([, domains]) => domains.some(domain => host === domain || host.endsWith(`.${domain}`)))?.[0] || null;
}

function isRelevantResult(item, topic) {
  const terms = String(topic).toLowerCase().match(/[a-z0-9+#.]{3,}/g)?.filter(term => !['week', 'learn', 'apply', 'tutorial', 'documentation', 'practice', 'review', 'basics'].includes(term)) || [];
  if (!terms.length) return false;
  const haystack = `${item.title || ''} ${item.description || ''} ${item.url || ''}`.toLowerCase();
  return terms.some(term => haystack.includes(term));
}

async function searchResources(topic) {
  if (!process.env.BRAVE_SEARCH_API_KEY) return [];
  const query = encodeURIComponent(`${topic} tutorial documentation practice`);
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${query}&count=12`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY },
  });
  if (!response.ok) throw new Error(`Brave search failed (${response.status})`);
  const results = (await response.json()).web?.results || [];
  const used = new Set();
  return results.reduce((resources, item) => {
    const category = categoryForUrl(item.url);
    if (!category || used.has(category) || !item.title || !item.url || !isRelevantResult(item, topic)) return resources;
    used.add(category);
    resources.push({ category, title: item.title.slice(0, 180), url: item.url, source: 'brave' });
    return resources;
  }, []);
}

module.exports = { searchResources };
