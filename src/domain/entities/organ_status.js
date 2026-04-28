/**
 * OrganStatus — snapshot of an organ's health.
 */
class OrganStatus {
  /**
   * @param {object} raw
   * @param {string} raw.organ
   * @param {number} raw.port
   * @param {"running"|"down"|"error"} raw.status
   * @param {string} [raw.version]
   * @param {object} [raw.details]
   * @param {string} [raw.timestamp]
   */
  constructor(raw) {
    if (!raw || !raw.organ) throw new Error("OrganStatus organ is required");
    if (raw.port == null) throw new Error("OrganStatus port is required");
    const validStatus = ["running", "down", "error"];
    if (!validStatus.includes(raw.status)) {
      throw new Error(`OrganStatus status must be one of ${validStatus.join(",")}`);
    }
    this.organ = raw.organ;
    this.port = raw.port;
    this.status = raw.status;
    this.version = raw.version || null;
    this.details = raw.details || {};
    this.timestamp = raw.timestamp || new Date().toISOString();
  }

  isRunning() { return this.status === "running"; }

  toJSON() {
    return {
      organ: this.organ,
      port: this.port,
      status: this.status,
      version: this.version,
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  static down(organ, port, error) {
    return new OrganStatus({
      organ, port, status: "down", details: { error: String(error) },
    });
  }
}

module.exports = { OrganStatus };
