class SimpleCache {
  constructor() {
    this.cache = new Map()
    this.ttl = new Map()
  }

  set(key, value, ttlMs = 300000) { // 5 minutes default
    this.cache.set(key, value)
    this.ttl.set(key, Date.now() + ttlMs)
  }

  get(key) {
    const expiry = this.ttl.get(key)
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key)
      this.ttl.delete(key)
      return null
    }
    return this.cache.get(key)
  }

  clear() {
    this.cache.clear()
    this.ttl.clear()
  }
}

export const cache = new SimpleCache()
