import { test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

// A knockout-filled shape, an open arc (fill attribute) and an open stroke (fill in a style).
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M2 2h4v4z" style="fill:#000;stroke:#000"/>' +
  '<path d="M4 20a8 8 0 0 1 16 0" fill="none"/>' +
  '<path d="M8 8l2 2" style="fill:none;stroke:#000"/></svg>'

function generate(folder: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'tosijs-icons-'))
  try {
    mkdirSync(path.join(dir, 'in', folder), { recursive: true })
    writeFileSync(path.join(dir, 'in', folder, 'biped.svg'), SVG)
    const out = path.join(dir, 'out.js')
    const result = Bun.spawnSync([
      'bun',
      path.resolve(import.meta.dir, 'make-icon-data.js'),
      '--input',
      path.join(dir, 'in'),
      '--output',
      out,
    ])
    expect(result.exitCode).toBe(0)
    const source = readFileSync(out, 'utf8')
    return source.match(/biped:\s*'([^']*)'/)![1]
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('a stroked AND filled icon keeps the fill="none" that makes a path open (#249)', () => {
  const icon = generate('stroked/filled')
  expect(icon).toContain('class="stroked filled"')
  expect(icon.match(/fill="none"/g)?.length).toBe(2)
  expect(icon).toContain('<path d="M2 2h4v4z"/>')
  expect(icon).not.toContain('data-tosi-open-path')
})

test('a stroked-only icon still loses every fill, and the rest of the icon survives', () => {
  const icon = generate('stroked')
  expect(icon).not.toContain('fill')
  // A style with no trailing `;` once swallowed everything after it.
  expect(icon).toContain('<path d="M8 8l2 2"/></svg>')
})
