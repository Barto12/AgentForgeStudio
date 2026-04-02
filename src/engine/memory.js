// src/engine/memory.js
// SharedMemory — persistent key-value store for inter-agent communication within a workflow

export class SharedMemory {
  constructor() {
    this.store = new Map();
    this.history = []; // Track all mutations for debugging
  }

  set(key, value) {
    const prev = this.store.get(key);
    this.store.set(key, value);
    this.history.push({
      action: "set",
      key,
      timestamp: new Date().toISOString(),
      hadPrevious: prev !== undefined,
    });
    return value;
  }

  get(key) {
    return this.store.get(key);
  }

  has(key) {
    return this.store.has(key);
  }

  delete(key) {
    const existed = this.store.delete(key);
    if (existed) {
      this.history.push({
        action: "delete",
        key,
        timestamp: new Date().toISOString(),
      });
    }
    return existed;
  }

  getAll() {
    const obj = {};
    for (const [key, value] of this.store) {
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Get all keys matching a prefix
   */
  getByPrefix(prefix) {
    const results = {};
    for (const [key, value] of this.store) {
      if (key.startsWith(prefix)) {
        results[key] = value;
      }
    }
    return results;
  }

  /**
   * Merge an object into memory
   */
  merge(obj) {
    for (const [key, value] of Object.entries(obj)) {
      this.set(key, value);
    }
  }

  /**
   * Get mutation history for debugging
   */
  getHistory() {
    return this.history;
  }

  /**
   * Clear all memory
   */
  clear() {
    this.store.clear();
    this.history.push({
      action: "clear",
      timestamp: new Date().toISOString(),
    });
  }

  get size() {
    return this.store.size;
  }
}
