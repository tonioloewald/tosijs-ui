import { test, expect } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import {
  auditBuiltSite,
  auditFileFor,
  formatAxeFindings,
} from './a11y-audit.js'

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

test('the audit server serves only files inside the output dir (#3861)', () => {
  const root = '/srv/docs'
  expect(auditFileFor(root, '', '/')).toBe('/srv/docs/index.html')
  expect(auditFileFor(root, '', '/guide/')).toBe('/srv/docs/guide/index.html')
  expect(auditFileFor(root, '/base', '/base/guide/')).toBe(
    '/srv/docs/guide/index.html'
  )
  // A sibling whose name starts with the output dir's, and the parent.
  expect(auditFileFor(root, '', '/..%2fdocs-private%2fkey.txt')).toBe(null)
  expect(auditFileFor(root, '', '/..%2f..%2fetc%2fpasswd')).toBe(null)
  // A malformed escape is not a file.
  expect(auditFileFor(root, '', '/%E0%A4%A')).toBe(null)
})
