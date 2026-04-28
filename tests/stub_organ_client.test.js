/**
 * StubOrganClient tests.
 *
 * Run: node --test tests/stub_organ_client.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { StubOrganClient } = require("../src/data/data_sources/local/stubs/stub_organ_client");
const { UnknownOrganError } = require("../src/domain/exceptions");

test("list() returns the names from urls", () => {
  const c = new StubOrganClient({ urls: { mind: "http://x:1", memory: "http://x:2" } });
  assert.deepEqual(c.list().sort(), ["memory", "mind"]);
});

test("health() returns running status with stub:true detail", async () => {
  const c = new StubOrganClient({ urls: { mind: "http://x:3486" } });
  const s = await c.health("mind");
  assert.equal(s.organ, "mind");
  assert.equal(s.port, 3486);
  assert.equal(s.status, "running");
  assert.equal(s.details.stub, true);
});

test("health() throws UnknownOrganError for unknown organ", async () => {
  const c = new StubOrganClient({ urls: { mind: "http://x:1" } });
  await assert.rejects(() => c.health("memory"), UnknownOrganError);
});

test("aggregateAll() returns status for every organ", async () => {
  const c = new StubOrganClient({ urls: { mind: "http://x:1", memory: "http://x:2" } });
  const all = await c.aggregateAll();
  assert.deepEqual(Object.keys(all).sort(), ["memory", "mind"]);
  for (const s of Object.values(all)) assert.equal(s.status, "running");
});

test("fetch() returns canned 200 response", async () => {
  const c = new StubOrganClient({ urls: { mind: "http://x:1" } });
  const r = await c.fetch("mind", "/foo");
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
  assert.equal(r.data.stub, true);
  assert.equal(r.data.organ, "mind");
});

test("defaultStatus override", async () => {
  const c = new StubOrganClient({ urls: { mind: "http://x:1" }, defaultStatus: "down" });
  const s = await c.health("mind");
  assert.equal(s.status, "down");
});

test("version is deterministic for same organ name", async () => {
  const c1 = new StubOrganClient({ urls: { mind: "http://x:1" } });
  const c2 = new StubOrganClient({ urls: { mind: "http://x:1" } });
  const s1 = await c1.health("mind");
  const s2 = await c2.health("mind");
  assert.equal(s1.version, s2.version);
});
