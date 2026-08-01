import { describe, test, expect } from 'bun:test'
import { pageDepth, relativeUrl } from './generate-site.js'

describe('pageDepth', () => {
  test('root index is depth 0, every /slug/ page is depth 1', () => {
    expect(pageDepth('')).toBe(0)
    expect(pageDepth('button')).toBe(1)
    expect(pageDepth('value-renderer')).toBe(1)
  })
})

describe('relativeUrl', () => {
  test('passes external and already-relative refs through untouched', () => {
    for (const p of [
      'https://cdn.example.com/x.js',
      '//cdn.example.com/x.js',
      './local.css',
      '../up.css',
      'sibling.js',
      '',
    ]) {
      expect(relativeUrl(0, p)).toBe(p)
      expect(relativeUrl(1, p)).toBe(p)
    }
  })

  test('relativizes a root-relative asset by page depth', () => {
    expect(relativeUrl(0, '/iife.js')).toBe('iife.js')
    expect(relativeUrl(1, '/iife.js')).toBe('../iife.js')
  })

  test('relativizes a page link; the root link is never an empty href', () => {
    expect(relativeUrl(0, '/combat/')).toBe('combat/')
    expect(relativeUrl(1, '/combat/')).toBe('../combat/')
    // Linking to the site root ('/') must not collapse to '' (a self-link).
    expect(relativeUrl(0, '/')).toBe('./')
    expect(relativeUrl(1, '/')).toBe('../')
  })
})

// The whole point of the change (issue #25): ONE build's functional URLs must
// resolve to the SAME served asset at ANY mount — a project page under /repo, a
// custom-domain root, or a deeper mount — with no basePath rebuild. Resolve each
// emitted relative URL against the page's real served location, exactly as a
// browser would, and assert it lands at `<mount>/<asset>`.
describe('mount-agnostic resolution', () => {
  const mounts = ['/', '/repo/', '/deep/nested/']
  const origin = 'https://example.test'

  for (const mount of mounts) {
    test(`assets + links resolve correctly served under ${mount}`, () => {
      // Root doc (slug '', depth 0) is served AT the mount; a /slug/ doc one down.
      const rootPageUrl = origin + mount
      const slugPageUrl = origin + mount + 'combat/'

      const resolve = (pageUrl: string, depth: number, p: string) =>
        new URL(relativeUrl(depth, p), pageUrl).pathname

      // A shared asset (hydrate.js) lands at the mount root from either page.
      expect(resolve(rootPageUrl, 0, '/hydrate.js')).toBe(mount + 'hydrate.js')
      expect(resolve(slugPageUrl, 1, '/hydrate.js')).toBe(mount + 'hydrate.js')
      expect(resolve(slugPageUrl, 1, '/doc-system.css')).toBe(
        mount + 'doc-system.css'
      )

      // A nav/content link to another page lands at <mount>/<slug>/.
      expect(resolve(rootPageUrl, 0, '/magic/')).toBe(mount + 'magic/')
      expect(resolve(slugPageUrl, 1, '/magic/')).toBe(mount + 'magic/')

      // A link back to the site root lands exactly at the mount root.
      expect(resolve(slugPageUrl, 1, '/')).toBe(mount)
      expect(resolve(rootPageUrl, 0, '/')).toBe(mount)
    })
  }
})
