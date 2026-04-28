/**
 * IOrganClient — interface for talking to organs over HTTP.
 *
 * Implementations must provide:
 *   - list()                       => string[] of organ names this client knows about
 *   - async health(organ)          => OrganStatus
 *   - async fetch(organ, path, opts) => any (parsed JSON or raw)
 *   - async aggregateAll()         => Record<string, OrganStatus>
 */
class IOrganClient {
  list() { throw new Error("IOrganClient.list not implemented"); }
  async health(_organ) { throw new Error("IOrganClient.health not implemented"); }
  async fetch(_organ, _path, _opts) { throw new Error("IOrganClient.fetch not implemented"); }
  async aggregateAll() { throw new Error("IOrganClient.aggregateAll not implemented"); }
}

module.exports = { IOrganClient };
