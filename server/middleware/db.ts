const globalForDbInit = globalThis as typeof globalThis & {
  __dbInitPromise?: Promise<void>
}

const initDbOnce = () => {
  if (!globalForDbInit.__dbInitPromise) {
    globalForDbInit.__dbInitPromise = initDb()
      .then(() => {})
      .catch((error) => {
        console.error('Error initializing database:', error)
        globalForDbInit.__dbInitPromise = undefined
        throw error
      })
  }

  return globalForDbInit.__dbInitPromise
}

export default defineEventHandler(async (event) => {
  if (!process.dev) {
    return
  }

  const initPromise = initDbOnce()
  const pathname = getRequestURL(event).pathname

  // Let pages render without waiting on dev-time DB setup; APIs still wait for tables.
  if (pathname.startsWith('/api/')) {
    await initPromise
  }
})
