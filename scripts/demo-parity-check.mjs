import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const surfaces = JSON.parse(fs.readFileSync(path.join(root, 'lib/product-surfaces.json'), 'utf8'))
const errors = []

for (const surface of surfaces) {
  for (const [kind, href] of [['real', surface.realHref], ['demo', surface.demoHref]]) {
    const appPath = href === '/protected' || href === '/demo'
      ? path.join(root, 'app', href.slice(1), 'page.tsx')
      : path.join(root, 'app', ...href.slice(1).split('/'), 'page.tsx')
    if (!fs.existsSync(appPath)) errors.push(`${surface.id}: missing ${kind} page for ${href}`)
  }

  if (!Array.isArray(surface.demoPlans) || surface.demoPlans.length === 0) {
    errors.push(`${surface.id}: demoPlans must not be empty`)
  }
}

const uniqueIds = new Set(surfaces.map((surface) => surface.id))
if (uniqueIds.size !== surfaces.length) errors.push('Duplicate surface ids detected')

const demoHrefs = new Set(surfaces.map((surface) => surface.demoHref))
if (demoHrefs.size !== surfaces.length) errors.push('Duplicate demoHref values detected')

const realHrefs = new Set(surfaces.map((surface) => surface.realHref))
if (realHrefs.size !== surfaces.length) errors.push('Duplicate realHref values detected')

if (errors.length) {
  console.error('Demo parity contract failed:\n- ' + errors.join('\n- '))
  process.exit(1)
}

console.log(`Demo parity contract OK: ${surfaces.length} product surfaces verified.`)
