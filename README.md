# ai-dashboard

> Operator dashboard for an AI nervous system. One HTTP surface that aggregates organ health, proxies API calls, tails network events, and stitches the rest of the `ai-*` family into a single page.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node: 18+](https://img.shields.io/badge/Node-18+-green.svg)](package.json)

Lifted from `raj-sadan`, where it was the operator-facing layer over four organs (mind/senses/memory/knowledge). Generalized so any multi-service system can drop in a `registry.toml` and get a working dashboard.

> **Status:** v0.1.0. Single-page chrome, registry-driven organ tiles, proxy passthrough, SSE network log, 4 MCP tools. Stub organ client is the default — runs out of the box without anything else listening.

## What it does

| Surface | Where |
|---|---|
| Organ status grid | `/` (index page, auto-refreshes) |
| Aggregate health | `GET /api/organs/health` |
| Single organ health | `GET /api/organs/:organ/health` |
| Network event log (tail) | `GET /api/network/events?limit=N` |
| Network event stream | `GET /api/network/stream` (SSE) |
| Per-organ proxy | `ALL /api/<organ>/*` → registered URL |
| Registry view | `GET /api/meta` |
| MCP tools | stdio: `dashboard_health`, `dashboard_organ_health`, `dashboard_tail_events`, `dashboard_meta` |

The dashboard never holds organ logic — it only tiles, proxies, and observes.

## Install

```bash
npm install @vraj0703/ai-dashboard
```

Optional peer dependencies (install only what you need):

```bash
npm install @iarna/toml                  # if you use a .toml registry
npm install @modelcontextprotocol/sdk zod  # if you use the MCP server
```

## Use

### CLI

```bash
ai-dashboard --registry ./registry.toml
ai-dashboard --registry ./examples/simple/registry.toml --port 4000
DASHBOARD_USE_REAL_ORGAN_CLIENT=1 ai-dashboard --registry ./registry.toml
```

| Flag | Env | Default |
|---|---|---|
| `--registry <path>` | `DASHBOARD_REGISTRY` | (required) |
| `--port <n>` | `DASHBOARD_PORT` | `registry.meta.port` or `3491` |
| `--host <addr>` | — | `127.0.0.1` |
| `--brand <name>` | `DASHBOARD_BRAND` | `registry.meta.brand` |
| `--static-extra <dir>` | — | (none — repeatable) |

### Programmatic

```js
const { startDashboard } = require("@vraj0703/ai-dashboard");

await startDashboard({
  registry: "./registry.toml",        // path or already-parsed object
  port: 3491,
  staticExtras: ["./my-extra-pages"], // optional consumer-supplied pages
});
```

## Registry format

```toml
[meta]
name    = "my-system"
brand   = "My System"
tagline = "Optional sub-header"
port    = 3491

[[organs]]
name = "service-a"
url  = "http://127.0.0.1:9001"
badge = "edge"          # optional, shown on the tile

[[organs]]
name = "service-b"
url  = "http://127.0.0.1:9002"
proxy_path = "/api/b"   # optional; defaults to /api/<name>
```

JSON works too — same shape, drop in `.json` instead of `.toml`.

The dashboard expects each organ to expose `GET /health` returning JSON with at least `{ status, version }`. Anything beyond that is optional and ends up in `details` on the tile.

## Stub default

The default organ client is `StubOrganClient` — it returns canned `running` responses for every organ in the registry. **The dashboard runs out of the box even if nothing is listening on the configured URLs.**

This is deliberate. New consumers see a working dashboard immediately; live wiring is a one-env-var swap:

```bash
DASHBOARD_USE_REAL_ORGAN_CLIENT=1 ai-dashboard --registry ./registry.toml
# or:
DASHBOARD_USE_REAL=all ai-dashboard --registry ./registry.toml
```

## MCP tools

If you install the optional MCP peer deps:

```bash
npm install @modelcontextprotocol/sdk zod
```

You can mount the dashboard as an MCP server in your AI tool of choice:

```js
const { createMcpServer, startStdio } = require("@vraj0703/ai-dashboard/mcp");
const { createContainer } = require("@vraj0703/ai-dashboard/container");
const { loadRegistryFile } = require("@vraj0703/ai-dashboard");

const container = createContainer({ registry: loadRegistryFile("./registry.toml") });
const server = createMcpServer({ container });
await startStdio(server);
```

| Tool | Purpose |
|---|---|
| `dashboard_health` | Aggregate health of every organ in the registry |
| `dashboard_organ_health` | Health of a single named organ |
| `dashboard_tail_events` | Most recent N entries from the proxy network log |
| `dashboard_meta` | Brand + organ list (so an agent can discover what exists) |

## Custom pages

Drop your own HTML/CSS/JS into a directory and pass `--static-extra <dir>`. Files there are served before the bundled chrome — same filename overrides bundled assets:

```bash
ai-dashboard \
  --registry ./registry.toml \
  --static-extra ./my-pages
```

This is how `raj-sadan` keeps its principal-specific pages (chat, costs, brain, knowledge) without polluting the framework.

## Architecture

Clean architecture: `domain/` → `data/` → `presentation/` → `di/`. See [ARCHITECTURE.md](ARCHITECTURE.md).

Single source of organ truth: the registry. Use cases never see organ names directly — they ask the client `list()`. Swap the client and the rest of the system follows.

## Sibling packages

| Repo | Role |
|---|---|
| [`ai-mind`](https://github.com/vraj0703/ai-mind) | Decision-making organ |
| [`ai-senses`](https://github.com/vraj0703/ai-senses) | Perception (WhatsApp, mobile, infra) |
| [`ai-memory`](https://github.com/vraj0703/ai-memory) | Vector + structured memory |
| [`ai-knowledge`](https://github.com/vraj0703/ai-knowledge) | Capability registry + Hebbian reinforcement |
| [`ai-constitution`](https://github.com/vraj0703/ai-constitution) | Governance framework + minister templates |
| [`ai-architecture-renderer`](https://github.com/vraj0703/ai-architecture-renderer) | SVG perspective renderer |

Use the `examples/raj-sadan/registry.toml` shape to point a single dashboard at all six.

## License

MIT.
