import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : []
  })
}

for (const path of sourceFiles('src/domain')) {
  const source = readFileSync(path, 'utf8')
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
  const forbidden = imports.find((specifier) =>
    specifier === 'vue' || specifier === 'vue-router' ||
    specifier.startsWith('../content') || specifier.startsWith('../../public') ||
    /irregular-verbs|english-|mathematics-/.test(specifier),
  )
  if (forbidden) throw new Error(`Importación fuera del dominio en ${path}: ${forbidden}`)
}

console.log(`Frontera del dominio verificada: ${sourceFiles('src/domain').length} módulos TypeScript sin Vue ni contenidos concretos.`)
