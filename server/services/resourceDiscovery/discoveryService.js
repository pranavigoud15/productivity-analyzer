const { matchCatalogResources } = require('../resourceCatalogService');
const { buildDiscoveryQueries } = require('./discoveryQueries');
const { discoverWikipedia } = require('./providers/wikipediaProvider');
const { discoverOpenAlex } = require('./providers/openAlexProvider');
const { mergeAndRankResources } = require('./resourceRanker');

const CATALOG_SUFFICIENT_THRESHOLD = 3;
const MAX_TOTAL_RESOURCES = 8;

function isDiscoveryEnabled() {
  return process.env.RESOURCE_DISCOVERY_ENABLED !== 'false';
}

function getConfiguredProviders() {
  const raw = process.env.RESOURCE_DISCOVERY_PROVIDERS || 'wikipedia,openalex';
  return raw.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
}

async function runDiscoveryProviders(queries, analysis) {
  const providers = getConfiguredProviders();
  const discovered = [];

  if (providers.includes('wikipedia')) {
    const wiki = await discoverWikipedia(queries);
    discovered.push(...wiki);
  }

  if (providers.includes('openalex')) {
    const academic = await discoverOpenAlex(queries, analysis);
    discovered.push(...academic);
  }

  return discovered;
}

async function discoverTaskResources(enrichment, context, analysis) {
  const catalogResources = matchCatalogResources(analysis).map((resource) => ({
    ...resource,
    source: 'catalog',
    trustLevel: 'curated',
  }));

  if (!isDiscoveryEnabled()) {
    return catalogResources;
  }

  const queries = buildDiscoveryQueries(enrichment, context);
  if (!queries.length) return catalogResources;

  let discovered = [];
  try {
    discovered = await runDiscoveryProviders(queries, analysis);
  } catch (err) {
    console.warn(`[ResourceDiscovery] Provider error: ${err.message}`);
  }

  return mergeAndRankResources(catalogResources, discovered, analysis, {
    maxTotal: MAX_TOTAL_RESOURCES,
    catalogSufficientThreshold: CATALOG_SUFFICIENT_THRESHOLD,
  });
}

module.exports = {
  discoverTaskResources,
  buildDiscoveryQueries,
  isDiscoveryEnabled,
};
