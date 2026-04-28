/**
 * HttpOrganClient — IOrganClient implementation using native fetch().
 *
 * Talks to an arbitrary set of organs supplied via `urls` map.
 * Never throws on organ-down; returns OrganStatus with status "down".
 */

const { IOrganClient } = require("../../../domain/repositories/i_organ_client");
const { OrganStatus } = require("../../../domain/entities/organ_status");
const { UnknownOrganError } = require("../../../domain/exceptions");
const { HEALTH_TIMEOUT_MS, PROXY_TIMEOUT_MS } = require("../../../domain/constants");

function portOf(url) {
  const m = (url || "").match(/:(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

class HttpOrganClient extends IOrganClient {
  constructor({ urls = {}, healthTimeoutMs = HEALTH_TIMEOUT_MS, proxyTimeoutMs = PROXY_TIMEOUT_MS } = {}) {
    super();
    this.urls = urls;
    this.healthTimeoutMs = healthTimeoutMs;
    this.proxyTimeoutMs = proxyTimeoutMs;
  }

  list() { return Object.keys(this.urls); }

  _baseUrl(organ) {
    const base = this.urls[organ];
    if (!base) throw new UnknownOrganError(organ);
    return base;
  }

  async health(organ) {
    const base = this._baseUrl(organ);
    const port = portOf(base);
    try {
      const res = await fetch(`${base}/health`, {
        signal: AbortSignal.timeout(this.healthTimeoutMs),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return new OrganStatus({
          organ, port, status: "error",
          details: { httpStatus: res.status, body: data },
        });
      }
      return new OrganStatus({
        organ, port,
        status: data.status === "running" || data.status === "ok" ? "running" : (data.status || "running"),
        version: data.version || null,
        details: data,
      });
    } catch (err) {
      return OrganStatus.down(organ, port, err.message || err);
    }
  }

  async fetch(organ, path, opts = {}) {
    const base = this._baseUrl(organ);
    const url = `${base}${path.startsWith("/") ? path : "/" + path}`;
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: opts.headers || {},
      body: opts.body,
      signal: AbortSignal.timeout(opts.timeout || this.proxyTimeoutMs),
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  }

  async aggregateAll() {
    const pairs = await Promise.all(
      this.list().map(async (organ) => [organ, await this.health(organ)])
    );
    return Object.fromEntries(pairs);
  }
}

module.exports = { HttpOrganClient };
