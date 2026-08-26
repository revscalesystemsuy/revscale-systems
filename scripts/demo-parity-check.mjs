import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const surfaces = JSON.parse(fs.readFileSync(path.join(root, 'lib/product-surfaces.json'), 'utf8'))
const entitlements = JSON.parse(fs.readFileSync(path.join(root, 'lib/plan-entitlements.json'), 'utf8'))
const errors = []
const paidPlans = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE']
const demoPlanFor = (plan) => plan.toLowerCase()

for (const [feature, plans] of Object.entries(entitlements)) {
  if (!Array.isArray(plans) || plans.length === 0) errors.push(`${feature}: entitlement plans must not be empty`)
  for (const plan of plans) {
    if (!paidPlans.includes(plan)) errors.push(`${feature}: unknown plan ${plan}`)
  }
  if (plans.includes('PROFESSIONAL') && !plans.includes('ENTERPRISE')) {
    errors.push(`${feature}: Professional entitlement must also be available to Enterprise`)
  }
  if (plans.includes('STARTER') && (!plans.includes('PROFESSIONAL') || !plans.includes('ENTERPRISE'))) {
    errors.push(`${feature}: Starter entitlement must be inherited by higher plans`)
  }
}

for (const surface of surfaces) {
  for (const [kind, href] of [['real', surface.realHref], ['demo', surface.demoHref]]) {
    const appPath = href === '/protected' || href === '/demo'
      ? path.join(root, 'app', href.slice(1), 'page.tsx')
      : path.join(root, 'app', ...href.slice(1).split('/'), 'page.tsx')
    if (!fs.existsSync(appPath)) errors.push(`${surface.id}: missing ${kind} page for ${href}`)
  }

  if (!Array.isArray(surface.realPlans) || surface.realPlans.length === 0) {
    errors.push(`${surface.id}: realPlans must not be empty`)
  }
  if (!Array.isArray(surface.demoPlans) || surface.demoPlans.length === 0) {
    errors.push(`${surface.id}: demoPlans must not be empty`)
  }

  if (surface.feature) {
    const entitledPlans = entitlements[surface.feature]
    if (!entitledPlans) {
      errors.push(`${surface.id}: unknown feature ${surface.feature}`)
      continue
    }

    for (const plan of entitledPlans) {
      if (!surface.realPlans.includes(plan)) {
        errors.push(`${surface.id}: ${plan} has ${surface.feature} but realPlans omits it`)
      }
    }

    const expectedDemoPlans = entitledPlans.map(demoPlanFor).sort()
    const actualDemoPlans = [...surface.demoPlans].sort()
    if (JSON.stringify(expectedDemoPlans) !== JSON.stringify(actualDemoPlans)) {
      errors.push(`${surface.id}: demoPlans ${actualDemoPlans.join(',')} do not match ${surface.feature} entitlements ${expectedDemoPlans.join(',')}`)
    }
  } else {
    const expectedDemoPlans = surface.realPlans.filter((plan) => paidPlans.includes(plan)).map(demoPlanFor).sort()
    const actualDemoPlans = [...surface.demoPlans].sort()
    if (JSON.stringify(expectedDemoPlans) !== JSON.stringify(actualDemoPlans)) {
      errors.push(`${surface.id}: ungated demoPlans ${actualDemoPlans.join(',')} do not match realPlans ${expectedDemoPlans.join(',')}`)
    }
  }
}

const uniqueIds = new Set(surfaces.map((surface) => surface.id))
if (uniqueIds.size !== surfaces.length) errors.push('Duplicate surface ids detected')

const demoHrefs = new Set(surfaces.map((surface) => surface.demoHref))
if (demoHrefs.size !== surfaces.length) errors.push('Duplicate demoHref values detected')

const realHrefs = new Set(surfaces.map((surface) => surface.realHref))
if (realHrefs.size !== surfaces.length) errors.push('Duplicate realHref values detected')

const planAccessSource = fs.readFileSync(path.join(root, 'lib/plan-access.ts'), 'utf8')
if (!planAccessSource.includes('plan-entitlements.json')) {
  errors.push('plan-access.ts must consume plan-entitlements.json')
}
if (/feature === |feature ===/.test(planAccessSource)) {
  errors.push('plan-access.ts must not hardcode feature entitlement branches')
}

for (const file of ['app/pricing/page.tsx', 'app/demos/page.tsx', 'app/protected/billing/page.tsx', 'app/request/page.tsx', 'app/request/checkout/page.tsx']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  if (!source.includes('plan-catalog')) errors.push(`${file}: must consume the central plan catalog`)
}

if (errors.length) {
  console.error('Product parity contract failed:\n- ' + errors.join('\n- '))
  process.exit(1)
}

console.log(`Product parity contract OK: ${surfaces.length} surfaces and ${Object.keys(entitlements).length} feature entitlements verified.`)
