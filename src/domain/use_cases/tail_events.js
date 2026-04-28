/**
 * tailEvents — read the last N network events from the store.
 */

/**
 * @param {object} deps
 * @param {import('../repositories/i_event_store').IEventStore} deps.eventStore
 * @param {number} [deps.limit=100]
 */
function tailEvents({ eventStore, limit = 100 }) {
  if (!eventStore) throw new Error("tailEvents requires eventStore");
  const n = Math.max(1, Math.min(limit, 500));
  return eventStore.tail(n);
}

module.exports = { tailEvents };
