// In-memory cache: 30 min TTL
const CACHE_TTL_MS = 30 * 60 * 1000
const cache = new Map<string, { data: any; timestamp: number }>()

function getCacheKey(keywords: string, location: string, page: number): string {
  return `${(keywords || '').toLowerCase().trim()}|${(location || '').toLowerCase().trim()}|${page}`
}

function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key)
    }
  }
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const { keywords, location, page } = body
  const pageNum = page || 1

  if (!config.joobleApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Jooble API key no configurada'
    })
  }

  // Check cache first
  cleanExpiredCache()
  const cacheKey = getCacheKey(keywords, location, pageNum)
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  // Cache miss → call Jooble
  try {
    const response = await $fetch(`https://es.jooble.org/api/${config.joobleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        keywords: keywords || '',
        location: location || '',
        page: pageNum
      }
    })

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() })

    return response
  } catch (error: any) {
    console.error('Jooble API error:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Error al consultar ofertas de empleo: ' + (error.message || 'desconocido')
    })
  }
})
