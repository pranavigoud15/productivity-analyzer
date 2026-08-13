const { isTrustedHostname, hostnameFromUrl } = require('./trustDomains');

const VALIDATE_TIMEOUT_MS = 8000;
const BLOCKED_HOSTS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
  'pinterest.com', 'facebook.com', 'instagram.com', 'tiktok.com',
]);

function isValidUrlFormat(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function validateResourceUrl(url) {
  if (!isValidUrlFormat(url)) return { ok: false, reason: 'invalid-format' };

  const host = hostnameFromUrl(url);
  if (!host || BLOCKED_HOSTS.has(host)) return { ok: false, reason: 'blocked-host' };
  if (!isTrustedHostname(host)) return { ok: false, reason: 'untrusted-domain' };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ProductivityAnalyzer/1.0 (educational resource validator)' },
    });
    clearTimeout(timer);

    if (response.status >= 200 && response.status < 400) {
      return { ok: true, finalUrl: response.url || url };
    }

    if (response.status === 405 || response.status === 403) {
      return { ok: true, finalUrl: url, soft: true };
    }

    return { ok: false, reason: `http-${response.status}` };
  } catch (err) {
    if (host.endsWith('wikipedia.org')) {
      return { ok: true, finalUrl: url, soft: true };
    }
    return { ok: false, reason: err.name === 'AbortError' ? 'timeout' : 'fetch-failed' };
  }
}

module.exports = { validateResourceUrl, isValidUrlFormat };
