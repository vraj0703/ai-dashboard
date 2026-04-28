/**
 * ai-dashboard constants — defaults only. Per-instance values are
 * supplied via the registry (TOML/JSON) or CLI/env overrides.
 */
module.exports = {
  DEFAULT_PORT: 3491,
  DEFAULT_BRAND: "AI Nervous System",
  DEFAULT_TAGLINE: "Organs · Metrics · Network",
  NET_LOG_MAX: 500,
  HEALTH_TIMEOUT_MS: 5000,
  PROXY_TIMEOUT_MS: 15000,
};
