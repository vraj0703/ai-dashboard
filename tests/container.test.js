/**
 * DI container + swap tests.
 *
 * Run: node --test tests/container.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { createContainer } = require("../src/di/container");
const { StubOrganClient } = require("../src/data/data_sources/local/stubs/stub_organ_client");
const { HttpOrganClient } = require("../src/data/data_sources/remote/http_organ_client");
const { shouldUseReal, KNOWN_KEYS } = require("../src/di/swaps");

const REGISTRY = {
  meta: { name: "test", brand: "Test", port: 3491 },
  organs: [
    { name: "mind", url: "http://127.0.0.1:3486" },
    { name: "memory", url: "http://127.0.0.1:3488" },
  ],
};

test("default container uses StubOrganClient", () => {
  const c = createContainer({ registry: REGISTRY, env: {} });
  assert.ok(c.organClient instanceof StubOrganClient);
  assert.equal(c.config.useRealOrganClient, false);
});

test("DASHBOARD_USE_REAL_ORGAN_CLIENT=1 swaps to HttpOrganClient", () => {
  const c = createContainer({
    registry: REGISTRY,
    env: { DASHBOARD_USE_REAL_ORGAN_CLIENT: "1" },
  });
  assert.ok(c.organClient instanceof HttpOrganClient);
  assert.equal(c.config.useRealOrganClient, true);
});

test("DASHBOARD_USE_REAL=all swaps to HttpOrganClient", () => {
  const c = createContainer({
    registry: REGISTRY,
    env: { DASHBOARD_USE_REAL: "all" },
  });
  assert.ok(c.organClient instanceof HttpOrganClient);
});

test("config.organUrls is derived from the registry", () => {
  const c = createContainer({ registry: REGISTRY, env: {} });
  assert.deepEqual(c.config.organUrls, {
    mind: "http://127.0.0.1:3486",
    memory: "http://127.0.0.1:3488",
  });
});

test("port + brand can be overridden", () => {
  const c = createContainer({ registry: REGISTRY, port: 9999, brand: "Custom", env: {} });
  assert.equal(c.config.port, 9999);
  assert.equal(c.config.brand, "Custom");
});

test("missing registry throws", () => {
  assert.throws(() => createContainer({ env: {} }));
});

test("KNOWN_KEYS is exported and contains ORGAN_CLIENT", () => {
  assert.ok(Array.isArray(KNOWN_KEYS));
  assert.ok(KNOWN_KEYS.includes("ORGAN_CLIENT"));
});

test("shouldUseReal: truthy variants", () => {
  assert.equal(shouldUseReal("ORGAN_CLIENT", { DASHBOARD_USE_REAL_ORGAN_CLIENT: "1" }), true);
  assert.equal(shouldUseReal("ORGAN_CLIENT", { DASHBOARD_USE_REAL_ORGAN_CLIENT: "true" }), true);
  assert.equal(shouldUseReal("ORGAN_CLIENT", { DASHBOARD_USE_REAL_ORGAN_CLIENT: "yes" }), true);
  assert.equal(shouldUseReal("ORGAN_CLIENT", { DASHBOARD_USE_REAL_ORGAN_CLIENT: "" }), false);
  assert.equal(shouldUseReal("ORGAN_CLIENT", { DASHBOARD_USE_REAL_ORGAN_CLIENT: "0" }), false);
  assert.equal(shouldUseReal("ORGAN_CLIENT", {}), false);
});
