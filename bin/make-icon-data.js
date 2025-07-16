/*
# bin/make-icon-data.js

This script ingests any svg files from specified `iconDirectories`
and generates an icon-data file (TypeScript or JavaScript)
at the specified `output` file-path.

Usage:
  bun run bin/make-icon-data.js [options]

Options:
  --input <dir1,dir2,...>  Comma-separated list of directories to scan for SVG icons.
                           Defaults to './icons'.
  --output <path>          Path to the output file (e.g., './app/my-icons.js').
                           Defaults to './src/icon-data.ts'.

Example:
  bun run bin/generate-icons.js --input ./my-icons,./node_modules/some-lib/icons --output ./dist/icons.js
*/

import fs from 'fs'
import path from 'path'

// Default values for options
const defaultOptions = {
  input: './icons',
  output: './src/icon-data.ts',
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
const { input: iconDirectories, output: outputFilePath } = options
const isTypescript = outputFilePath.endsWith('.ts')

const typeDeclaration = isTypescript
  ? 'interface IconData { [key: string]: string }'
  : '' // No type declaration for JS output

const iconData = {}

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
        const name = file
          .split('.')[0]
          .replace(/-([a-z0-9])/g, (_, char) => char.toLocaleUpperCase())
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
          .replace(/\d+\.\d{3,}/g, (number) => Number(number).toFixed(2))
          .replace(/stroke-stroke/g, 'stroke')
          .replace(/fill-fill/g, 'fill')
          .replace(/\s+/g, ' ')
          .replace(/>\s+</g, '><')
          .replace(/\s(id)="[^"]+"/g, '')
          .replace(/<!--.*?-->/g, '')
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
      }
    })
  }

  dirs.forEach((dir) => {
    traverseDirectory(dir)
  })
}

findIcons(iconDirectories.split(','))

// Ensure the output directory exists
const outputDir = path.dirname(outputFilePath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const source =
  (typeDeclaration ? typeDeclaration + '\n\n' : '') +
  'export default ' +
  JSON.stringify(iconData, null, 2).replace(/"(\w+)":/g, '$1:') +
  (isTypescript === 'ts' ? ' as IconData\n' : '\n')

fs.writeFileSync(outputFilePath, source, 'utf8')

console.log(`Successfully generated icon data to: ${outputFilePath}`)
