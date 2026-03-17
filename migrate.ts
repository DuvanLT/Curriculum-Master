import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
dotenv.config()

const client = createClient({
  url: process.env.NUXT_TURSO_URL!,
  authToken: process.env.NUXT_TURSO_TOKEN!,
})

async function main() {
  try {
    await client.execute("ALTER TABLE applications ADD COLUMN interview_date TEXT")
    console.log("Column interview_date added successfully")
  } catch (e: any) {
    if (e.message.includes("duplicate column name")) {
      console.log("Column already exists")
    } else {
      console.error("Error adding column:", e.message)
    }
  } finally {
    process.exit(0)
  }
}

main()
