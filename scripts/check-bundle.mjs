import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const dist = 'dist'
let js = 0
let css = 0
let total = 0

for (const file of readdirSync(dist, { recursive: true })) {
  const path = join(dist, file)
  if (!statSync(path).isFile()) continue
  const size = readFileSync(path).byteLength
  total += size
  if (file.endsWith('.js')) js += gzipSync(readFileSync(path)).byteLength
  if (file.endsWith('.css')) css += gzipSync(readFileSync(path)).byteLength
}

const limits = { js: 150 * 1024, css: 35 * 1024, total: 350 * 1024 }
const bytes = (value) => `${(value / 1024).toFixed(1)} KiB`
const ok = js <= limits.js && css <= limits.css && total <= limits.total
console.log(`Bundle: JS gzip ${bytes(js)} / ${bytes(limits.js)}; CSS gzip ${bytes(css)} / ${bytes(limits.css)}; transferencia sin comprimir ${bytes(total)} / ${bytes(limits.total)}`)
if (!ok) process.exit(1)
