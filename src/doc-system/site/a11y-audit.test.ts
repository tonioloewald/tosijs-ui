import { test, expect } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import { auditBuiltSite, formatAxeFindings } from './a11y-audit.js'

// The run against a real Chromium is in tests/a11y-audit.pw.ts: the unit lane has no browser.

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
