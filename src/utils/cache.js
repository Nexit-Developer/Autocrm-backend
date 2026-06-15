const NodeCache = require('node-cache')

// Cache with 5 minute default TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 })

const getOrSet = async (key, fetchFn, ttl = 300) => {
  const cached = cache.get(key)
  if (cached !== undefined) {
    return cached
  }
  const data = await fetchFn()
  cache.set(key, data, ttl)
  return data
}

const invalidate = (key) => {
  cache.del(key)
}

const invalidatePattern = (pattern) => {
  const keys = cache.keys()
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      cache.del(key)
    }
  })
}

module.exports = { cache, getOrSet, invalidate, invalidatePattern }