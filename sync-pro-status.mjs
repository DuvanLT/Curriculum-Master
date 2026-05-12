import fs from 'node:fs'
import path from 'node:path'

const pagesDir = 'c:/Users/Manci/Programacion/CV- Builder/ats-master/app/pages'
const files = fs.readdirSync(pagesDir)

for (const file of files) {
  if (!file.endsWith('.vue')) continue
  const filePath = path.join(pagesDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // 1. Ensure useSubscription is imported/used if we need to check for Pro
  if (content.includes("user.value?.subscription_name === 'pro'") || 
      content.includes("user.value?.subscription_name !== 'pro'")) {
    
    // Check if useSubscription is already there
    if (!content.includes('useSubscription()')) {
      // Add it to the setup
      content = content.replace('const { user } = useAuth()', "const { user } = useAuth()\nconst { isPro } = useSubscription()")
    } else {
      // It exists, make sure isPro is destructured
      if (!content.includes('isPro')) {
        content = content.replace(/const \{ ([^}]*) \} = useSubscription\(\)/, "const { $1, isPro } = useSubscription()")
      }
    }

    // 2. Replace the checks
    content = content.replace(/user\.value\?\.subscription_name\s*===\s*'pro'/g, 'isPro.value')
    content = content.replace(/user\.value\?\.subscription_name\s*!==\s*'pro'/g, '!isPro.value')
    
    modified = true
  }

  if (modified) {
    console.log(`Updated ${file}`)
    fs.writeFileSync(filePath, content)
  }
}
