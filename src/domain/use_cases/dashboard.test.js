/**
 * ai-dashboard — domain & use-case tests.
 *
 * Run: node --test src/domain/use_cases/*.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { OrganStatus } = require("../entities/organ_status");
const { NetworkEvent } = require("../entities/network_event");
const { MetricSnapshot } = require("../entities/metric_snapshot");
const { MemoryEventStore } = require("../../data/data_sources/local/memory_event_store");
const { aggregateHealth } = require("./aggregate_health");
const { logNetworkEvent } = require("./log_network_event");
const { tailEvents } = require("./tail_events");
const { parseRegistry, organUrlsFromRegistry } = require("./parse_registry");
const { RegistryError } = require("../exceptions");

// ─── Entities ───

test("OrganStatus: constructs with required fields", () => {
  const s = new OrganStatus({ organ: "mind", port: 3486, status: "running", version: "2.0.0" });
  assert.equal(s.organ, "mind");
  assert.equal(s.port, 3486);
  assert.equal(s.status, "running");
  assert.equal(s.version, "2.0.0");
  assert.ok(s.isRunning());
  assert.ok(s.timestamp);
});

test("OrganStatus: rejects invalid status", () => {
  assert.throws(() => new OrganStatus({ organ: "mind", port: 3486, status: "bogus" }));
});

test("OrganStatus.down: factory builds a down status", () => {
  const s = OrganStatus.down("senses", 3487, "ECONNREFUSED");
  assert.equal(s.status, "down");
  assert.equal(s.port, 3487);
  assert.equal(s.details.error, "ECONNREFUSED");
  assert.equal(s.isRunning(), false);
});

test("NetworkEvent: constructs + auto-fills id/timestamp", () => {
  const e = new NetworkEvent({ method: "get", path: "/api/mind/health", status: 200, duration: 12 });
  assert.equal(e.method, "GET");
  assert.ok(e.id);
  assert.ok(e.timestamp);
  assert.equal(e.isError(), false);
});

test("NetworkEvent: isError for HTTP 500 and explicit error", () => {
  assert.equal(new NetworkEvent({ method: "GET", path: "/x", status: 500 }).isError(), true);
  assert.equal(new NetworkEvent({ method: "GET", path: "/x", status: 200, error: "boom" }).isError(), true);
});

test("NetworkEvent: rejects missing method/path", () => {
  assert.throws(() => new NetworkEvent({ path: "/x" }));
  assert.throws(() => new NetworkEvent({ method: "GET" }));
});

test("MetricSnapshot: constructs + rejects missing fields", () => {
  const m = new MetricSnapshot({ name: "k.size", value: 79, source: "knowledge" });
  assert.equal(m.value, 79);
  assert.throws(() => new MetricSnapshot({ value: 1, source: "x" }));
  assert.throws(() => new MetricSnapshot({ name: "x", source: "x" }));
  assert.throws(() => new MetricSnapshot({ name: "x", value: 1 }));
});

// ─── MemoryEventStore ───

test("MemoryEventStore: append + tail (newest first)", () => {
  const store = new MemoryEventStore({ max: 10 });
  store.append(new NetworkEvent({ method: "GET", path: "/a" }));
  store.append(new NetworkEvent({ method: "GET", path: "/b" }));
  const t = store.tail(10);
  assert.equal(t.length, 2);
  assert.equal(t[0].path, "/b");
  assert.equal(t[1].path, "/a");
  assert.equal(store.size(), 2);
});

test("MemoryEventStore: ring buffer bounded to max", () => {
  const store = new MemoryEventStore({ max: 3 });
  for (let i = 0; i < 10; i++) store.append(new NetworkEvent({ method: "GET", path: `/p${i}` }));
  assert.equal(store.size(), 3);
  const t = store.tail(10);
  assert.deepEqual(t.map((e) => e.path), ["/p9", "/p8", "/p7"]);
});

test("MemoryEventStore: subscribe / unsubscribe", () => {
  const store = new MemoryEventStore();
  const seen = [];
  const unsub = store.subscribe((e) => seen.push(e.path));
  store.append(new NetworkEvent({ method: "GET", path: "/x" }));
  assert.deepEqual(seen, ["/x"]);
  unsub();
  store.append(new NetworkEvent({ method: "GET", path: "/y" }));
  assert.deepEqual(seen, ["/x"]);
});

test("MemoryEventStore: subscriber errors do not break store", () => {
  const store = new MemoryEventStore();
  store.subscribe(() => { throw new Error("bad"); });
  assert.doesNotThrow(() => store.append(new NetworkEvent({ method: "GET", path: "/x" })));
  assert.equal(store.size(), 1);
});

// ─── use case: logNetworkEvent ───

test("logNetworkEvent: appends NetworkEvent via store", () => {
  const store = new MemoryEventStore();
  const ev = logNetworkEvent({
    event: { method: "GET", path: "/api/mind/health", status: 200, duration: 5 },
    eventStore: store,
  });
  assert.equal(store.size(), 1);
  assert.equal(ev.path, "/api/mind/health");
});

// ─── use case: tailEvents ───

test("tailEvents: returns last N events", () => {
  const store = new MemoryEventStore();
  for (let i = 0; i < 5; i++) logNetworkEvent({ event: { method: "GET", path: `/p${i}` }, eventStore: store });
  const last3 = tailEvents({ eventStore: store, limit: 3 });
  assert.equal(last3.length, 3);
  assert.deepEqual(last3.map((e) => e.path), ["/p4", "/p3", "/p2"]);
});

test("tailEvents: default limit honored", () => {
  const store = new MemoryEventStore();
  logNetworkEvent({ event: { method: "GET", path: "/x" }, eventStore: store });
  const t = tailEvents({ eventStore: store });
  assert.equal(t.length, 1);
});

// ─── use case: aggregateHealth ───

function mockClient(map) {
  const urls = {};
  for (const k of Object.keys(map)) urls[k] = `http://127.0.0.1:${1000 + Object.keys(urls).length}`;
  return {
    urls,
    list() { return Object.keys(map); },
    async health(organ) {
      const entry = map[organ];
      if (entry instanceof Error) throw entry;
      return new OrganStatus(entry);
    },
    async fetch() { return {}; },
    async aggregateAll() { return {}; },
  };
}

test("aggregateHealth: returns status for every organ in client.list()", async () => {
  const client = mockClient({
    mind:      { organ: "mind",      port: 3486, status: "running", version: "2.0.0" },
    senses:    { organ: "senses",    port: 3487, status: "running", version: "2.0.0" },
    memory:    { organ: "memory",    port: 3488, status: "running", version: "2.0.0" },
    knowledge: { organ: "knowledge", port: 3489, status: "running", version: "2.0.0" },
  });
  const out = await aggregateHealth({ organClient: client });
  assert.deepEqual(Object.keys(out).sort(), ["knowledge", "memory", "mind", "senses"]);
  for (const s of Object.values(out)) assert.ok(s.isRunning());
});

test("aggregateHealth: works with arbitrary organ names (registry-driven)", async () => {
  const client = mockClient({
    gateway:  { organ: "gateway",  port: 8080, status: "running" },
    queue:    { organ: "queue",    port: 8086, status: "running" },
    db:       { organ: "db",       port: 8087, status: "running" },
  });
  const out = await aggregateHealth({ organClient: client });
  assert.deepEqual(Object.keys(out).sort(), ["db", "gateway", "queue"]);
});

test("aggregateHealth: individual failure becomes 'down', others still returned", async () => {
  const client = mockClient({
    mind:      { organ: "mind",      port: 3486, status: "running" },
    senses:    new Error("ECONNREFUSED"),
    memory:    { organ: "memory",    port: 3488, status: "running" },
    knowledge: { organ: "knowledge", port: 3489, status: "running" },
  });
  const out = await aggregateHealth({ organClient: client });
  assert.equal(out.mind.status, "running");
  assert.equal(out.senses.status, "down");
  assert.equal(out.memory.status, "running");
  assert.equal(out.knowledge.status, "running");
});

test("aggregateHealth: requires organClient", async () => {
  await assert.rejects(() => aggregateHealth({}));
});

test("aggregateHealth: empty client returns empty map", async () => {
  const client = mockClient({});
  const out = await aggregateHealth({ organClient: client });
  assert.deepEqual(out, {});
});

// ─── parseRegistry ───

test("parseRegistry: applies defaults for missing meta", () => {
  const r = parseRegistry({ organs: [{ name: "mind", url: "http://x:1000" }] });
  assert.equal(r.meta.brand, "AI Nervous System");
  assert.equal(r.meta.port, 3491);
  assert.equal(r.organs[0].name, "mind");
  assert.equal(r.organs[0].url, "http://x:1000");
  assert.equal(r.organs[0].proxy_path, "/api/mind");
});

test("parseRegistry: trims trailing slash on url", () => {
  const r = parseRegistry({ organs: [{ name: "x", url: "http://x:1000/" }] });
  assert.equal(r.organs[0].url, "http://x:1000");
});

test("parseRegistry: rejects empty organs", () => {
  assert.throws(() => parseRegistry({ organs: [] }), RegistryError);
  assert.throws(() => parseRegistry({}), RegistryError);
});

test("parseRegistry: rejects duplicates", () => {
  assert.throws(
    () => parseRegistry({ organs: [{ name: "a", url: "u1" }, { name: "a", url: "u2" }] }),
    RegistryError,
  );
});

test("parseRegistry: rejects organ missing name or url", () => {
  assert.throws(() => parseRegistry({ organs: [{ url: "u" }] }), RegistryError);
  assert.throws(() => parseRegistry({ organs: [{ name: "n" }] }), RegistryError);
});

test("organUrlsFromRegistry: builds a name->url map", () => {
  const r = parseRegistry({
    organs: [
      { name: "a", url: "http://a:1" },
      { name: "b", url: "http://b:2" },
    ],
  });
  assert.deepEqual(organUrlsFromRegistry(r), { a: "http://a:1", b: "http://b:2" });
});
