#!/usr/bin/env node
/**
 * ai-dashboard CLI.
 *
 * Usage:
 *   ai-dashboard [options]
 *
 * Options:
 *   --registry <path>      TOML/JSON registry file (default: $DASHBOARD_REGISTRY)
 *   --port <n>             Port to listen on (default: registry.meta.port or 3491)
 *   --host <addr>          Bind address (default: 127.0.0.1)
 *   --brand <name>         Override registry brand
 *   --static-extra <dir>   Extra static dir to serve (repeatable; consumer-supplied pages)
 *   --version              Print version and exit
 *   --help                 Print this help and exit
 *
 * Env vars (used as fallbacks):
 *   DASHBOARD_REGISTRY     same as --registry
 *   DASHBOARD_PORT         same as --port
 *   DASHBOARD_BRAND        same as --brand
 *   DASHBOARD_USE_REAL_ORGAN_CLIENT=1   swap stub → HttpOrganClient
 *   DASHBOARD_USE_REAL=all              swap every key to real
 */

const path = require("path");
const fs = require("fs");
const pkg = require("../package.json");

function parseArgs(argv) {
  const out = { staticExtras: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--registry") out.registry = next();
    else if (a === "--port") out.port = parseInt(next(), 10);
    else if (a === "--host") out.host = next();
    else if (a === "--brand") out.brand = next();
    else if (a === "--static-extra") out.staticExtras.push(next());
    else if (a === "--version" || a === "-v") out.version = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function printHelp() {
  console.log(
    `ai-dashboard ${pkg.version}\n\n` +
    `Operator dashboard for an AI nervous system.\n\n` +
    `Usage:\n` +
    `  ai-dashboard [options]\n\n` +
    `Options:\n` +
    `  --registry <path>      TOML/JSON registry file (or DASHBOARD_REGISTRY)\n` +
    `  --port <n>             Port (default: registry.meta.port or 3491)\n` +
    `  --host <addr>          Bind address (default: 127.0.0.1)\n` +
    `  --brand <name>         Override registry brand\n` +
    `  --static-extra <dir>   Extra static dir (repeatable)\n` +
    `  --version              Print version\n` +
    `  --help                 Print this help\n\n` +
    `Examples:\n` +
    `  ai-dashboard --registry ./examples/simple/registry.toml\n` +
    `  ai-dashboard --registry ./registry.json --port 3491\n` +
    `  DASHBOARD_USE_REAL_ORGAN_CLIENT=1 ai-dashboard --registry ./registry.toml\n`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.version) { console.log(pkg.version); return 0; }
  if (args.help) { printHelp(); return 0; }

  const registryPath = args.registry || process.env.DASHBOARD_REGISTRY;
  if (!registryPath) {
    console.error("error: --registry <path> is required (or set DASHBOARD_REGISTRY)\n");
    printHelp();
    return 2;
  }
  if (!fs.existsSync(registryPath)) {
    console.error(`error: registry file not found: ${path.resolve(registryPath)}`);
    return 2;
  }

  const port = args.port || (process.env.DASHBOARD_PORT ? parseInt(process.env.DASHBOARD_PORT, 10) : undefined);
  const brand = args.brand || process.env.DASHBOARD_BRAND;

  const { startDashboard } = require("..");

  try {
    const { server } = await startDashboard({
      registry: registryPath,
      port,
      brand,
      host: args.host,
      staticExtras: args.staticExtras,
    });

    const shutdown = () => {
      console.log("\n[ai-dashboard] shutting down...");
      try { server.close(); } catch (_) {}
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error(`[ai-dashboard] fatal: ${err.message || err}`);
    if (process.env.DEBUG) console.error(err.stack);
    return 1;
  }
  return 0;
}

main().then((code) => { if (code) process.exit(code); }).catch((err) => {
  console.error(err);
  process.exit(1);
});
