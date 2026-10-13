import { test, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import { restampSite, servedBundleProblem } from './restamp'
import { assetStampInputs, computeAssetStamp } from './asset-stamp'
import { SiteMisconfiguredError } from './build-warnings'

const REGISTERS = 'class A{static preferredTagName="tosi-doc-system"}'
const REGISTERS_BOTH = `${REGISTERS};class B{static preferredTagName="tosi-example"}`

let dir: string
let out: string
let docsJson: string

const page = (stamp: string) =>
  `<link rel="stylesheet" href="/doc-system.css?v=${stamp}"><script src="/iife.js?v=${stamp}"></script><script src="/docs.json?v=aaaaaaaaaaaa"></script>`

/** A built site whose pages carry the stamp of the bundle `buildSite` wrote. */
async function builtSite(bundle: string, corpus: unknown[] = []) {
  mkdirSync(path.join(out, 'guide'), { recursive: true })
  writeFileSync(path.join(out, 'iife.js'), bundle)
  writeFileSync(path.join(out, 'doc-system.css'), 'body{}')
  writeFileSync(docsJson, JSON.stringify(corpus))
  const { stamp } = await computeAssetStamp(
    assetStampInputs(out, 'iife.js'),
    'fallback'
  )
  writeFileSync(path.join(out, 'index.html'), page(stamp))
  writeFileSync(path.join(out, 'guide', 'index.html'), page(stamp))
  writeFileSync(path.join(out, 'plain.html'), '<p>no assets</p>')
  return stamp
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'restamp-'))
  out = path.join(dir, 'docs')
  docsJson = path.join(dir, 'docs.json')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const config = (extra = {}) =>
  ({ name: 't', outputDir: out, docsJson, ...extra } as any)

test('a replaced bundle changes the stamp in every page that carries one', async () => {
  const built = await builtSite(REGISTERS)
  writeFileSync(path.join(out, 'iife.js'), `${REGISTERS};var replaced=1`)
  const result = await restampSite(config())
  expect(result.previous).toBe(built)
  expect(result.stamp).not.toBe(built)
  expect(result.pages).toBe(2)
  expect(result.changed).toBe(2)
  const html = readFileSync(path.join(out, 'guide', 'index.html'), 'utf8')
  expect(html).toBe(page(result.stamp))
  // the corpus has its own stamp, and it is left alone
  expect(html).toContain('docs.json?v=aaaaaaaaaaaa')
  // what a fresh build would have stamped for the same files
  const fresh = await computeAssetStamp(assetStampInputs(out, 'iife.js'), 'x')
  expect(result.stamp).toBe(fresh.stamp)
})

test('an untouched bundle is a no-op, and a second run changes nothing', async () => {
  const built = await builtSite(REGISTERS)
  const first = await restampSite(config())
  expect(first).toEqual({ stamp: built, previous: built, pages: 2, changed: 0 })
  writeFileSync(path.join(out, 'iife.js'), `${REGISTERS};var replaced=1`)
  const second = await restampSite(config())
  const third = await restampSite(config())
  expect(third.stamp).toBe(second.stamp)
  expect(third.changed).toBe(0)
})

test('nothing to re-stamp is an error, not a quiet success', async () => {
  await builtSite(REGISTERS)
  writeFileSync(path.join(out, 'index.html'), '<p>x</p>')
  writeFileSync(path.join(out, 'guide', 'index.html'), '<p>x</p>')
  await expect(restampSite(config())).rejects.toThrow(/nothing to re-stamp/)
  rmSync(path.join(out, 'iife.js'))
  await expect(restampSite(config())).rejects.toThrow(/does not exist/)
  await expect(
    restampSite(config({ scriptUrl: 'https://cdn.example/iife.js' }))
  ).rejects.toThrow(/does not serve/)
})

test('a replacement that does not register the doc system is reported, and fails a strict build', async () => {
  await builtSite(REGISTERS)
  writeFileSync(path.join(out, 'iife.js'), 'var inert=1')
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await restampSite(config())
    expect(warn.mock.calls.join('\n')).toContain(
      'does not register <tosi-doc-system>'
    )
  } finally {
    warn.mockRestore()
  }
  // Under strict the refused bundle leaves every page exactly as the build wrote it.
  const before = readFileSync(path.join(out, 'guide', 'index.html'), 'utf8')
  await expect(restampSite(config({ strict: true }))).rejects.toThrow(
    SiteMisconfiguredError
  )
  expect(readFileSync(path.join(out, 'guide', 'index.html'), 'utf8')).toBe(
    before
  )
})

test('live examples in the corpus need <tosi-example> in the served bundle', async () => {
  const corpus = [
    {
      filename: 'a.md',
      title: 'A',
      text: '# A\n\n```js\nconsole.log(1)\n```\n',
    },
  ]
  await builtSite(REGISTERS, corpus)
  await expect(restampSite(config({ strict: true }))).rejects.toThrow(
    /tosi-example/
  )
  writeFileSync(path.join(out, 'iife.js'), REGISTERS_BOTH)
  expect((await restampSite(config({ strict: true }))).pages).toBe(2)
})

test('servedBundleProblem names the missing import', () => {
  expect(servedBundleProblem(REGISTERS_BOTH, 'iife.js', true)).toBeNull()
  expect(servedBundleProblem(REGISTERS, 'iife.js', false)).toBeNull()
  expect(servedBundleProblem('', 'iife.js', true)).toContain(
    "import 'tosijs-ui/live-example'"
  )
  expect(servedBundleProblem('', 'iife.js', false)).not.toContain(
    'live-example'
  )
  // a mention is not a registration
  expect(
    servedBundleProblem(
      'document.querySelector("tosi-doc-system")',
      'x.js',
      false
    )
  ).toContain('does not register')
})

test('only the URLs the generator wrote are read and rewritten, never prose', async () => {
  const built = await builtSite(REGISTERS)
  const prose =
    '<p>Old pages loaded iife.js?v=1.2.3 and doc-system.css?v=9.</p>' +
    '<meta name="description" content="see iife.js?v=1.2.3">'
  writeFileSync(path.join(out, 'index.html'), prose + page(built))
  writeFileSync(path.join(out, 'iife.js'), `${REGISTERS};var replaced=1`)
  const result = await restampSite(config())
  expect(result.previous).toBe(built)
  expect(readFileSync(path.join(out, 'index.html'), 'utf8')).toBe(
    prose + page(result.stamp)
  )
})

test('the stylesheet is re-stamped even when its stamp had drifted from the script', async () => {
  const built = await builtSite(REGISTERS)
  // what a project's own re-stamp of the script alone leaves behind
  writeFileSync(
    path.join(out, 'index.html'),
    page(built).replace(`iife.js?v=${built}`, 'iife.js?v=0123456789ab')
  )
  const result = await restampSite(config())
  expect(readFileSync(path.join(out, 'index.html'), 'utf8')).toBe(
    page(result.stamp)
  )
})

test('a bundleEntry site is refused with the reason, not told to build', async () => {
  await builtSite(REGISTERS)
  await expect(
    restampSite(config({ bundleEntry: './demo/site.ts' }))
  ).rejects.toThrow(
    /hydrates from the bundle buildSite builds from bundleEntry/
  )
  writeFileSync(path.join(out, 'hydrate-abc123.js'), REGISTERS)
  await expect(restampSite(config())).rejects.toThrow(/bundleEntry/)
})

test('an unreadable corpus is an error: the check cannot quietly do half its job', async () => {
  await builtSite(REGISTERS)
  rmSync(docsJson)
  const before = readFileSync(path.join(out, 'index.html'), 'utf8')
  await expect(restampSite(config())).rejects.toThrow(/cannot read the corpus/)
  expect(readFileSync(path.join(out, 'index.html'), 'utf8')).toBe(before)
})
