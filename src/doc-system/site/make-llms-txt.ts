import * as fs from 'fs'
import * as path from 'path'

const SRC = 'src'
const DIST = 'dist'

interface ComponentDoc {
  title: string
  description: string
  srcFile: string
  distFile: string
}

function extractTitle(text: string): string {
  const match = text.match(/^#+ (.+)/m)
  return match ? match[1].trim() : ''
}

function extractDescription(text: string): string {
  const lines = text.split('\n')
  let inCodeBlock = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    // Skip non-prose lines
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('<') ||
      trimmed.startsWith('[') ||
      trimmed.startsWith('>') ||
      trimmed.startsWith('|') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('*')
    ) {
      continue
    }
    // Truncate long descriptions
    return trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed
  }
  return ''
}

export interface LlmsTxtMeta {
  name?: string
  description?: string
  /** site origin, used for the Docs link */
  baseUrl?: string
  /** project links — `github` / `npm` (or any) become Source/npm links */
  projectLinks?: Record<string, string | undefined>
  /** optional framing line(s) under the description */
  tagline?: string
}

export function generateLlmsTxt(outputPath: string, meta: LlmsTxtMeta = {}): void {
  // package.json supplies fallback name/version/description, but a doc site
  // isn't guaranteed to have one (or it may be unreadable) — degrade gracefully
  // rather than aborting the whole build.
  let pkg: { name?: string; version?: string; description?: string } = {}
  try {
    pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  } catch {
    console.warn('llms.txt: no readable package.json — using config values only')
  }
  const docs: ComponentDoc[] = []

  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.ts'))
  for (const file of files) {
    const content = fs.readFileSync(path.join(SRC, file), 'utf8')
    const match = content.match(/\/\*#([\s\S]+?)\*\//)
    if (!match) continue

    const markdown = match[1].trim()
    const title = extractTitle(markdown)
    const description = extractDescription(markdown)
    if (!title) continue

    const distFile = file.replace(/\.ts$/, '.js')
    const distPath = path.join(DIST, distFile)
    if (!fs.existsSync(distPath)) continue

    docs.push({
      title,
      description,
      srcFile: `src/${file}`,
      distFile: `dist/${distFile}`,
    })
  }

  docs.sort((a, b) => a.title.localeCompare(b.title))

  const name = meta.name ?? pkg.name ?? ''
  const description = meta.description ?? pkg.description ?? ''
  const links: string[] = []
  if (meta.baseUrl) links.push(`- Docs: ${meta.baseUrl}`)
  if (meta.projectLinks?.github) links.push(`- Source: ${meta.projectLinks.github}`)
  const npm =
    meta.projectLinks?.npm ??
    (pkg.name ? `https://www.npmjs.com/package/${pkg.name}` : undefined)
  if (npm) links.push(`- npm: ${npm}`)

  const lines: string[] = [
    `# ${name}${pkg.version ? ` v${pkg.version}` : ''}`,
    '',
    description,
    ...(meta.tagline ? ['', meta.tagline] : []),
    '',
    ...links,
    '',
    '## Documentation',
    '',
    'Each component\'s full documentation (with live code examples) is',
    'embedded in its distributed JS file as inline comments. Read the',
    'relevant dist/*.js file for complete docs, usage examples, and API.',
    '',
    '## Components and Utilities',
    '',
  ]

  for (const doc of docs) {
    lines.push(`- ${doc.distFile} — ${doc.title}`)
    if (doc.description) {
      lines.push(`  ${doc.description}`)
    }
  }

  lines.push('')

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`llms.txt generated (${docs.length} entries)`)
}

// Allow running directly
if (import.meta.main) {
  generateLlmsTxt('dist/llms.txt')
}
