# Examples

Three sample registries for ai-dashboard.

## `raj-sadan/registry.toml`
The reference shape — 4 organs (mind/senses/memory/knowledge) at ports 3486–3489. This is what raj-sadan itself uses.

```bash
ai-dashboard --registry examples/raj-sadan/registry.toml
```

## `simple/registry.toml`
One-organ example. Useful as the smallest possible thing that runs.

```bash
ai-dashboard --registry examples/simple/registry.toml
```

## `microservices/registry.toml`
Eight-service backend (gateway + auth + users + orders + billing + notifications + queue + db). Demonstrates the dashboard works for any multi-service system, not just AI agent stacks.

```bash
ai-dashboard --registry examples/microservices/registry.toml
```

## Trying without real services running
The default organ client is a stub that returns canned `running` responses, so any of the above commands will boot a working dashboard immediately even if nothing is listening on the configured URLs.

To talk to real services:

```bash
DASHBOARD_USE_REAL_ORGAN_CLIENT=1 ai-dashboard --registry ./registry.toml
```
