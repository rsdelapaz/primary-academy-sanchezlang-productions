import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const dist = 'dist'
const manifestPath = join(dist, '.vite', 'manifest.json')
const buildManifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const entry = Object.entries(buildManifest).find(([, chunk]) => chunk.isEntry)
if (!entry) throw new Error('No se encontró el punto de entrada en el manifiesto de Vite.')

const initialFiles = new Set(['index.html', 'content/manifest.json', 'favicon.ico'])
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
const graphicFiles = allFiles.filter((file) => /\.(?:svg|webp|avif|png|jpe?g)$/i.test(file))
const vectorFiles = graphicFiles.filter((file) => file.endsWith('.svg'))
const rasterFiles = graphicFiles.filter((file) => !file.endsWith('.svg'))
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
const rasterRaw = rasterFiles.reduce((total, file) => total + statSync(file).size, 0)
const vectorGzip = vectorFiles.reduce((total, file) => total + gzipSync(readFileSync(file)).byteLength, 0)
const artworkDirectory = join(dist, 'art')
const artworkFiles = filesUnder(artworkDirectory)
// Home loads one responsive backdrop and all illustrated catalog cards in
// the chosen world. World thumbnails and other scenes are not preloaded.
const themeIds = ['galaxy', 'pop-adventure']
const initialWorldTransfer = Math.max(...themeIds.map((theme) => {
  const heroSize = Math.max(...['desktop', 'mobile'].map((viewport) =>
    transferSize(`art/${theme}-hero-${viewport}.webp`),
  ))
  const subjectsSize = artworkFiles
    .filter((file) => file.startsWith(join(artworkDirectory, 'subjects', `${theme}-`)))
    .reduce((total, file) => total + statSync(file).size, 0)
  const themeChunk = Object.entries(buildManifest).find(([key]) => key.endsWith(`src/themes/${theme}.css`))
  const themeSize = themeChunk ? transferSize(themeChunk[1].file) : 0
  return heroSize + subjectsSize + themeSize
}))
const themeIconBytes = themeIds.reduce((total, theme) => total + transferSize(`brand/theme-${theme}.svg`), 0)
const initialTransferWithArtwork = initialTransfer + initialWorldTransfer + themeIconBytes

const limits = { js: 150 * 1024, css: 35 * 1024, transfer: 350 * 1024 }
const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`
console.log(`Inicial (portada, tarjetas del mundo de mayor peso, CSS de tema e iconos): JS ${format(initialJsGzip)} gzip; CSS ${format(initialCssGzip)} gzip; transferencia estimada ${format(initialTransferWithArtwork)}.`)
console.log(`Distribución completa: JS ${format(fullJsGzip)} gzip (${format(fullJsGzip - initialJsGzip)} diferidos); CSS ${format(fullCssGzip)} gzip; paquetes educativos ${format(contentRaw)} sin comprimir; total ${format(fullDistribution)} sin comprimir.`)
console.log(`Recursos gráficos: ${graphicFiles.length} archivos; raster (WebP/AVIF/PNG/JPEG) ${format(rasterRaw)} sin comprimir; SVG ${format(vectorGzip)} gzip.`)
for (const file of artworkFiles) {
  const relativePath = file.replaceAll('\\', '/').replace(/^dist\//, '')
  console.log(`Recurso artístico ${relativePath}: ${format(statSync(file).size)} sin comprimir.`)
}
if (initialJsGzip > limits.js || initialCssGzip > limits.css || initialTransferWithArtwork > limits.transfer) {
  throw new Error('El peso inicial supera el presupuesto configurado.')
}
