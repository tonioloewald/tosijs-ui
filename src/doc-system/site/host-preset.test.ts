import { test, expect, describe } from 'bun:test'
import { firebasePublicMismatch } from './host-preset.js'

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
