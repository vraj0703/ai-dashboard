/**
 * parseRegistry — accept a registry object (already parsed from TOML/JSON)
 * and validate / normalize its shape.
 *
 * Schema:
 *   meta?: { name?, brand?, tagline?, port? }
 *   organs: [{ name, url, badge?, proxy_path? }]
 *
 * Returns a normalized object with safe defaults applied.
 */

const { RegistryError } = require("../exceptions");
const { DEFAULT_PORT, DEFAULT_BRAND, DEFAULT_TAGLINE } = require("../constants");

function parseRegistry(raw) {
  if (!raw || typeof raw !== "object") throw new RegistryError("registry must be an object");

  const meta = raw.meta || {};
  const organs = Array.isArray(raw.organs) ? raw.organs : [];

  if (organs.length === 0) {
    throw new RegistryError("registry.organs must be a non-empty array");
  }

  const seen = new Set();
  const normalized = organs.map((o, i) => {
    if (!o || typeof o !== "object") throw new RegistryError(`organs[${i}] must be an object`);
    if (!o.name || typeof o.name !== "string") throw new RegistryError(`organs[${i}].name is required`);
    if (!o.url || typeof o.url !== "string") throw new RegistryError(`organs[${i}].url is required`);
    if (seen.has(o.name)) throw new RegistryError(`organs[${i}].name "${o.name}" is duplicated`);
    seen.add(o.name);
    return {
      name: o.name,
      url: o.url.replace(/\/$/, ""),
      badge: o.badge || null,
      proxy_path: o.proxy_path || `/api/${o.name}`,
    };
  });

  return {
    meta: {
      name: meta.name || "ai-nervous-system",
      brand: meta.brand || DEFAULT_BRAND,
      tagline: meta.tagline || DEFAULT_TAGLINE,
      port: Number.isFinite(meta.port) ? meta.port : DEFAULT_PORT,
    },
    organs: normalized,
  };
}

function organUrlsFromRegistry(registry) {
  const out = {};
  for (const o of registry.organs) out[o.name] = o.url;
  return out;
}

module.exports = { parseRegistry, organUrlsFromRegistry };
