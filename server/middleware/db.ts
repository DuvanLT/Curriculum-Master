export default defineEventHandler(async () => {
  if (process.dev) {
    try {
      await initDb()
      console.log('Database initialized successfully')
    } catch (e) {
      console.error('Error initializing database:', e)
    }
  }
})
