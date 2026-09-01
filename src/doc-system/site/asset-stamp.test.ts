import { test, expect, describe } from 'bun:test'
import { withStamp } from './generate-site.js'

/*
Stable asset filenames go stale: a CDN or browser cache serves yesterday's `hydrate.js` against
today's HTML, and the site looks broken in a way that reproduces nowhere else. That happened on
the live doc site and cost a round of "is this a layout regression?" before turning out to be a
cached bundle.

A query rather than a content-hashed filename, deliberately: `docs/` is committed in this repo
and its siblings, so hashing would add and delete a file on every build and put churn in every
diff.
*/

describe('withStamp', () => {
  test('appends the stamp to a same-origin asset', () => {
    expect(withStamp('../hydrate.js', '951798df')).toBe(
      '../hydrate.js?v=951798df'
    )
    expect(withStamp('/doc-system.css', 'abc')).toBe('/doc-system.css?v=abc')
  })

  test('no stamp means byte-identical output to before this existed', () => {
    // The opt-out has to be total: an unset stamp must not alter a single character.
    expect(withStamp('/iife.js', undefined)).toBe('/iife.js')
    expect(withStamp('/iife.js', '')).toBe('/iife.js')
  })

  test('leaves CROSS-ORIGIN urls alone', () => {
    /*
    `scriptUrl` may legitimately point at a CDN. Appending a query to someone else's URL can
    miss their cache key or be rejected outright, and busting THEIR cache was never the point —
    the staleness this fixes is in our own output.
    */
    for (const url of [
      'https://cdn.example.com/iife.js',
      'http://cdn.example.com/iife.js',
      '//cdn.example.com/iife.js',
      'data:text/javascript,void 0',
    ]) {
      expect(withStamp(url, 'abc')).toBe(url)
    }
  })

  test('leaves a url that already carries a query or fragment alone', () => {
    // The caller said something deliberate about it; do not second-guess them.
    expect(withStamp('/iife.js?build=7', 'abc')).toBe('/iife.js?build=7')
    expect(withStamp('/iife.js#x', 'abc')).toBe('/iife.js#x')
  })

  test('encodes a stamp that is not url-safe', () => {
    expect(withStamp('/a.js', 'v 1+2/3')).toBe('/a.js?v=v%201%2B2%2F3')
  })
})
