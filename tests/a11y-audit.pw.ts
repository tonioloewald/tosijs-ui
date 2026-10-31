import { test, expect } from './fixtures'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

/*
The accessibility mode's axe audit against a real Chromium and axe-core (#3521). Here, not in
the unit lane, because CI's unit job installs no browser.

Two pages, one clean and one with an image that has no alt, so a pass that never looked fails.
`auditBuiltSite` is Bun code (it spawns its own browser in a Bun child), and this runner is
Node, so it is called through `bun`.
*/
test('the axe audit finds what axe finds, page by page, and passes a clean page', async ({
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'the audit runs its own Chromium')
  test.setTimeout(60_000)
  const site = mkdtempSync(path.join(tmpdir(), 'tosijs-axe-'))
  const page = (body: string) =>
    `<!doctype html><html lang="en"><head><title>T</title></head><body><main><h1>T</h1>${body}</main></body></html>`
  writeFileSync(`${site}/index.html`, page('<p>Fine.</p>'))
  mkdirSync(`${site}/bad`)
  writeFileSync(`${site}/bad/index.html`, page('<img src="x.png">'))
  try {
    const out = execFileSync(
      'bun',
      [
        '-e',
        `import { auditBuiltSite } from ${JSON.stringify(
          path.resolve('src/doc-system/site/a11y-audit.ts')
        )}
        const result = await auditBuiltSite({ outputDir: ${JSON.stringify(
          site
        )}, pages: ['/', '/bad/'] })
        console.log(JSON.stringify(result))`,
      ],
      { encoding: 'utf8' }
    )
    const result = JSON.parse(out.trim().split('\n').pop()!)
    expect(
      result.ran
        ? result.violations.map((v: any) => `${v.page} ${v.rule}`)
        : result
    ).toEqual(['/bad/ image-alt'])
  } finally {
    rmSync(site, { recursive: true, force: true })
  }
})

/*
A slow page (a 3D scene loading its models) is waited for while it is aria-busy, and one that
never stops being busy is listed as not fully checked rather than counted clean or allowed to
end the audit. The limit is shortened to 4s here; the default is 30s.
*/
test('the audit waits for an aria-busy page, and lists one that never settles', async ({
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'the audit runs its own Chromium')
  test.setTimeout(60_000)
  const site = mkdtempSync(path.join(tmpdir(), 'tosijs-axe-slow-'))
  const page = (body: string) =>
    `<!doctype html><html lang="en"><head><title>T</title></head><body><main><h1>T</h1>${body}</main></body></html>`
  mkdirSync(`${site}/slow`)
  // Busy for 2s, then its control arrives, unlabelled: only a page that waited can see it.
  writeFileSync(
    `${site}/slow/index.html`,
    page(`<div id="scene" aria-busy="true">Loading…</div><script>
      setTimeout(() => {
        const scene = document.getElementById('scene')
        scene.innerHTML = '<input type="range">'
        scene.removeAttribute('aria-busy')
      }, 2000)
    </script>`)
  )
  mkdirSync(`${site}/stuck`)
  writeFileSync(
    `${site}/stuck/index.html`,
    page('<div aria-busy="true">Loading forever</div>')
  )
  try {
    const out = execFileSync(
      'bun',
      [
        '-e',
        `import { auditBuiltSite } from ${JSON.stringify(
          path.resolve('src/doc-system/site/a11y-audit.ts')
        )}
        const result = await auditBuiltSite({ outputDir: ${JSON.stringify(
          site
        )}, pages: ['/slow/', '/stuck/'], slowPageMs: 4000 })
        console.log(JSON.stringify(result))`,
      ],
      { encoding: 'utf8' }
    )
    const result = JSON.parse(out.trim().split('\n').pop()!)
    expect(result.ran).toBe(true)
    expect(result.violations.map((v: any) => `${v.page} ${v.rule}`)).toEqual([
      '/slow/ label',
    ])
    expect(result.unsettled).toEqual([
      {
        page: '/stuck/',
        reason: 'still aria-busy after 4s; audited as it stood',
      },
    ])
  } finally {
    rmSync(site, { recursive: true, force: true })
  }
})
