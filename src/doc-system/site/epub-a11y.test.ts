import { test, expect } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import {
  accessibilityMetadata,
  aceVerdict,
  runAce,
  findAce,
  ACE_NOT_INSTALLED,
  EPUB_A11Y_CONFORMANCE,
} from './epub-a11y.js'

const lines = (xml: string) => xml.trim().split(/\n\s*/)

test('a described, verified book claims alternative text, textual sufficiency and conformance', () => {
  const xml = accessibilityMetadata({
    hasImages: true,
    imagesDescribed: true,
    verified: true,
  })
  expect(lines(xml)).toEqual([
    '<meta property="schema:accessMode">textual</meta>',
    '<meta property="schema:accessMode">visual</meta>',
    '<meta property="schema:accessModeSufficient">textual</meta>',
    '<meta property="schema:accessModeSufficient">textual,visual</meta>',
    '<meta property="schema:accessibilityFeature">structuralNavigation</meta>',
    '<meta property="schema:accessibilityFeature">tableOfContents</meta>',
    '<meta property="schema:accessibilityFeature">readingOrder</meta>',
    '<meta property="schema:accessibilityFeature">displayTransformability</meta>',
    '<meta property="schema:accessibilityFeature">alternativeText</meta>',
    '<meta property="schema:accessibilityHazard">none</meta>',
    '<meta property="schema:accessibilitySummary">Reflowable text with a navigable table of contents and headings in reading order. Every image has a text alternative or a caption. Checked with DAISY Ace against WCAG 2.2 AA.</meta>',
    `<meta property="dcterms:conformsTo">${EPUB_A11Y_CONFORMANCE}</meta>`,
  ])
})

test('it never claims more than it knows: undescribed images, unverified', () => {
  const xml = accessibilityMetadata({
    hasImages: true,
    imagesDescribed: false,
    verified: false,
  })
  expect(xml).not.toContain('alternativeText')
  expect(xml).not.toContain('accessModeSufficient">textual<')
  expect(xml).not.toContain('conformsTo')
  expect(xml).toContain('Some images have no text alternative.')
  expect(xml).toContain('Not checked against WCAG 2.2 AA')
})

test('a book with no images is textual only; adopter options override the defaults', () => {
  const xml = accessibilityMetadata(
    { hasImages: false, imagesDescribed: true, verified: false },
    {
      summary: 'A novel. <Plain> text.',
      hazards: ['noFlashingHazard', 'noSoundHazard'],
      certifiedBy: 'A & B Press',
    }
  )
  expect(xml).not.toContain('visual')
  expect(xml).toContain(
    '<meta property="schema:accessibilitySummary">A novel. &lt;Plain&gt; text.</meta>'
  )
  expect(xml).toContain('schema:accessibilityHazard">noSoundHazard<')
  expect(xml).not.toContain('accessibilityHazard">none<')
  expect(xml).toContain(
    '<meta property="a11y:certifiedBy">A &amp; B Press</meta>'
  )
})

test('aceVerdict reads the outcome and names the failing checks, nested ones included', () => {
  expect(
    aceVerdict({
      'earl:result': { 'earl:outcome': 'fail' },
      assertions: [
        {
          'earl:result': { 'earl:outcome': 'fail' },
          assertions: [
            {
              'earl:test': { 'dct:title': 'image-alt' },
              'earl:result': { 'earl:outcome': 'fail' },
            },
            {
              'earl:test': { 'dct:title': 'color-contrast' },
              'earl:result': { 'earl:outcome': 'pass' },
            },
          ],
        },
      ],
    })
  ).toEqual({ passed: false, failures: ['image-alt'] })
  expect(aceVerdict({ 'earl:result': { 'earl:outcome': 'pass' } })).toEqual({
    passed: true,
    failures: [],
  })
})

test('without Ace in the project or on PATH it did not run, and says why', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'tosijs-noace-'))
  try {
    expect(await runAce('book.epub', project, project)).toEqual({
      ran: false,
      reason: ACE_NOT_INSTALLED,
    })
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

// A fake install laid out as npm lays one out: the bin is a symlink into the package.
function fakeAce(dir: string, binDir: string, name: string): string {
  const pkg = path.join(dir, 'pkg-' + name.replace(/\W/g, '-'))
  mkdirSync(path.join(pkg, 'bin'), { recursive: true })
  writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name }))
  writeFileSync(path.join(pkg, 'bin', 'ace.js'), '#!/bin/sh\n', { mode: 0o755 })
  mkdirSync(binDir, { recursive: true })
  const link = path.join(binDir, 'ace')
  symlinkSync(path.join(pkg, 'bin', 'ace.js'), link)
  return link
}

test('Ace is found on PATH when the project does not have it (#3577)', () => {
  const project = mkdtempSync(path.join(tmpdir(), 'tosijs-ace-path-'))
  const bin = path.join(project, 'global-bin')
  try {
    const global = fakeAce(project, bin, '@daisy/ace')
    expect(findAce(project, bin)).toBe(global)
    // the project's own copy wins
    const local = fakeAce(
      path.join(project, 'node_modules'),
      path.join(project, 'node_modules', '.bin'),
      '@daisy/ace-cli'
    )
    expect(findAce(project, bin)).toBe(local)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('an `ace` that is not DAISY Ace is skipped, and named (#3864)', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'tosijs-ace-impostor-'))
  const impostorBin = path.join(project, 'impostor-bin')
  const realBin = path.join(project, 'real-bin')
  try {
    const impostor = fakeAce(project, impostorBin, 'ace-editor-cli')
    expect(findAce(project, impostorBin)).toBe(null)
    const result = await runAce('book.epub', project, impostorBin)
    expect(result.ran).toBe(false)
    expect((result as { reason: string }).reason).toContain(impostor)
    // A real one later on PATH is still found.
    const real = fakeAce(project, realBin, '@daisy/ace')
    expect(findAce(project, [impostorBin, realBin].join(path.delimiter))).toBe(
      real
    )
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})
