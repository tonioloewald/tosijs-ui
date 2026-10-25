import { test, expect, describe } from 'bun:test'
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
  existsSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  embedGatePage,
  groupCode,
  shortCodeScript,
} from './resolve-site-config.ts'
import {
  mintLinkToken,
  normalizeLinkToken,
} from '../src/doc-system/site/dev-auth.ts'

/*
Short links (board #3504): `https://<domain>/<CODE>`, and a box on the gate and root pages, find
the workspace that minted a single-use code. Checked end to end against real Caddy 2.11.7 while
building it (routes, the gate page in Chromium); these hold the parts that can drift.
*/

const REPO = new URL('..', import.meta.url).pathname
const PAGE = readFileSync(join(REPO, 'deploy/gate-page.html'), 'utf8')
const CADDYFILE = readFileSync(join(REPO, 'deploy/Caddyfile'), 'utf8')
const LINK = 'https://ui.edit.dev.example.com/?t=RCQAMHFX'

describe('recording a code on the box', () => {
  test('writes the link under the code, readable by Caddy, and sweeps stale codes', () => {
    const root = mkdtempSync(join(tmpdir(), 'short-links-'))
    try {
      const script = shortCodeScript(root, 'RCQAMHFX', LINK)!
      expect(script).not.toBeNull()
      // A code from earlier, past its five-minute life.
      Bun.spawnSync(['bash', '-c', `mkdir -p ${root}/_codes`])
      writeFileSync(join(root, '_codes/OLDCODEX'), 'https://old/?t=OLDCODEX\n')
      const old = Date.now() / 1000 - 600
      utimesSync(join(root, '_codes/OLDCODEX'), old, old)

      expect(Bun.spawnSync(['bash', '-c', script]).exitCode).toBe(0)
      expect(readFileSync(join(root, '_codes/RCQAMHFX'), 'utf8')).toBe(
        `${LINK}\n`
      )
      expect(statSync(join(root, '_codes/RCQAMHFX')).mode & 0o777).toBe(0o644)
      expect(existsSync(join(root, '_codes/OLDCODEX'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('writes nothing it has not checked, since it is a shell command', () => {
    const ok = ['/srv/preview', 'RCQAMHFX', LINK] as const
    expect(shortCodeScript(...ok)).not.toBeNull()
    for (const code of [
      'rcqamhfx',
      'RCQAMHF',
      'RCQAMHFX1',
      "RCQ'MHFX",
      'IIIIIIII',
    ])
      expect(shortCodeScript(ok[0], code, LINK)).toBeNull()
    for (const link of [
      'http://ui.edit.dev.example.com/?t=RCQAMHFX',
      "https://ui.edit.dev.example.com/?t=RCQAMHFX';rm -rf /;'",
      'https://ui.edit.dev.example.com/?t=ABCDEFGH', // another code's link
      'https://evil.com/x?t=RCQAMHFX',
    ])
      expect(shortCodeScript(ok[0], 'RCQAMHFX', link)).toBeNull()
    for (const root of ['srv/preview', '/srv/pre view', '/srv/$(id)'])
      expect(shortCodeScript(root, 'RCQAMHFX', LINK)).toBeNull()
  })

  test('every code the dev server mints can be recorded', () => {
    for (let i = 0; i < 200; i++) {
      const code = mintLinkToken()
      expect(
        shortCodeScript(
          '/srv/preview',
          code,
          `https://ui.edit.dev.example.com/?t=${code}`
        )
      ).not.toBeNull()
    }
  })

  test('codes print in two groups of four', () => {
    expect(groupCode('RCQAMHFX')).toBe('RCQA MHFX')
    expect(normalizeLinkToken(groupCode('RCQAMHFX'))).toBe('RCQAMHFX')
  })
})

describe('the gate page', () => {
  test('survives being a Caddyfile string', () => {
    // `{path}`, `{host}` and `{query}` are Caddy placeholders: a brace with no space after it
    // could be expanded. Only `\"` is an escape inside a Caddyfile string.
    const body = embedGatePage('respond "__GATE_PAGE__" 401', PAGE)
    expect(body).not.toContain('__GATE_PAGE__')
    expect(body).not.toContain('<!--')
    // As installed: the installer has substituted the domain by the time Caddy reads it.
    const unescaped = body
      .slice('respond "'.length, -'" 401'.length)
      .replaceAll('{{PREVIEW_DOMAIN}}', 'dev.example.com')
    // Placeholder names start with a letter; a regex quantifier like `{8}` is left alone (it
    // works through real Caddy).
    expect(unescaped.match(/\{[A-Za-z_$][^\s{}]*\}/g) ?? []).toEqual([])
    expect(unescaped.replace(/\\"/g, '')).not.toContain('"')
    expect(PAGE).not.toMatch(/\\"/)
  })

  test('folds a typed code exactly as the dev server does', () => {
    const normalize = pageNormalize()
    for (const typed of [
      'rcqa mhfx',
      'RCQA-MHFX',
      ' r c q a m h f x ',
      'A5Z2B8G6',
      'rcqa\tmhfx',
    ])
      expect(normalize(typed)).toBe(normalizeLinkToken(typed))
  })

  test('accepts exactly the alphabet the dev server mints from', () => {
    const page = PAGE.match(/const CODE = \/\^\[([A-Z]+)\]\{8\}\$\//)![1]
    const server = readFileSync(
      join(REPO, 'src/doc-system/site/dev-auth.ts'),
      'utf8'
    ).match(/const LINK_ALPHABET = '([A-Z]+)'/)![1]
    expect(page).toBe(server)
  })

  test('a short link at the root goes to the link recorded for its code', async () => {
    const run = await gate({
      url: 'https://dev.example.com/rcqa-mhfx',
      codes: { RCQAMHFX: LINK },
    })
    expect(run.fetched).toEqual(['/_codes/RCQAMHFX'])
    expect(run.went).toBe(LINK)
  })

  test('a code typed into the box goes there too', async () => {
    const run = await gate({
      url: 'https://dev.example.com/',
      codes: { RCQAMHFX: LINK },
      type: 'rcqa mhfx',
    })
    expect(run.went).toBe(LINK)
  })

  test('a code on another preview host is sent to the root, which can look it up', async () => {
    const run = await gate({
      url: 'https://docs.dev.example.com/?t=rcqamhfx',
      codes: {},
    })
    expect(run.fetched).toEqual([])
    expect(run.went).toBe('https://dev.example.com/RCQAMHFX')
  })

  test('never follows a link off the preview domain, typed or recorded', async () => {
    const typed = await gate({
      url: 'https://dev.example.com/',
      codes: {},
      type: 'evil.com/?t=RCQAMHFX',
    })
    expect(typed.went).toBeUndefined()
    expect(typed.message).toContain('not under dev.example.com')
    const recorded = await gate({
      url: 'https://dev.example.com/RCQAMHFX',
      codes: { RCQAMHFX: 'https://dev.example.com.evil.com/?t=RCQAMHFX' },
    })
    expect(recorded.went).toBeUndefined()
    expect(recorded.message).toContain('outside dev.example.com')
  })

  test('says so when a code is unknown or is not a code', async () => {
    const unknown = await gate({
      url: 'https://dev.example.com/',
      codes: {},
      type: 'abcdefgh',
    })
    expect(unknown.message).toContain('No live link has the code ABCDEFGH')
    const notCode = await gate({
      url: 'https://dev.example.com/',
      codes: {},
      type: 'hello',
    })
    expect(notCode.message).toContain('not a code')
  })

  test('a page path on a static preview is left alone', async () => {
    const run = await gate({
      url: 'https://docs.dev.example.com/abcdefgh/',
      codes: {},
    })
    expect(run.went).toBeUndefined()
    expect(run.fetched).toEqual([])
  })
})

describe('the root host', () => {
  const root = CADDYFILE.match(
    /\n\{\{PREVIEW_DOMAIN\}\} \{\n([\s\S]*?)\n\}\n/
  )![1]

  test('answers short links before the cookie gate, which needs a cookie a new browser lacks', () => {
    const gateAt = root.indexOf('import preview_site')
    for (const handle of [
      'handle @codefile',
      'handle /_codes/*',
      'handle @code ',
      'handle @codequery',
    ])
      expect(root.indexOf(handle)).toBeGreaterThan(-1)
    for (const handle of [
      'handle @codefile',
      'handle /_codes/*',
      'handle @code ',
      'handle @codequery',
    ])
      expect(root.indexOf(handle)).toBeLessThan(gateAt)
  })

  test('serves only code-shaped files from _codes, and 404s the rest itself', () => {
    // A file_server miss would reach preview_site's handle_errors, which rewrites to
    // /index.html: the cookie-gated root list, served without a cookie.
    expect(root).toMatch(/path_regexp \^\/_codes\/\[A-Z\]\{8\}\$/)
    expect(root).toMatch(/handle \/_codes\/\* \{[^}]*respond "" 404/)
  })

  test('leaves the view-key link to the gate that sets its cookie', () => {
    expect(root).toMatch(/@codequery \{[^}]*not query t=__PREVIEW_TOKEN__/)
  })
})

/** The page's own `normalize`, lifted out of its script. */
function pageNormalize(): (typed: string) => string {
  // Up to the blank line that ends it: Prettier wraps the chain across lines.
  const source = PAGE.match(
    /const normalize = \(typed\) =>\s*([\s\S]*?)\n\s*\n/
  )![1]
  return new Function('typed', `return ${source}`) as (typed: string) => string
}

/**
 * Run the gate page's script against a fake location and fetch: where did it go, what did it
 * fetch, what did it say?
 */
async function gate(opts: {
  url: string
  codes: Record<string, string>
  type?: string
}): Promise<{ went?: string; fetched: string[]; message: string }> {
  const html = embedGatePage('__GATE_PAGE__', PAGE)
    .replace(/\\"/g, '"')
    .replaceAll('{{PREVIEW_DOMAIN}}', 'dev.example.com')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const here = new URL(opts.url)
  const result: { went?: string; fetched: string[] } = { fetched: [] }
  const location = {
    hostname: here.hostname,
    pathname: here.pathname,
    search: here.search,
    set href(to: string) {
      result.went = to
    },
    replace(to: string) {
      result.went = to
    },
  }
  const fakeFetch = async (path: string) => {
    result.fetched.push(path)
    const code = path.split('/').pop()!
    return code in opts.codes
      ? new Response(`${opts.codes[code]}\n`, { status: 200 })
      : new Response('', { status: 404 })
  }
  const source = [...doc.querySelectorAll('script')]
    .map((s) => s.textContent)
    .join('\n')
  new Function('document', 'location', 'fetch', source)(
    doc,
    location,
    fakeFetch
  )
  if (opts.type !== undefined) {
    ;(doc.getElementById('t') as HTMLInputElement).value = opts.type
    doc
      .getElementById('go')!
      .dispatchEvent(new Event('submit', { cancelable: true }))
  }
  await new Promise((resolve) => setTimeout(resolve, 20))
  return { ...result, message: doc.getElementById('msg')!.textContent ?? '' }
}
