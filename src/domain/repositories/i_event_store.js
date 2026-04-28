/**
 * IEventStore — interface for a network event log store.
 *
 * Implementations must provide:
 *   - append(event)         => NetworkEvent (the appended entry)
 *   - tail(n)               => NetworkEvent[] (most recent first)
 *   - subscribe(cb)         => unsubscribe function
 *   - size()                => number
 */
class IEventStore {
  append(_event) { throw new Error("IEventStore.append not implemented"); }
  tail(_n) { throw new Error("IEventStore.tail not implemented"); }
  subscribe(_cb) { throw new Error("IEventStore.subscribe not implemented"); }
  size() { throw new Error("IEventStore.size not implemented"); }
}

module.exports = { IEventStore };
