const tableExistenceCache: Map<string, { exists: boolean; timestamp: number }> = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function isTableKnownToNotExist(tableName: string): boolean {
  const cached = tableExistenceCache.get(tableName)
  if (!cached) return false

  const now = Date.now()
  if (now - cached.timestamp > CACHE_DURATION) {
    tableExistenceCache.delete(tableName)
    return false
  }

  return !cached.exists
}

export function markTableAsNonExistent(tableName: string): void {
  tableExistenceCache.set(tableName, {
    exists: false,
    timestamp: Date.now(),
  })
}

export function markTableAsExistent(tableName: string): void {
  tableExistenceCache.set(tableName, {
    exists: true,
    timestamp: Date.now(),
  })
}
