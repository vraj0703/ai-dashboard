/**
 * StubOrganClient — IOrganClient that returns canned health responses.
 *
 * Default for the dashboard so it runs without any organs reachable.
 * Useful for: onboarding demos, CI smoke tests, offline development.
 *
 * Each organ in `urls` is reported as "running" with deterministic
 * fake version strings derived from the organ name.
 */

const { IOrganClient } = require("../../../../domain/repositories/i_organ_client");
const { OrganStatus } = require("../../../../domain/entities/organ_status");
const { UnknownOrganError } = require("../../../../domain/exceptions");

function portOf(url) {
  const m = (url || "").match(/:(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function fakeVersion(organ) {
  let h = 0;
  for (const c of organ) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  const minor = Math.abs(h) % 9;
  const patch = (Math.abs(h) >> 3) % 9;
  return `0.${minor}.${patch}-stub`;
}

class StubOrganClient extends IOrganClient {
  constructor({ urls = {}, defaultStatus = "running" } = {}) {
    super();
    this.urls = urls;
    this.defaultStatus = defaultStatus;
  }

  list() { return Object.keys(this.urls); }

  _check(organ) {
    if (!this.urls[organ]) throw new UnknownOrganError(organ);
  }

  async health(organ) {
    this._check(organ);
    return new OrganStatus({
      organ,
      port: portOf(this.urls[organ]),
      status: this.defaultStatus,
      version: fakeVersion(organ),
      details: { stub: true },
    });
  }

  async fetch(organ, path, _opts = {}) {
    this._check(organ);
    return {
      ok: true,
      status: 200,
      data: { stub: true, organ, path, message: "stubbed response" },
    };
  }

  async aggregateAll() {
    const pairs = await Promise.all(
      this.list().map(async (organ) => [organ, await this.health(organ)])
    );
    return Object.fromEntries(pairs);
  }
}

module.exports = { StubOrganClient };
