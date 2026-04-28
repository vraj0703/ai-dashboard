# Architecture

Single-process Express server, clean-architecture layering, registry-driven config.

## Layers

```
src/
  domain/                    pure — no I/O, no framework imports
    constants/               defaults (port, brand, log size, timeouts)
    entities/                OrganStatus, NetworkEvent, MetricSnapshot
    exceptions/              DashboardError, UnknownOrganError, OrganUnreachableError, RegistryError
    repositories/            interfaces: IOrganClient, IEventStore
    use_cases/               aggregateHealth, logNetworkEvent, tailEvents, parseRegistry
  data/
    data_sources/
      local/
        memory_event_store.js   IEventStore impl (ring buffer)
        registry_loader.js      file-system reader (.toml / .json)
        stubs/
          stub_organ_client.js  IOrganClient impl — canned responses
      remote/
        http_organ_client.js    IOrganClient impl — fetch() to organ URLs
  di/
    container.js              wires everything; reads env for swap selection
    swaps.js                  KNOWN_KEYS + shouldUseReal() helper
  navigation/
    routes.js                 Express routes — /health, /api/*, static
  presentation/
    pages/
      server.js               Express factory + request logging
      static/                 framework chrome (index.html, shared.css, shared.js)
    state_management/
      controllers/
        dashboard_controller.js   HTTP-to-domain adapter
    mcp/
      server.js               MCP wrapper exposing read-only operator tools
  index.js                    public entry — startDashboard()
bin/
  ai-dashboard.js             CLI dispatcher
```

## Dependency direction

```
domain  ← data  ← presentation  ← di
                                 ↑
                              index.js, bin/, mcp/server.js
```

Domain has no dependencies. Data depends on domain. Presentation depends on data + domain. DI wires them together. The entry points (`index.js`, `bin/`, `mcp/server.js`) only touch DI.

## Stub-default + DI swap

Every concrete dependency that has both a real and a mock implementation is selected via env var at container build time:

```js
const useReal = shouldUseReal("ORGAN_CLIENT", env);
const organClient = useReal
  ? new HttpOrganClient({ urls })
  : new StubOrganClient({ urls });
```

Default is the stub. Real behavior requires explicit opt-in:

```bash
DASHBOARD_USE_REAL_ORGAN_CLIENT=1 ai-dashboard ...
DASHBOARD_USE_REAL=all              ai-dashboard ...   # everything → real
```

The list of swappable keys lives in `src/di/swaps.js` and is exported as `KNOWN_KEYS`.

## Registry as single source of truth

The registry (TOML/JSON) defines what organs exist, where they live, and how they're labeled. Everything downstream reads from the parsed registry:

- `IOrganClient.list()` returns the organ names — `aggregateHealth` iterates this, never a hardcoded list.
- `routes.js` registers `/api/<organ>/*` proxies by iterating `dashboard.organNames()`.
- The `/api/meta` endpoint exposes the registry shape so the static UI can render brand + tiles without server-rendered templating.

Adding/removing an organ = editing the registry. No code changes.

## Request flow — proxy

```
client → /api/mind/foo
  ↓
routes.js   matches /api/<organ>/* (organ ∈ registry)
  ↓
dashboard.proxy("mind", "/foo", opts)
  ↓
organClient.fetch("mind", "/foo", opts)        ← stub or http
  ↓
{ ok, status, data }
  ↓
dashboard.logEvent({ method, path, target, status, duration })
  ↓
eventStore.append(NetworkEvent)
  ↓
SSE subscribers notified
  ↓
JSON response back to client
```

Per-organ failures are caught in routes.js, recorded as 503 events, and surfaced both in the response and in the network log. The dashboard never crashes from a bad upstream.

## Health aggregation

`GET /api/organs/health` calls `organClient.aggregateAll()` (parallel `health()` per organ). Down organs become `{ status: "down", details: { error } }` — the call always returns an entry per organ. `aggregateHealth` use case reproduces the same behavior but lives in the domain layer for testability.

## SSE network stream

`MemoryEventStore` is a ring buffer (default 500 entries) plus a subscriber set. On every `append()`, every subscriber callback runs (errors swallowed so a bad listener can't break the store). The SSE route registers a subscriber and unregisters on socket close.

## MCP layer

`presentation/mcp/server.js` builds a `McpServer` with the same DI container the HTTP server uses. Tools wrap `DashboardController` methods directly — no HTTP round-trip when an agent calls them via stdio.

The MCP layer's peer dependencies (`@modelcontextprotocol/sdk`, `zod`) are optional. The HTTP server runs without them.

## What lives where (when uncertain)

- "Does it touch process.env, fs, fetch, or the database?" → **data**.
- "Does it return an `OrganStatus` or `NetworkEvent`?" → **domain/entities**.
- "Is it logic that exercises an interface?" → **domain/use_cases**.
- "Does it speak HTTP req/res?" → **navigation** (routes) or **presentation/pages** (server).
- "Is it config-and-glue?" → **di**.

## What's NOT in this repo

- The principal-specific pages (`chat.html`, `costs.html`, `brain.html`, `portal.html`) that lived in raj-sadan. Those mount via `--static-extra` from the consumer's repo.
- A second event-store implementation (DB-backed). The interface is there; v0.2 will likely add a SQLite store.
- Persistent registry watching / hot reload. v0.1 expects a restart for registry changes.

## Testing strategy

- **Unit**: `tests/parse_registry.test.js`, `tests/stub_organ_client.test.js`, `tests/container.test.js`.
- **Domain**: `src/domain/use_cases/dashboard.test.js` covers entities + use cases with a mocked `IOrganClient`.
- **Smoke**: CI boots the dashboard against `examples/simple/registry.toml` and curls `/health` + `/api/meta`.

No real-network tests. The split between `Stub*` and `Http*` clients is exactly so the suite stays hermetic.
