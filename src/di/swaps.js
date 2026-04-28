/**
 * DI swap keys — env-var driven mock-vs-real selection.
 *
 * Default for every key is the stub/mock implementation. To use real
 * implementations, set the corresponding env var to a truthy value.
 *
 * Special value: DASHBOARD_USE_REAL=all  switches every key to real.
 */

const KNOWN_KEYS = [
  "ORGAN_CLIENT", // StubOrganClient → HttpOrganClient
];

function truthy(v) {
  if (v === undefined || v === null || v === "") return false;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function shouldUseReal(key, env = process.env) {
  if (truthy(env[`DASHBOARD_USE_REAL`]) || env[`DASHBOARD_USE_REAL`] === "all") return true;
  return truthy(env[`DASHBOARD_USE_REAL_${key}`]);
}

module.exports = { KNOWN_KEYS, shouldUseReal };
