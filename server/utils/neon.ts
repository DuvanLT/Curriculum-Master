import postgres from 'postgres'

let sqlClient: ReturnType<typeof postgres> | null = null

export const useNeonDb = () => {
  if (sqlClient) return sqlClient

  const config = useRuntimeConfig()
  // Support both nuxt runtime config and process env as a fallback
  const dbUrl = config.neonDbUrl || process.env.NUXT_NEON_DB_URL

  if (!dbUrl) {
    throw new Error('La URL de NeonDB (NUXT_NEON_DB_URL) no está configurada en las variables de entorno.')
  }

  // Cliente directo a Postgres/Neon (sin pooling, máximo rendimiento)
  sqlClient = postgres(dbUrl, {
    ssl: 'require',
    max: 10,             // Límite de conexiones simultáneas locales
    idle_timeout: 15,    // Cierre rápido de conexiones inactivas para liberar recursos en Neon
    connect_timeout: 10  // Tiempo máximo de espera para conectar (en segundos)
  })

  return sqlClient
}
