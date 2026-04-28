/**
 * NetworkEvent — a single proxied request/response log entry.
 */
class NetworkEvent {
  /**
   * @param {object} raw
   * @param {string} [raw.id]
   * @param {string} [raw.timestamp]
   * @param {string} raw.method
   * @param {string} raw.path
   * @param {string} [raw.target]
   * @param {number} [raw.status]
   * @param {number} [raw.duration]
   * @param {string|null} [raw.error]
   */
  constructor(raw) {
    if (!raw || !raw.method) throw new Error("NetworkEvent method is required");
    if (!raw.path) throw new Error("NetworkEvent path is required");
    this.id = raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.timestamp = raw.timestamp || new Date().toISOString();
    this.method = String(raw.method).toUpperCase();
    this.path = raw.path;
    this.target = raw.target || null;
    this.status = raw.status != null ? Number(raw.status) : 0;
    this.duration = raw.duration != null ? Number(raw.duration) : 0;
    this.error = raw.error || null;
  }

  isError() { return this.status >= 400 || !!this.error; }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      method: this.method,
      path: this.path,
      target: this.target,
      status: this.status,
      duration: this.duration,
      error: this.error,
    };
  }
}

module.exports = { NetworkEvent };
