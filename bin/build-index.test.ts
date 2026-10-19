import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/*
The preview host's root page, as `build-index.sh` writes it on the box.

The script runs for real against a sandbox standing in for /srv/preview, and the page's own
probe script runs against a stubbed `fetch`, so what is under test is the page a reader gets.
*/

const REPO = new URL('..', import.meta.url).pathname
let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'build-index-'))
  mkdirSync(join(root, '_sites'))
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

function tunnel(name: string, host: string) {
  writeFileSync(
    join(root, '_sites', `${name}-tunnel.caddy`),
    `${host} {\n\treverse_proxy http://127.0.0.1:9000\n}\n`
  )
}

function buildIndex(): Document {
  const script = readFileSync(join(REPO, 'deploy/build-index.sh'), 'utf8')
  const run = Bun.spawnSync(['bash', '-s'], {
    stdin: new TextEncoder().encode(
      script.replace('ROOT=/srv/preview', `ROOT=${root}`)
    ),
  })
  expect(run.exitCode).toBe(0)
  const html = readFileSync(join(root, '_index/index.html'), 'utf8')
  return new DOMParser().parseFromString(html, 'text/html')
}

/** Run the page's probe script with `fetch` answering per host. */
async function probe(
  doc: Document,
  answer: (host: string) => Promise<Response>
): Promise<Record<string, string>> {
  const source = [...doc.querySelectorAll('script')]
    .map((s) => s.textContent)
    .join('\n')
  const fakeFetch = (url: string) => answer(new URL(url).hostname)
  new Function('document', 'fetch', source)(doc, fakeFetch)
  await new Promise((resolve) => setTimeout(resolve, 20))
  return Object.fromEntries(
    [...doc.querySelectorAll('[data-workspace]')].map((li) => [
      li.getAttribute('data-workspace'),
      li.querySelector('.access')!.textContent!,
    ])
  )
}

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

test('every registered workspace is listed, ahead of the deployed builds', () => {
  // Hiding the rows that did not answer the probe made a workspace on an older
  // tosijs-ui vanish from the one page meant for picking one.
  tunnel('alpha', 'alpha.edit.dev.example.test')
  tunnel('beta', 'beta.edit.dev.example.test')
  const doc = buildIndex()
  const rows = [...doc.querySelectorAll('[data-workspace]')]
  expect(rows.map((li) => li.getAttribute('data-workspace'))).toEqual([
    'alpha.edit.dev.example.test',
    'beta.edit.dev.example.test',
  ])
  for (const li of rows) expect(li.hasAttribute('hidden')).toBe(false)
  expect(doc.getElementById('live')!.hasAttribute('hidden')).toBe(false)
  const headings = [...doc.querySelectorAll('h2')].map((h) => h.textContent)
  expect(headings).toEqual(['Live workspaces', 'Deployed builds'])
})

test('each row says what the reader may do there, or why it cannot tell', async () => {
  tunnel('edits', 'edits.edit.dev.example.test')
  tunnel('views', 'views.edit.dev.example.test')
  tunnel('closed', 'closed.edit.dev.example.test')
  tunnel('old', 'old.edit.dev.example.test')
  tunnel('down', 'down.edit.dev.example.test')
  const doc = buildIndex()
  const said = await probe(doc, (host) => {
    switch (host.split('.')[0]) {
      case 'edits':
        return json({ name: 'edits', access: 'edit' })
      case 'views':
        return json({ name: 'views', access: 'view' })
      case 'closed':
        return json({ name: 'closed', access: null })
      case 'old':
        // An older dev server answers 204 with no CORS headers.
        return Promise.resolve(new Response(null, { status: 204 }))
      default:
        return Promise.reject(new TypeError('Failed to fetch'))
    }
  })
  expect(said).toEqual({
    'edits.edit.dev.example.test': 'edit',
    'views.edit.dev.example.test': 'view',
    'closed.edit.dev.example.test': 'up, but your key does not open it',
    'old.edit.dev.example.test':
      'not answering (offline, or tosijs-ui before 1.16.26)',
    'down.edit.dev.example.test':
      'not answering (offline, or tosijs-ui before 1.16.26)',
  })
})

test('workspace names are escaped', () => {
  tunnel('<b>evil', 'evil.edit.dev.example.test')
  const doc = buildIndex()
  expect(doc.querySelector('b')).toBeNull()
  expect(doc.querySelector('[data-workspace] .name')!.textContent).toBe(
    '<b>evil'
  )
})
