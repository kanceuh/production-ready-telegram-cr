export class TtlCache {
  constructor({ max = 1000, ttlMs = 60000 } = {}) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.map = new Map();
  }

  get(key) {
    const row = this.map.get(key);
    if (!row) return null;
    if (row.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    return row.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first) this.map.delete(first);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
