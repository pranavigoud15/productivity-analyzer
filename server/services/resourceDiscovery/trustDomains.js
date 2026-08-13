const { TRUSTED_RESOURCE_CATALOG } = require('../../data/trustedResourceCatalog');

const TRUSTED_SUFFIXES = ['.edu', '.gov', '.ac.uk', '.edu.au'];
const TRUSTED_DOMAINS = new Set([
  'wikipedia.org',
  'wikimedia.org',
  'en.wikipedia.org',
]);

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function buildTrustedDomainsFromCatalog() {
  const domains = new Set(TRUSTED_DOMAINS);
  for (const entry of TRUSTED_RESOURCE_CATALOG) {
    const host = hostnameFromUrl(entry.url);
    if (host) domains.add(host);
  }
  return domains;
}

let cachedCatalogDomains = null;

function getCatalogTrustedDomains() {
  if (!cachedCatalogDomains) cachedCatalogDomains = buildTrustedDomainsFromCatalog();
  return cachedCatalogDomains;
}

function isTrustedHostname(hostname) {
  if (!hostname) return false;
  const host = hostname.replace(/^www\./, '').toLowerCase();
  if (getCatalogTrustedDomains().has(host)) return true;
  return TRUSTED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function trustLevelForUrl(url, providerId) {
  if (providerId === 'catalog') return 'curated';
  const host = hostnameFromUrl(url);
  if (host.endsWith('wikipedia.org')) return 'reference';
  if (providerId === 'openalex') return 'academic';
  if (TRUSTED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return 'official';
  if (getCatalogTrustedDomains().has(host)) return 'curated';
  return 'reference';
}

module.exports = {
  hostnameFromUrl,
  isTrustedHostname,
  trustLevelForUrl,
  getCatalogTrustedDomains,
};
