/**
 * registry_loader — read a TOML or JSON registry from disk.
 *
 * TOML support is via the optional peer dep `@iarna/toml`. If the
 * peer dep is not installed, only JSON registries can be loaded.
 */

const fs = require("fs");
const path = require("path");
const { RegistryError } = require("../../../domain/exceptions");

function loadRegistryFile(filePath) {
  if (!filePath) throw new RegistryError("registry path is required");
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new RegistryError(`registry file not found: ${abs}`);
  const text = fs.readFileSync(abs, "utf8");
  const ext = path.extname(abs).toLowerCase();
  if (ext === ".json") {
    try { return JSON.parse(text); }
    catch (e) { throw new RegistryError(`invalid JSON in ${abs}: ${e.message}`); }
  }
  if (ext === ".toml") {
    let toml;
    try { toml = require("@iarna/toml"); }
    catch (_) {
      throw new RegistryError(
        "TOML registry requires the optional peer dep @iarna/toml — install it or use a .json registry"
      );
    }
    try { return toml.parse(text); }
    catch (e) { throw new RegistryError(`invalid TOML in ${abs}: ${e.message}`); }
  }
  throw new RegistryError(`unsupported registry extension: ${ext} (use .toml or .json)`);
}

module.exports = { loadRegistryFile };
