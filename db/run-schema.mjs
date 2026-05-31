import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf-8')
for (const line of envFile.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx > 0) process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
}

const sql = neon(process.env.DATABASE_URL)
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf-8')

const cleaned = schema
  .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '')
  .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, '')

// Split on semicolons that end a statement, keeping $$ blocks intact
const statements = []
let current = ''
let inDollar = false

for (let line of cleaned.split('\n')) {
  const trimmed = line.trim()
  // Skip full-line comments outside $$ blocks
  if (trimmed.startsWith('--') && !inDollar) continue
  // Strip inline comments outside $$ blocks
  if (!inDollar && trimmed.includes('--')) {
    line = line.replace(/\s--\s.*$/, '')
  }
  if (trimmed.includes('$$')) {
    const count = (trimmed.match(/\$\$/g) || []).length
    if (count % 2 === 1) inDollar = !inDollar
  }
  current += line + '\n'
  if (!inDollar && line.trim().endsWith(';')) {
    const stmt = current.trim()
    if (stmt && stmt !== ';') statements.push(stmt)
    current = ''
  }
}

console.log(`Running ${statements.length} statements...`)

let success = 0
for (const stmt of statements) {
  try {
    await sql.query(stmt)
    success++
  } catch (err) {
    if (err.message.includes('already exists')) {
      success++
      continue
    }
    const preview = stmt.slice(0, 80).replace(/\n/g, ' ')
    console.error(`FAILED [${preview}...]: ${err.message}`)
    process.exit(1)
  }
}

console.log(`Done. ${success} statements executed successfully.`)
