/**
 * ai-dashboard — main entry.
 *
 * Programmatic API:
 *   const { startDashboard } = require("@vraj0703/ai-dashboard");
 *   const server = await startDashboard({
 *     registry: { meta: { brand: "..." }, organs: [...] },
 *     port: 3491,
 *   });
 */

const { createContainer } = require("./di/container");
const { DashboardController } = require("./presentation/state_management/controllers/dashboard_controller");
const { createServer } = require("./presentation/pages/server");
const { parseRegistry, organUrlsFromRegistry } = require("./domain/use_cases/parse_registry");
const { loadRegistryFile } = require("./data/data_sources/local/registry_loader");

/**
 * Start the dashboard programmatically.
 *
 * @param {object} opts
 * @param {object|string} opts.registry — parsed registry object OR path to .toml/.json
 * @param {number} [opts.port]
 * @param {string} [opts.brand]
 * @param {string} [opts.host]
 * @param {string[]} [opts.staticExtras]
 * @returns {Promise<{server: import('http').Server, container: object, dashboard: DashboardController}>}
 */
async function startDashboard(opts = {}) {
  let registry = opts.registry;
  if (typeof registry === "string") registry = loadRegistryFile(registry);
  if (registry && (!registry.meta || !registry.organs || !Array.isArray(registry.organs))) {
    registry = parseRegistry(registry);
  } else if (registry) {
    // Already shaped — re-parse to apply defaults / validation
    registry = parseRegistry(registry);
  } else {
    throw new Error("startDashboard requires a registry");
  }

  const container = createContainer({
    registry,
    port: opts.port,
    brand: opts.brand,
    projectRoot: opts.projectRoot,
  });

  banner(container);

  const dashboard = new DashboardController({ ...container, config: container.config });
  const { listen } = createServer({
    dashboard,
    port: container.config.port,
    host: opts.host || "127.0.0.1",
    staticExtras: opts.staticExtras || [],
  });
  const server = await listen();
  return { server, container, dashboard };
}

function banner(container) {
  const { brand, tagline, port, useRealOrganClient } = container.config;
  console.log();
  const title = `  ${brand}  Dashboard`;
  const sub = tagline ? `  ${tagline}` : "";
  console.log(title);
  if (sub) console.log(sub);
  console.log(`  port=${port}  organ_client=${useRealOrganClient ? "real (HTTP)" : "stub (mock)"}`);
  console.log(`  organs:`);
  for (const [organ, url] of Object.entries(container.config.organUrls)) {
    console.log(`    - ${organ.padEnd(12)} -> ${url}`);
  }
  console.log();
}

module.exports = {
  startDashboard,
  createContainer,
  DashboardController,
  createServer,
  parseRegistry,
  organUrlsFromRegistry,
  loadRegistryFile,
};
