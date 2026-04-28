/**
 * logNetworkEvent — append a NetworkEvent to the store.
 */

const { NetworkEvent } = require("../entities/network_event");

/**
 * @param {object} deps
 * @param {object} deps.event - raw event params
 * @param {import('../repositories/i_event_store').IEventStore} deps.eventStore
 * @returns {NetworkEvent}
 */
function logNetworkEvent({ event, eventStore }) {
  if (!eventStore) throw new Error("logNetworkEvent requires eventStore");
  const ev = event instanceof NetworkEvent ? event : new NetworkEvent(event);
  return eventStore.append(ev);
}

module.exports = { logNetworkEvent };
