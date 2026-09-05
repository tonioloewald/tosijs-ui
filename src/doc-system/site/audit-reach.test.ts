import { test, expect, describe } from 'bun:test'
import { runtimeReachable, classifyReach } from './audit-reach.js'

/*
#56: severity alone decides whether a build fails, so a HIGH in a webpack plugin blocks as hard
as a HIGH in the HTTP client. Reported from an app monorepo with 18 high/critical advisories, of
which the runtime-reachable subset was a small fraction.

Every test below also pins the CONSERVATIVE direction: when the walk cannot tell, the answer is
`runtime`. A security finding silently downgraded is the one outcome worth engineering against.
*/
describe('runtimeReachable (#56)', () => {
  const tree: Record<string, Record<string, string>> = {
    'http-client': { 'parse-url': '1' },
    'parse-url': {},
    webpack: { 'enhanced-resolve': '1' },
    'enhanced-resolve': {},
    tosijs: {},
  }
  const depsOf = (p: string) => tree[p]

  test('a runtime dep and its transitive deps are runtime', () => {
    const r = runtimeReachable({ dependencies: { 'http-client': '1' } }, depsOf)
    expect(classifyReach('http-client', r)).toBe('runtime')
    expect(classifyReach('parse-url', r)).toBe('runtime')
  })

  test('a devDependency and its subtree are build-only', () => {
    const r = runtimeReachable({ devDependencies: { webpack: '1' } }, depsOf)
    expect(classifyReach('webpack', r)).toBe('build-only')
    expect(classifyReach('enhanced-resolve', r)).toBe('build-only')
  })

  test('PEER dependencies count as runtime — they end up in the consumer app', () => {
    // tosijs is a peer here; an advisory against it reaches production, just not ours.
    const r = runtimeReachable({ peerDependencies: { tosijs: '^1' } }, depsOf)
    expect(classifyReach('tosijs', r)).toBe('runtime')
  })

  test('optionalDependencies count as runtime', () => {
    const r = runtimeReachable(
      { optionalDependencies: { 'parse-url': '1' } },
      depsOf
    )
    expect(classifyReach('parse-url', r)).toBe('runtime')
  })

  test('a package reachable BOTH ways is runtime — the worse case wins', () => {
    const r = runtimeReachable(
      {
        dependencies: { 'http-client': '1' },
        devDependencies: { webpack: '1' },
      },
      (p) => (p === 'webpack' ? { 'parse-url': '1' } : tree[p])
    )
    expect(classifyReach('parse-url', r)).toBe('runtime')
  })

  test('an UNRESOLVABLE package is runtime, not build-only', () => {
    // A partial install must not silently downgrade a finding.
    const r = runtimeReachable(
      { dependencies: { mystery: '1' } },
      () => undefined
    )
    expect(classifyReach('mystery', r)).toBe('runtime')
  })

  test('a dependency cycle terminates', () => {
    const cyclic = (p: string): Record<string, string> =>
      p === 'a' ? { b: '1' } : { a: '1' }
    const r = runtimeReachable({ dependencies: { a: '1' } }, cyclic)
    expect(classifyReach('a', r)).toBe('runtime')
    expect(classifyReach('b', r)).toBe('runtime')
  })

  test('nothing declared means nothing is runtime', () => {
    expect(classifyReach('anything', runtimeReachable({}, depsOf))).toBe(
      'build-only'
    )
  })
})
