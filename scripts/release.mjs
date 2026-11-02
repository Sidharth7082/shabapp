#!/usr/bin/env node
/**
 * One command to ship a new build of Shabh Service.
 *
 *   npm run release -- --minor --notes "New: team locator" --notes "Fixed: login layout"
 *   npm run release -- --version 0.2.1 --notes-file release-notes.md
 *
 * Steps: bump package.json + public/update.json, build the web bundle and the
 * APK, publish the APK to the public release repo, update the public update
 * manifest, append a PLAN.md changelog entry, commit and push.
 *
 * The installed app checks the public manifest on every launch, so publishing
 * through this script is what makes "New version available" appear for users.
 */
import { execFileSync as exec } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const RELEASE_REPO = process.env.RELEASE_REPO ?? 'Sidharth7082/shabapp-releases'
const APK = 'android/app/build/outputs/apk/debug/app-debug.apk'
const args = process.argv.slice(2)

const usage = `
Usage:
  npm run release -- --patch|--minor|--major [--notes "text"]...
  npm run release -- --version 1.2.3 [--notes-file notes.txt]
  Add --dry-run to validate without building or publishing.
`

function flag(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function repeat(name) {
  return args.flatMap((value, index) =>
    value === name && args[index + 1] ? [args[index + 1]] : []
  )
}

function fail(message) {
  console.error(`\nRelease stopped: ${message}\n`)
  process.exit(1)
}

function run(command, commandArgs, { quiet = false } = {}) {
  return exec(command, commandArgs, {
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8'
  })
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(usage)
  process.exit(0)
}

const dryRun = args.includes('--dry-run')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const current = pkg.version
const bump = args.includes('--minor') ? 'minor' : args.includes('--major') ? 'major' : 'patch'

function nextVersion(version, type) {
  const [major, minor, patch] = version.split('.').map((part) => Number(part) || 0)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const version = flag('--version') ?? nextVersion(current, bump)

if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`"${version}" is not a valid version (x.y.z)`)

const notes = [...repeat('--notes')]
const notesFile = flag('--notes-file')
if (notesFile) {
  if (!existsSync(notesFile)) fail(`Notes file not found: ${notesFile}`)
  notes.push(
    ...readFileSync(notesFile, 'utf8')
      .split('\n')
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
  )
}
if (notes.length === 0) fail('Add at least one --notes "what changed" line')

const dirty = run('git', ['status', '--porcelain'], { quiet: true }).trim()
if (dirty) fail('Commit or stash your working changes first (release needs a clean tree)')

if (dryRun) {
  console.log(`[dry-run] v${current} -> v${version}`)
  console.log(notes.map((note) => ` - ${note}`).join('\n'))
  process.exit(0)
}

// 1. Version files
const pkgText = readFileSync('package.json', 'utf8').replace(
  /"version":\s*"[^"]+"/,
  `"version": "${version}"`
)
writeFileSync('package.json', pkgText)
run('npm', ['install', '--package-lock-only'], { quiet: true })

const manifest = {
  version,
  channel: 'stable',
  releasedAt: new Date().toISOString(),
  notes,
  apkUrl: `https://github.com/${RELEASE_REPO}/releases/download/v${version}/shabh-service-debug.apk?v=${version}`,
  webUrl: `https://github.com/${RELEASE_REPO}/releases/tag/v${version}`
}
writeFileSync('public/update.json', `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`\nBuilding v${version}…`)
run('npm', ['run', 'android:apk'])

if (!existsSync(APK)) fail('The APK was not produced. Is the Android SDK configured?')

mkdirSync('release', { recursive: true })
const apkCopy = 'release/shabh-service-debug.apk'
copyFileSync(APK, apkCopy)

// 2. Public release in the binary-only repo
let releaseExists = false
try {
  run('gh', ['release', 'view', `v${version}`, '--repo', RELEASE_REPO], { quiet: true })
  releaseExists = true
} catch {
  releaseExists = false
}

if (releaseExists) {
  run('gh', ['release', 'upload', `v${version}`, apkCopy, '--repo', RELEASE_REPO, '--clobber'])
} else {
  run('gh', [
    'release',
    'create',
    `v${version}`,
    apkCopy,
    '--repo',
    RELEASE_REPO,
    '--title',
    `Shabh Service v${version}`,
    '--notes',
    notes.join('\n')
  ])
}

// 3. The manifest must point at a file that actually downloads.
const probe = await fetch(manifest.apkUrl, { method: 'HEAD', redirect: 'follow' })
if (!probe.ok) {
  fail(`The APK URL is not reachable (${probe.status}): ${manifest.apkUrl}`)
}

// 4. Update the public manifest the app checks on launch
const content = Buffer.from(readFileSync('public/update.json')).toString('base64')
let sha = null
try {
  sha = run('gh', ['api', `repos/${RELEASE_REPO}/contents/update.json`, '--jq', '.sha'], {
    quiet: true
  }).trim()
} catch {
  sha = null
}

const apiArgs = [
  'api',
  '--method',
  'PUT',
  `repos/${RELEASE_REPO}/contents/update.json`,
  '-f',
  `message=chore: release v${version}`,
  '-f',
  `content=${content}`
]
if (sha) apiArgs.push('-f', `sha=${sha}`)
run('gh', apiArgs)

// 5. PLAN.md changelog (the living plan must match reality)
const date = new Date().toISOString().slice(0, 10)
const entry = `### ${date} — Release v${version}\n${notes.map((note) => `- ${note}`).join('\n')}\n\n`
const plan = readFileSync('PLAN.md', 'utf8')
const updatedPlan = plan
  .replace(/- \*\*Last updated:\*\* .*/, `- **Last updated:** ${date}`)
  .replace('## 10. Changelog\n\n', `## 10. Changelog\n\n${entry}`)
writeFileSync('PLAN.md', updatedPlan)

// 6. Commit and push the source repo
run('git', ['add', 'package.json', 'package-lock.json', 'public/update.json', 'PLAN.md'])
run('git', ['commit', '-m', `chore(release): v${version}`])
run('git', ['push'])

console.log(`\nReleased v${version}`)
console.log(`Release:  ${manifest.webUrl}`)
console.log(`Download: ${manifest.apkUrl}`)
console.log('Installed apps will show “New version available” on their next launch.')
