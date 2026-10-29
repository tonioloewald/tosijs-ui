import { test, expect } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import { auditBuiltSite, formatAxeFindings } from './a11y-audit.js'

/*
Drives the real child: a real Chromium and axe-core, both devDependencies of this repo. Two
pages, one clean and one with an image that has no alt, so a pass that never looked would fail.
*/
test('the audit finds what axe finds, page by page, and passes a clean page', async () => {
  const site = mkdtempSync(path.join(tmpdir(), 'tosijs-axe-'))
  const page = (body: string) =>
    `<!doctype html><html lang="en"><head><title>T</title></head><body><main><h1>T</h1>${body}</main></body></html>`
  await Bun.write(`${site}/index.html`, page('<p>Fine.</p>'))
  await Bun.write(`${site}/bad/index.html`, page('<img src="x.png">'))
  try {
    const result = await auditBuiltSite({
      outputDir: site,
      pages: ['/', '/bad/'],
    })
    expect(result.ran).toBe(true)
    if (!result.ran) return
    expect(result.violations.map((v) => `${v.page} ${v.rule}`)).toEqual([
      '/bad/ image-alt',
    ])
  } finally {
    rmSync(site, { recursive: true, force: true })
  }
}, 60_000)

test('without axe-core or playwright in the project it did not run, and says why', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'tosijs-axe-none-'))
  await Bun.write(`${project}/package.json`, '{}')
  try {
    const result = await auditBuiltSite({
      outputDir: project,
      pages: ['/'],
      projectDir: project,
    })
    expect(result).toEqual({
      ran: false,
      reason: 'axe-core is not installed in this project (bun add -d axe-core)',
    })
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
}, 30_000)

test('the report lists the worst first, and caps the elements it names', () => {
  const report = formatAxeFindings([
    {
      page: '/a/',
      rule: 'region',
      impact: 'moderate',
      help: 'H1',
      targets: ['p'],
    },
    {
      page: '/b/',
      rule: 'image-alt',
      impact: 'critical',
      help: 'Images need alt',
      targets: ['img.a', 'img.b', 'img.c', 'img.d', 'img.e'],
    },
  ])
  expect(report.indexOf('image-alt')).toBeLessThan(report.indexOf('region'))
  expect(report).toContain('img.c')
  expect(report).not.toContain('img.d')
  expect(report).toContain('… and 2 more')
})
