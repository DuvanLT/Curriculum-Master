import fs from 'node:fs'
import path from 'node:path'

const pagesDir = 'c:/Users/Manci/Programacion/CV- Builder/ats-master/app/pages'
const files = fs.readdirSync(pagesDir)

for (const file of files) {
  if (!file.endsWith('.vue')) continue
  const filePath = path.join(pagesDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  
  if (content.includes("middleware: 'auth'")) {
    console.log(`Updating ${file}...`)
    
    // Pattern 1: Just middleware: 'auth' inside definePageMeta
    content = content.replace(/definePageMeta\(\{\s*middleware:\s*'auth'\s*\}\)/g, '// Removed redundant middleware: auth (now global)')
    
    // Pattern 2: middleware: 'auth' among other properties
    content = content.replace(/middleware:\s*'auth',?\n?/g, '')
    
    // Pattern 3: Clean up empty definePageMeta
    content = content.replace(/definePageMeta\(\{\s*\}\)/g, '')
    
    fs.writeFileSync(filePath, content)
  }
}

console.log('Done cleaning up middleware references.')
