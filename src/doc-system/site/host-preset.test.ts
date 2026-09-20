import { test, expect, describe } from 'bun:test'
import {
  basePathDoubling,
  bundleRegistrations,
  firebasePublicMismatch,
  writesOutsideOutputDir,
} from './host-preset.js'

/*
#134: an existing firebase.json is never checked against outputDir.

The failure is that both commands succeed and the wrong directory goes live. Reported by
tjs-lang, whose config says `"public": ".demo"` against a default `outputDir` of `docs`.

The negative cases matter as much as the positive one: a warning that fires on correct configs
is worse than the silence it replaces, because the first thing anyone does with a warning that
is usually wrong is stop reading warnings.
*/
const j = (o: unknown) => JSON.stringify(o)

describe('firebasePublicMismatch (#134)', () => {
  test('the reported case: .demo declared, docs built', () => {
    const m = firebasePublicMismatch(
      j({
        hosting: {
          public: '.demo',
          rewrites: [{ source: '/run', function: 'run' }],
        },
      }),
      'docs'
    )
    expect(m).not.toBeNull()
    expect(m!.declared).toEqual(['.demo'])
    expect(m!.built).toBe('docs')
  })

  test('agreement is silent', () => {
    expect(
      firebasePublicMismatch(j({ hosting: { public: 'docs' } }), 'docs')
    ).toBeNull()
  })

  test('spelling differences are not disagreements', () => {
    expect(
      firebasePublicMismatch(j({ hosting: { public: './docs' } }), 'docs')
    ).toBeNull()
    expect(
      firebasePublicMismatch(j({ hosting: { public: 'docs/' } }), './docs')
    ).toBeNull()
  })

  test('a MULTI-SITE config is fine if any target serves what we built', () => {
    // An array of hosting configs is legal, and warning on it would fire every build.
    expect(
      firebasePublicMismatch(
        j({ hosting: [{ public: 'other' }, { public: 'docs' }] }),
        'docs'
      )
    ).toBeNull()
  })

  test('…and is a mismatch only when NONE of them do', () => {
    const m = firebasePublicMismatch(
      j({ hosting: [{ public: 'other' }, { public: '.demo' }] }),
      'docs'
    )
    expect(m!.declared).toEqual(['other', '.demo'])
  })

  test('framework-aware hosting (no `public`) is not diagnosable, so stays quiet', () => {
    expect(
      firebasePublicMismatch(j({ hosting: { source: '.' } }), 'docs')
    ).toBeNull()
  })

  test('no hosting key, or unparseable JSON, is not ours to complain about', () => {
    expect(firebasePublicMismatch(j({ functions: {} }), 'docs')).toBeNull()
    expect(firebasePublicMismatch('{ not json', 'docs')).toBeNull()
    expect(firebasePublicMismatch('', 'docs')).toBeNull()
  })
})

describe('#144: baseUrl and basePath both carrying a path', () => {
  test('the always-wrong combination is named, with the fix', () => {
    const msg = basePathDoubling({
      baseUrl: 'https://tonioloewald.github.io/tosijs-editor',
      basePath: '/tosijs-editor/',
    })
    expect(msg).toContain('repeat it')
    expect(msg).toContain('ORIGIN ONLY')
    // The point of the message is showing the doubled result, not describing it.
    expect(msg).toContain(
      'https://tonioloewald.github.io/tosijs-editor/tosijs-editor/'
    )
  })

  test.each([
    [
      'origin-only baseUrl + basePath — the correct project-page setup',
      'https://x.github.io',
      '/repo/',
    ],
    [
      'baseUrl carries the path, no basePath — also correct',
      'https://x.github.io/repo',
      undefined,
    ],
    ['basePath is root', 'https://x.github.io/repo', '/'],
    ['no baseUrl at all', undefined, '/repo/'],
    [
      'a malformed baseUrl is not our business — it fails louder elsewhere',
      'not-a-url',
      '/repo/',
    ],
  ])('stays quiet: %s', (_label, baseUrl, basePath) => {
    expect(basePathDoubling({ baseUrl, basePath })).toBeUndefined()
  })
})

describe('#145: a bundleEntry that forgets the doc system', () => {
  test('the failure it detects: own elements registered, doc system missing', () => {
    // Exactly the reporter's bundle — their element defines fine, which is what made the
    // bundle look healthy while every page rendered inert markup.
    const theirs = `customElements.define("tosi-styled-editor",class extends HTMLElement{})`
    expect(bundleRegistrations(theirs)).toEqual({
      docSystem: false,
      liveExample: false,
    })
  })

  test('a correct entry registers both', () => {
    const good = `customElements.define("tosi-doc-system",D);customElements.define("tosi-example",E)`
    expect(bundleRegistrations(good)).toEqual({
      docSystem: true,
      liveExample: true,
    })
  })

  test('a direct minified `define` with a literal tag is a registration', () => {
    const minified = `var a=1;customElements.define("tosi-doc-system",class extends a{});`
    expect(bundleRegistrations(minified).docSystem).toBe(true)
  })

  /*
  #159 — the direction the old check could not see.

  It tested `bundleSource.includes('tosi-doc-system')` and called that "the one case where
  grepping a bundle is sound". It is not: the tag being present is necessary and NOT
  sufficient, and our own documented API supplies the counter-example — the context-map loop
  `document.querySelectorAll('tosi-doc-system')` puts the string in a bundle that registers
  nothing. The reporter's build reported healthy with exactly one `customElements.define` in
  it, none of it the doc system, and the caller then warned about a different component
  entirely.
  */
  test('a bundle that only MENTIONS the tag is not a registration (#159)', () => {
    const inert =
      `customElements.define("their-el",class{});` +
      `document.querySelectorAll("tosi-doc-system").forEach(e=>e.context={});`
    expect(bundleRegistrations(inert).docSystem).toBe(false)
    // …and the same for the other tag, via an attribute selector rather than a loop.
    expect(
      bundleRegistrations(`const s='tosi-example[data-mode]';`).liveExample
    ).toBe(false)
  })

  /*
  The obvious repair is wrong in the OTHER direction, and this is the test that stops it
  being reintroduced. Matching `define(` beside the quoted tag false-negatives on our own
  output: `elementCreator()` registers with a variable, so the minified bundle reads
  `customElements.define(i,this,r)` and the literal sits in a `closest()` call and some CSS
  selectors, nowhere near a `define`.
  */
  test('the tosijs elementCreator path counts, where the tag is a VARIABLE at define()', () => {
    const real =
      `class D extends C{static preferredTagName="tosi-doc-system";}` +
      `customElements.define(i,this,r);` +
      `let _=be.closest("tosi-doc-system");`
    expect(bundleRegistrations(real).docSystem).toBe(true)
  })
})

describe('#154: writes outside outputDir', () => {
  const exists = (p: string) => !p.includes('missing')
  const resolve = (p: string) => (p.startsWith('/') ? p : `/repo/${p}`)

  test('names the EXISTING files a contained build would clobber', () => {
    // The reporter set outputDir to a scratch dir specifically to avoid touching their
    // repo, and lost llms.txt and their playground's docs.json anyway.
    expect(
      writesOutsideOutputDir(
        { docsJson: 'demo/docs.json', llmsTxt: 'llms.txt' },
        '.b1-scratch',
        exists,
        resolve
      )
    ).toEqual(['demo/docs.json', 'llms.txt'])
  })

  test('a path INSIDE outputDir is not a clobber — that is the point of the box', () => {
    expect(
      writesOutsideOutputDir(
        { docsJson: '.b1-scratch/docs.json', llmsTxt: '.b1-scratch/llms.txt' },
        '.b1-scratch',
        exists,
        resolve
      )
    ).toEqual([])
  })

  test('a file that does not exist yet is not a clobber', () => {
    expect(
      writesOutsideOutputDir(
        { docsJson: 'demo/missing.json', llmsTxt: null },
        'out',
        exists,
        resolve
      )
    ).toEqual([])
  })

  test('a prefix match is not containment — `outX` is not inside `out`', () => {
    expect(
      writesOutsideOutputDir(
        { docsJson: 'outX/docs.json', llmsTxt: null },
        'out',
        exists,
        resolve
      )
    ).toEqual(['outX/docs.json'])
  })
})
