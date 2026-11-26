import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const dist = 'dist'
const manifestPath = join(dist, '.vite', 'manifest.json')
const buildManifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const entry = Object.entries(buildManifest).find(([, chunk]) => chunk.isEntry)
if (!entry) throw new Error('No se encontró el punto de entrada en el manifiesto de Vite.')

const initialFiles = new Set(['index.html', 'content/manifest.json'])
const visitedChunks = new Set()
function addInitialChunk(key) {
  if (visitedChunks.has(key)) return
  const chunk = buildManifest[key]
  if (!chunk) throw new Error(`Chunk ausente del manifiesto: ${key}`)
  visitedChunks.add(key)
  initialFiles.add(chunk.file)
  for (const file of [...(chunk.css ?? []), ...(chunk.assets ?? [])]) initialFiles.add(file)
  for (const imported of chunk.imports ?? []) addInitialChunk(imported)
}
addInitialChunk(entry[0])
const homeRoute = Object.entries(buildManifest).find(([key]) => key.endsWith('src/views/HomeView.vue'))
if (!homeRoute) throw new Error('No se encontró la vista inicial HomeView en el manifiesto de Vite.')
addInitialChunk(homeRoute[0])

function filesUnder(directory) {
  return readdirSync(directory, { recursive: true })
    .map((file) => join(directory, file))
    .filter((path) => statSync(path).isFile())
}

function transferSize(path) {
  const data = readFileSync(join(dist, path))
  const compressible = /\.(?:html|js|css|json|svg)$/i.test(path)
  return compressible ? gzipSync(data).byteLength : data.byteLength
}

const allFiles = filesUnder(dist)
const jsFiles = allFiles.filter((file) => file.endsWith('.js'))
const cssFiles = allFiles.filter((file) => file.endsWith('.css'))
const initialJs = [...initialFiles].filter((file) => file.endsWith('.js'))
const initialCss = [...initialFiles].filter((file) => file.endsWith('.css'))
const initialJsGzip = initialJs.reduce((total, file) => total + gzipSync(readFileSync(join(dist, file))).byteLength, 0)
const initialCssGzip = initialCss.reduce((total, file) => total + gzipSync(readFileSync(join(dist, file))).byteLength, 0)
const initialTransfer = [...initialFiles].reduce((total, file) => total + transferSize(file), 0)
const fullJsGzip = jsFiles.reduce((total, file) => total + gzipSync(readFileSync(file)).byteLength, 0)
const fullCssGzip = cssFiles.reduce((total, file) => total + gzipSync(readFileSync(file)).byteLength, 0)
const contentFiles = allFiles.filter((file) => file.includes(`${join(dist, 'content')}`))
const contentRaw = contentFiles.reduce((total, file) => total + statSync(file).size, 0)
const fullDistribution = allFiles.reduce((total, file) => total + statSync(file).size, 0)

const limits = { js: 150 * 1024, css: 35 * 1024, transfer: 350 * 1024 }
const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`
console.log(`Inicial (grafo estático de Vite): JS ${format(initialJsGzip)} gzip; CSS ${format(initialCssGzip)} gzip; recursos ${format(initialTransfer)} estimados con gzip para HTML/JS/CSS/JSON/SVG.`)
console.log(`Distribución completa: JS ${format(fullJsGzip)} gzip (${format(fullJsGzip - initialJsGzip)} diferidos); CSS ${format(fullCssGzip)} gzip; paquetes educativos ${format(contentRaw)} sin comprimir; total ${format(fullDistribution)} sin comprimir.`)
if (initialJsGzip > limits.js || initialCssGzip > limits.css || initialTransfer > limits.transfer) {
  throw new Error('El peso inicial supera el presupuesto configurado.')
}
