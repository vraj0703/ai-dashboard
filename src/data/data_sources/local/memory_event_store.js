/**
 * MemoryEventStore — in-memory ring buffer of NetworkEvents.
 *
 * Bounded FIFO store. Newest first on tail(). Synchronous.
 * Subscribers are notified on every append.
 */

const { IEventStore } = require("../../../domain/repositories/i_event_store");
const { NetworkEvent } = require("../../../domain/entities/network_event");
const { NET_LOG_MAX } = require("../../../domain/constants");

class MemoryEventStore extends IEventStore {
  constructor({ max = NET_LOG_MAX } = {}) {
    super();
    this.max = max;
    this._buf = []; // newest-first
    this._subs = new Set();
  }

  append(event) {
    const ev = event instanceof NetworkEvent ? event : new NetworkEvent(event);
    this._buf.unshift(ev);
    if (this._buf.length > this.max) this._buf.length = this.max;
    for (const cb of this._subs) {
      try { cb(ev); } catch (_) { /* subscriber must not break store */ }
    }
    return ev;
  }

  tail(n = 100) {
    return this._buf.slice(0, n);
  }

  subscribe(cb) {
    if (typeof cb !== "function") throw new Error("subscribe requires a function");
    this._subs.add(cb);
    return () => this._subs.delete(cb);
  }

  size() {
    return this._buf.length;
  }

  clear() {
    this._buf.length = 0;
  }
}

module.exports = { MemoryEventStore };
