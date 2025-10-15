// BIN data cache with 1-hour expiration
interface CachedBinData {
  data: any
  timestamp: number
}

const BIN_CACHE: Map<string, CachedBinData> = new Map()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export function getCachedBinData(bin: string) {
  const cached = BIN_CACHE.get(bin)
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > CACHE_DURATION) {
    BIN_CACHE.delete(bin)
    return null
  }

  return cached.data
}

export function setCachedBinData(bin: string, data: any) {
  BIN_CACHE.set(bin, {
    data,
    timestamp: Date.now(),
  })
}

export function clearBinCache() {
  BIN_CACHE.clear()
}
