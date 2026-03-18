import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  url: process.env.NUXT_TURSO_URL!,
  authToken: process.env.NUXT_TURSO_TOKEN!,
})

async function main() {
  try {
    try {
      await client.execute('ALTER TABLE users ADD COLUMN email_profile TEXT')
      console.log('Column email_profile added successfully')
    } catch (e: any) {
      if (e.message?.includes('duplicate column name')) {
        console.log('Column email_profile already exists')
      } else {
        throw e
      }
    }


  } catch (e: any) {
    console.error('Migration error:', e.message || e)
    process.exit(1)
  }

  process.exit(0)
}

main()
