/**
 * ai-dashboard domain exceptions.
 */

class DashboardError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "DashboardError";
    this.code = code || "DASHBOARD_ERROR";
  }
}

class UnknownOrganError extends DashboardError {
  constructor(organ) {
    super(`Unknown organ: ${organ}`, "UNKNOWN_ORGAN");
    this.organ = organ;
  }
}

class OrganUnreachableError extends DashboardError {
  constructor(organ, cause) {
    super(`Organ ${organ} unreachable: ${cause}`, "ORGAN_UNREACHABLE");
    this.organ = organ;
    this.cause = cause;
  }
}

class RegistryError extends DashboardError {
  constructor(message) {
    super(message, "REGISTRY_ERROR");
  }
}

module.exports = { DashboardError, UnknownOrganError, OrganUnreachableError, RegistryError };
