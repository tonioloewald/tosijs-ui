/*#
# make-icon-data

<!--{ "pin": "bottom" }-->

Ingests SVG files from icon directories and generates an icon-data module
(TypeScript or JavaScript). This is the build tool behind the `icons` system.

## Usage

    bun run bin/make-icon-data.js [options]

### Options

- `--input <dir1,dir2,...>` — directories to scan (default: `./icons`)
- `--output <path>` — output file (default: `./src/icon-data.ts`)
- `--optimize <true|false>` — round coordinates based on viewBox size (default: true)

### Examples

    bun run bin/make-icon-data.js
    bun run bin/make-icon-data.js --input ./my-icons --output ./dist/icons.js
    bun run bin/make-icon-data.js --optimize false

## Directory conventions

### Style classes

Folder names control CSS classes on the generated SVGs:

- `color/` — icons with baked-in colors (class `color`, fill/stroke preserved)
- `stroked/` — stroke-only icons (class `stroked`, fill styles removed)
- `filled/` — fill-only icons (class `filled`, stroke styles removed)

### Directional folders

Place icons in specially named folders to auto-generate directional
redirects, eliminating redundant SVG files:

- `right-left/` — base icon points right; generates a flipped left variant
- `up-down/` — base icon points up; generates a flipped down variant
- `up-down-right-left/` — base icon points right; generates down (90°),
  left (180°), and up (270°) rotation variants

For example, `chevron-right.svg` in an `up-down-right-left/` folder produces
`chevronRight` (SVG) plus `chevronDown`, `chevronLeft`, `chevronUp` (redirects).

### Comma-separated names

For icons where the directional variant has a different name (not just a
direction swap), use commas in the filename:

    skip-forward,skip-back.svg    → skipForward (SVG) + skipBack (redirect)
    refresh-cw,refresh-ccw.svg    → refreshCw (SVG) + refreshCcw (redirect)

The first name is the base, additional names are mapped to the folder's
variant suffixes in order.

## SVG processing

The tool automatically:
- Strips XML declarations, namespaces, IDs, and comments
- Removes redundant attributes (default fills, strokes)
- Collapses whitespace
- Rounds coordinates based on viewBox size (larger viewBox = fewer decimals)
- Converts filenames to camelCase (`arrow-right.svg` → `arrowRight`)
*/

import fs from 'fs'
import path from 'path'

// Default values for options
const defaultOptions = {
  input: './icons',
  output: './src/icon-data.ts',
  optimize: true, // Optimize coordinate precision based on viewBox size
}
const flags = Object.keys(defaultOptions)

// Parse command-line arguments
const args = process.argv.slice(2)
const parsedArgs = {}
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg.startsWith('--')) {
    const key = arg.substring(2)
    const value = args[i + 1]
    if (value && !value.startsWith('--')) {
      parsedArgs[key] = value
      i++ // Skip the value in the next iteration
    } else {
      parsedArgs[key] = true // Handle boolean flags (though not used for these options currently)
    }
  }
}

// Combine default options with parsed arguments
const options = { ...defaultOptions }
for (const flag of flags) {
  if (parsedArgs[flag] !== undefined) {
    options[flag] = parsedArgs[flag]
  }
}

// Destructure options for easier use
const { input: iconDirectories, output: outputFilePath, optimize } = options
const isTypescript = outputFilePath.endsWith('.ts')
const shouldOptimize = optimize === true || optimize === 'true'

// Calculate appropriate decimal precision based on viewBox size
// Larger viewBox = fewer decimal places needed
function getPrecisionForViewBox(viewBoxSize) {
  if (viewBoxSize >= 512) return 0
  if (viewBoxSize >= 64) return 1
  return 2
}

// Round numbers in SVG content based on viewBox-appropriate precision
function optimizeCoordinates(svgSource, precision) {
  return svgSource.replace(/\d+\.\d+/g, (number) => {
    const rounded = Number(number).toFixed(precision)
    // Remove trailing zeros and unnecessary decimal point
    return parseFloat(rounded).toString()
  })
}

// Extract viewBox size from SVG
function getViewBoxSize(svgSource) {
  const match = svgSource.match(/viewBox="([^"]+)"/)
  if (match) {
    const parts = match[1].split(/\s+/)
    if (parts.length >= 4) {
      const width = parseFloat(parts[2])
      const height = parseFloat(parts[3])
      return Math.max(width, height)
    }
  }
  return 24 // Default assumption
}

const typeDeclaration = isTypescript
  ? 'export interface IconData { [key: string]: string }'
  : '' // No type declaration for JS output

const iconData = {}
const iconRedirects = {}

// Directional folder conventions:
// right-left: base has "Right", generate "Left" as flip
// up-down: base has "Up", generate "Down" as flip
// up-down-right-left: base has "Right", generate Down/Left/Up via rotation
const DIRECTION_FOLDERS = {
  'right-left': {
    base: 'Right',
    variants: { Left: '0f' },
  },
  'up-down': {
    base: 'Up',
    variants: { Down: '1f' },
  },
  'up-down-right-left': {
    base: 'Right',
    variants: {
      Down: '90r',
      Left: '180r',
      Up: '270r',
    },
  },
}

function getDirectionConfig(dir) {
  const dirName = path.basename(dir)
  return DIRECTION_FOLDERS[dirName] || null
}

function generateDirectionalRedirects(name, dirConfig) {
  // Find the base direction word in the camelCase name
  const baseDir = dirConfig.base
  if (!name.includes(baseDir)) return

  for (const [targetDir, suffix] of Object.entries(dirConfig.variants)) {
    const redirectName = name.replace(baseDir, targetDir)
    if (redirectName !== name) {
      iconRedirects[redirectName] = name + suffix
    }
  }
}

function findIcons(dirs, ignore = []) {
  function traverseDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.warn(`Warning: Directory not found: ${dir}. Skipping.`)
      return
    }
    const files = fs.readdirSync(dir)
    if (ignore.includes(dir)) {
      return
    }

    files.forEach((file) => {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)

      if (stats.isDirectory()) {
        traverseDirectory(filePath)
      } else if (path.extname(file) === '.svg') {
        const content = fs.readFileSync(filePath, 'utf8')
        const rawName = file.split('.')[0]
        const names = rawName.split(',').map((n) =>
          n.trim().replace(/-([a-z0-9])/g, (_, char) => char.toLocaleUpperCase())
        )
        const name = names[0]
        let svgSource = content
          .replace(/(<\?xml.*?>|<!DOCTYPE.*?>)\s?/g, '')
          .replace(/<svg.*?>/, (a) =>
            a.replace(
              /\s(x|y|width|height|class|xmlns|xmlns:xlink)="[^"]+"/g,
              ''
            )
          )
          .replace(
            /\s?\b(opacity:1;|fill="#000000"|fill="#000"|fill="none"|class="[^"]+"|stroke="currentColor"|stroke="#000000"|stroke-linejoin="[^"]+"|stroke-width="[^"]+"|(stroke-)?stroke-linecap="[^"]+")/g,
            ''
          )
          .replace(/stroke-stroke/g, 'stroke')
          .replace(/fill-fill/g, 'fill')
          .replace(/\s+/g, ' ')
          .replace(/>\s+</g, '><')
          .replace(/\s(id)="[^"]+"/g, '')
          .replace(/<!--.*?-->/g, '')

        // Optimize coordinate precision based on viewBox size
        if (shouldOptimize) {
          const viewBoxSize = getViewBoxSize(svgSource)
          const precision = getPrecisionForViewBox(viewBoxSize)
          svgSource = optimizeCoordinates(svgSource, precision)
        }
        const classes = []
        if (dir.includes('color')) {
          classes.push('color')
        } else {
          // If not a color icon, remove fill/stroke styles
          svgSource = svgSource.replace(/(fill|stroke)(-\w+)?:[^;]+;?/g, '')
        }
        if (dir.includes('stroked')) {
          classes.push('stroked')
          svgSource = svgSource.replace(/(fill)(-\w+)?:[^;]+;?/g, '')
        }
        if (dir.includes('filled')) {
          classes.push('filled')
          svgSource = svgSource.replace(/(stroke)(-\w+)?:[^;]+;?/g, '')
        }
        if (classes.length) {
          svgSource = svgSource.replace(
            /^<svg/,
            `<svg class="${classes.join(' ')}"`
          )
        }
        iconData[name] = svgSource

        // Comma-separated names: skip-forward,skip-back.svg
        // First name is the base, subsequent names are redirects using
        // the folder's convention (0f for right-left, etc.)
        const dirConfig = getDirectionConfig(dir)
        if (names.length > 1 && dirConfig) {
          const suffixes = Object.values(dirConfig.variants)
          for (let n = 1; n < names.length && n - 1 < suffixes.length; n++) {
            iconRedirects[names[n]] = name + suffixes[n - 1]
          }
        }

        // Generate directional redirects based on folder convention
        if (dirConfig) {
          generateDirectionalRedirects(name, dirConfig)
        }
      }
    })
  }

  dirs.forEach((dir) => {
    traverseDirectory(dir)
  })
}

findIcons(iconDirectories.split(','))

// Manual redirects for icons that don't fit folder conventions
const manualRedirects = {
  arrowDownRight: 'arrowUpRight90r',
  arrowDownLeft: 'arrowUpRight180r',
  arrowUpLeft: 'arrowUpRight270r',
}
Object.assign(iconRedirects, manualRedirects)

// Merge redirects — only add if the target name doesn't already have SVG data
let redirectCount = 0
for (const [name, redirect] of Object.entries(iconRedirects)) {
  if (!iconData[name]) {
    iconData[name] = redirect
    redirectCount++
  }
}
if (redirectCount > 0) {
  console.log(`Generated ${redirectCount} directional redirects`)
}

// Ensure the output directory exists
const outputDir = path.dirname(outputFilePath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const source =
  (typeDeclaration ? typeDeclaration + '\n\n' : '') +
  'export default ' +
  JSON.stringify(iconData, null, 2).replace(/"(\w+)":/g, '$1:') +
  (isTypescript ? ' as IconData\n' : '\n')

fs.writeFileSync(outputFilePath, source, 'utf8')

console.log(`Successfully generated icon data to: ${outputFilePath}`)
