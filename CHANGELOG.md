# Changelog

## [Unreleased]

## [0.1.0] — 2026-04-28

First public release. Lifted from raj-sadan's `dashboard/` organ.

### Added

- **Registry-driven configuration** — TOML or JSON file describes organs (`name`, `url`, optional `badge` / `proxy_path`) and dashboard meta (brand, tagline, port). No hardcoded organ list anywhere.
- **Stub default** — `StubOrganClient` returns canned `running` responses for every organ in the registry. Dashboard boots cleanly even if nothing else is listening. Real organs via `DASHBOARD_USE_REAL_ORGAN_CLIENT=1` (or `DASHBOARD_USE_REAL=all`).
- **Single-page chrome** — minimal vanilla-JS index page that fetches `/api/meta` + `/api/organs/health` + `/api/network/events` and subscribes to `/api/network/stream`. No framework dependencies. Auto-refresh every 30s.
- **HTTP surface** — `/health`, `/api/meta`, `/api/organs/health`, `/api/organs/:organ/health`, `/api/network/{events,stream}`, `/api/<organ>/*` proxy passthrough.
- **MCP server** — 4 read-only tools (`dashboard_health`, `dashboard_organ_health`, `dashboard_tail_events`, `dashboard_meta`) over stdio. Optional peer deps so the HTTP server works without MCP installed.
- **CLI dispatcher** — `ai-dashboard` with `--registry`, `--port`, `--host`, `--brand`, `--static-extra` (repeatable), `--version`, `--help`. Env-var fallbacks for all of them.
- **3 sample registries** — `raj-sadan/` (4-organ AI stack), `simple/` (1 organ), `microservices/` (8 services).
- **Tests** — 51 across registry parser, stub client, DI container/swaps, and the lifted dashboard domain suite.

### Known limitations

- **Single in-memory event store** — bounded ring buffer (default 500). Restarts lose history. v0.2 may add a SQLite-backed store.
- **No registry hot-reload** — registry changes require a restart.
- **CLI requires a registry** — there is no zero-config "guess my organs" mode. Sample registries cover the common shapes.
- **MCP tools are read-only** — by design. Mutation goes to the organs directly, not through the dashboard.
