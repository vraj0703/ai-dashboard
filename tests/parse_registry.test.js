/**
 * parseRegistry tests.
 *
 * Run: node --test tests/parse_registry.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { parseRegistry, organUrlsFromRegistry } = require("../src/domain/use_cases/parse_registry");
const { RegistryError } = require("../src/domain/exceptions");

test("parseRegistry: minimal valid input", () => {
  const r = parseRegistry({
    organs: [{ name: "mind", url: "http://127.0.0.1:3486" }],
  });
  assert.equal(r.organs.length, 1);
  assert.equal(r.organs[0].name, "mind");
  assert.equal(r.organs[0].proxy_path, "/api/mind");
  assert.equal(r.meta.brand, "AI Nervous System"); // default
  assert.equal(r.meta.port, 3491); // default
});

test("parseRegistry: meta is preserved + defaults filled in", () => {
  const r = parseRegistry({
    meta: { name: "x", brand: "Brand X", tagline: "Tag", port: 4000 },
    organs: [{ name: "a", url: "http://a:1" }],
  });
  assert.equal(r.meta.name, "x");
  assert.equal(r.meta.brand, "Brand X");
  assert.equal(r.meta.tagline, "Tag");
  assert.equal(r.meta.port, 4000);
});

test("parseRegistry: trailing slash on url stripped", () => {
  const r = parseRegistry({ organs: [{ name: "a", url: "http://a:1/" }] });
  assert.equal(r.organs[0].url, "http://a:1");
});

test("parseRegistry: rejects empty organ list", () => {
  assert.throws(() => parseRegistry({ organs: [] }), RegistryError);
});

test("parseRegistry: rejects missing organ list", () => {
  assert.throws(() => parseRegistry({}), RegistryError);
});

test("parseRegistry: rejects organ without name", () => {
  assert.throws(() => parseRegistry({ organs: [{ url: "x" }] }), RegistryError);
});

test("parseRegistry: rejects organ without url", () => {
  assert.throws(() => parseRegistry({ organs: [{ name: "a" }] }), RegistryError);
});

test("parseRegistry: rejects duplicate organ names", () => {
  assert.throws(
    () => parseRegistry({ organs: [{ name: "a", url: "x" }, { name: "a", url: "y" }] }),
    RegistryError,
  );
});

test("parseRegistry: badge + custom proxy_path preserved", () => {
  const r = parseRegistry({
    organs: [{ name: "x", url: "http://x:1", badge: "edge", proxy_path: "/x" }],
  });
  assert.equal(r.organs[0].badge, "edge");
  assert.equal(r.organs[0].proxy_path, "/x");
});

test("parseRegistry: rejects non-object input", () => {
  assert.throws(() => parseRegistry(null), RegistryError);
  assert.throws(() => parseRegistry("foo"), RegistryError);
});

test("organUrlsFromRegistry: returns name->url map", () => {
  const r = parseRegistry({
    organs: [
      { name: "a", url: "http://a:1" },
      { name: "b", url: "http://b:2" },
    ],
  });
  assert.deepEqual(organUrlsFromRegistry(r), {
    a: "http://a:1",
    b: "http://b:2",
  });
});
