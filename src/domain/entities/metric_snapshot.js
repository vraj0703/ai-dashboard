/**
 * MetricSnapshot — a single dashboard metric value from an organ.
 */
class MetricSnapshot {
  /**
   * @param {object} raw
   * @param {string} raw.name
   * @param {number|string} raw.value
   * @param {string} raw.source
   * @param {string} [raw.timestamp]
   */
  constructor(raw) {
    if (!raw || !raw.name) throw new Error("MetricSnapshot name is required");
    if (raw.value === undefined) throw new Error("MetricSnapshot value is required");
    if (!raw.source) throw new Error("MetricSnapshot source is required");
    this.name = raw.name;
    this.value = raw.value;
    this.source = raw.source;
    this.timestamp = raw.timestamp || new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      value: this.value,
      source: this.source,
      timestamp: this.timestamp,
    };
  }
}

module.exports = { MetricSnapshot };
