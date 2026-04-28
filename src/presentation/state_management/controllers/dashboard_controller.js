/**
 * DashboardController — HTTP-to-domain adapter for ai-dashboard.
 */

const {
  aggregateHealth,
  logNetworkEvent,
  tailEvents,
} = require("../../../domain/use_cases");
const { UnknownOrganError } = require("../../../domain/exceptions");

class DashboardController {
  constructor(deps) {
    this.organClient = deps.organClient;
    this.eventStore = deps.eventStore;
    this.registry = deps.registry || null;
    this.config = deps.config || null;
  }

  organNames() {
    return this.organClient.list();
  }

  meta() {
    return {
      brand: this.registry?.meta?.brand,
      tagline: this.registry?.meta?.tagline,
      name: this.registry?.meta?.name,
      organs: this.registry?.organs?.map((o) => ({
        name: o.name, url: o.url, badge: o.badge, proxy_path: o.proxy_path,
      })) || this.organNames().map((n) => ({ name: n })),
    };
  }

  async aggregateHealth() {
    const result = await aggregateHealth({ organClient: this.organClient });
    const out = {};
    for (const [k, v] of Object.entries(result)) out[k] = v.toJSON();
    return out;
  }

  async organHealth(organ) {
    if (!this.organNames().includes(organ)) throw new UnknownOrganError(organ);
    const status = await this.organClient.health(organ);
    return status.toJSON();
  }

  async proxy(organ, path, opts) {
    if (!this.organNames().includes(organ)) throw new UnknownOrganError(organ);
    return this.organClient.fetch(organ, path, opts);
  }

  logEvent(event) {
    return logNetworkEvent({ event, eventStore: this.eventStore }).toJSON();
  }

  tailEvents(limit) {
    return tailEvents({ eventStore: this.eventStore, limit }).map((e) => e.toJSON());
  }

  subscribeEvents(cb) {
    return this.eventStore.subscribe(cb);
  }

  eventCount() {
    return this.eventStore.size();
  }
}

module.exports = { DashboardController };
