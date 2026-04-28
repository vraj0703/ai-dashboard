/**
 * DI Container — wires ai-dashboard dependencies together.
 *
 * Single createContainer(config) function, returns flat object.
 * Default organ client is the StubOrganClient. Swap to HttpOrganClient
 * by setting DASHBOARD_USE_REAL_ORGAN_CLIENT=1 (or DASHBOARD_USE_REAL=all).
 */

const { MemoryEventStore } = require("../data/data_sources/local/memory_event_store");
const { StubOrganClient } = require("../data/data_sources/local/stubs/stub_organ_client");
const { HttpOrganClient } = require("../data/data_sources/remote/http_organ_client");
const {
  parseRegistry,
  organUrlsFromRegistry,
} = require("../domain/use_cases/parse_registry");
const { NET_LOG_MAX, DEFAULT_PORT, DEFAULT_BRAND } = require("../domain/constants");
const { shouldUseReal } = require("./swaps");

/**
 * @param {object} config
 * @param {object} config.registry — already parsed registry object (from registry_loader + parseRegistry)
 * @param {string} [config.projectRoot]
 * @param {number} [config.port]                 — overrides registry.meta.port
 * @param {string} [config.brand]                — overrides registry.meta.brand
 * @param {number} [config.netLogMax]
 * @param {object} [config.env]                  — defaults to process.env
 */
function createContainer(config = {}) {
  const env = config.env || process.env;
  const registry = config.registry
    ? (config.registry.meta && config.registry.organs ? config.registry : parseRegistry(config.registry))
    : null;

  if (!registry) throw new Error("createContainer requires a parsed registry — use loadRegistryFile() then parseRegistry()");

  const projectRoot = config.projectRoot || process.cwd();
  const port = config.port || registry.meta.port || DEFAULT_PORT;
  const brand = config.brand || registry.meta.brand || DEFAULT_BRAND;
  const tagline = config.tagline || registry.meta.tagline;
  const netLogMax = config.netLogMax || NET_LOG_MAX;
  const organUrls = organUrlsFromRegistry(registry);

  // ─── Stores / clients ───
  const eventStore = new MemoryEventStore({ max: netLogMax });

  const useRealOrganClient = shouldUseReal("ORGAN_CLIENT", env);
  const organClient = useRealOrganClient
    ? new HttpOrganClient({ urls: organUrls })
    : new StubOrganClient({ urls: organUrls });

  return {
    eventStore,
    organClient,
    registry,
    config: {
      projectRoot,
      port,
      brand,
      tagline,
      organUrls,
      netLogMax,
      useRealOrganClient,
    },
  };
}

module.exports = { createContainer };
