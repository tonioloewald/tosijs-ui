import { test, expect, describe } from 'bun:test'
import {
  firstUserStackFrame,
  sourceLineAt,
  describeError,
  diagnoseConstruction,
  stackLineOffset,
  TEST_SOURCE_URL,
} from './error-location.js'

/*
The point of all this is that a failure names something you can act on. These assert the
CONTENT of the message, not merely that one exists — "there is a string" was already true when
the reported failure read `Test execution: Arg string terminates parameters early` and cost an
hour of manual bisection (tosijs-ui#111).
*/

describe('firstUserStackFrame', () => {
  test('skips our own bundle frames and returns the user code frame', () => {
    const stack = [
      'Error: boom',
      '    at assert (https://x/iife.js:2:14)',
      '    at run (https://x/module.js:9:3)',
      '    at inline-test:7:11',
    ].join('\n')
    expect(firstUserStackFrame(stack)).toEqual({
      url: 'inline-test',
      line: 7,
      col: 11,
    })
  })

  test('parses the Safari/Firefox frame syntax too', () => {
    // `fn@url:line:col` rather than Chrome's ` at fn (url:line:col)`.
    const stack = [
      'Error: boom',
      'run@https://x/index.js:1:1',
      '@inline-test:4:2',
    ].join('\n')
    expect(firstUserStackFrame(stack)?.line).toBe(4)
  })

  test('no stack, or nothing but our own frames, yields null', () => {
    expect(firstUserStackFrame(undefined)).toBeNull()
    expect(
      firstUserStackFrame('Error: x\n    at f (https://x/iife.js:1:1)')
    ).toBeNull()
  })
})

describe('describeError', () => {
  /*
  Reported lines are OFFSET by the Function constructor's synthesized header, so a stack
  naming author-line 2 actually reads `2 + offset`. Building the fixture through
  `stackLineOffset()` keeps this true on any engine AND makes the correction the thing under
  test — hardcoding `inline-test:2:1` would silently assert the un-corrected behaviour, which
  is the bug (the assertion path quoted the line two below the failure for its whole life).
  */
  const stackForAuthorLine = (n: number) =>
    ['Error: nope', `    at inline-test:${n + stackLineOffset()}:1`].join('\n')
  const stack = stackForAuthorLine(2)

  test('names the line AND quotes the source when both are available', () => {
    const err = Object.assign(new Error('nope'), { stack })
    expect(describeError(err, 'const a = 1\nboom()\nconst b = 2')).toBe(
      'nope | boom() (line 2)'
    )
  })

  test('falls back to the line alone when the source is unknown', () => {
    const err = Object.assign(new Error('nope'), { stack })
    expect(describeError(err, null)).toBe('nope (line 2)')
  })

  test('a line that corrects to less than 1 reports NO line rather than a wrong one', () => {
    // If the offset assumption ever breaks, saying nothing beats pointing somewhere false.
    const err = Object.assign(new Error('nope'), {
      stack: 'Error: nope\n    at inline-test:1:1',
    })
    const out = describeError(err, 'a\nb')
    if (stackLineOffset() > 0) expect(out).toBe('nope')
  })

  test('an unlocatable error is never made WORSE than its bare message', () => {
    // The old behaviour was always the bare message; this must never regress below it.
    const err = Object.assign(new Error('nope'), { stack: undefined })
    expect(describeError(err, 'whatever')).toBe('nope')
    expect(describeError('a thrown string', null)).toBe('a thrown string')
  })
})

describe('sourceLineAt', () => {
  test('is 1-indexed and trims', () => {
    expect(sourceLineAt('a\n  b  \nc', 2)).toBe('b')
  })
  test('out of range or absent source is null', () => {
    expect(sourceLineAt('a', 0)).toBeNull()
    expect(sourceLineAt('a', 9)).toBeNull()
    expect(sourceLineAt(null, 1)).toBeNull()
  })
})

describe('diagnoseConstruction', () => {
  /*
  This is #111's actual failure. The constructor rejects the PARAMETER LIST, before any user
  code runs, so there is no stack and no line — the only useful thing to say is which keys were
  turned into parameters. V8's own message ("Arg string terminates parameters early") names
  nothing that appears in anyone's source.
  */
  const construct = (...args: string[]) => new Function(...args)

  test('blames the context keys when the body alone compiles, and lists them', () => {
    const err = new SyntaxError('Arg string terminates parameters early')
    const msg = diagnoseConstruction(
      err,
      ['preview', 'tosijs3d/demoutils'],
      'return 1',
      construct
    )
    expect(msg).toContain('CONTEXT KEYS')
    expect(msg).toContain('tosijs3d/demoutils')
    // The engine's own words are kept — they are still the most precise description.
    expect(msg).toContain('Arg string terminates parameters early')
  })

  test('blames the code when the body does not compile on its own', () => {
    const err = new SyntaxError('Unexpected end of input')
    const msg = diagnoseConstruction(err, ['preview'], 'const a = (', construct)
    expect(msg).toContain('could not be compiled')
    expect(msg).not.toContain('CONTEXT KEYS')
  })
})

/*
The user frame is identified POSITIVELY by its tag (#142 point 5).

An adopter reported two failures in two different blocks both naming the same line, and it
reproduced in Chromium: blocks failing at lines 2 and 10 BOTH reported 131. Nothing was
recognised as the user's frame, so the first bundle frame won and every failure named one
constant wrong line.

The cause was that the exclusion list was the only mechanism. It matches a bare `/iife.js`,
and a doc site serves `/iife.js?v=<hash>` — the cache-busting stamp — which the `$` anchor
rejects. It also never listed `hydrate.js`, the bundle an adopter's site actually loads.
*/
describe('user-frame identification (#142)', () => {
  const stack = [
    'AssertionError: Expected 1 to be 2',
    '    at assert (https://site.test/iife.js?v=2e84ce044eac:131:9)',
    '    at toBe (https://site.test/iife.js?v=2e84ce044eac:140:7)',
    '    at https://site.test/inline-test:2:3',
  ].join('\n')

  test('a stamped bundle frame is not mistaken for the user (the reported defect)', () => {
    expect(firstUserStackFrame(stack, TEST_SOURCE_URL)?.line).toBe(2)
  })

  test('…and the fallback path strips the query before matching', () => {
    // No tag supplied: the exclusion heuristic must still see through `?v=`.
    expect(firstUserStackFrame(stack)?.line).toBe(2)
  })

  test('hydrate.js counts as a bundle — it is what an ADOPTER site loads', () => {
    const adopter = [
      'Error: boom',
      '    at x (https://their.site/hydrate.js?v=abc:99:1)',
      '    at https://their.site/inline-test:7:5',
    ].join('\n')
    expect(firstUserStackFrame(adopter)?.line).toBe(7)
    expect(firstUserStackFrame(adopter, TEST_SOURCE_URL)?.line).toBe(7)
  })

  test('an UNKNOWN bundle name — only the tag can save you here', () => {
    /*
    The decisive case, and the reason the tag exists rather than a longer exclusion list.

    An adopter names their bundle whatever they like. No list we maintain can anticipate
    `app.bundle.js`, and every name we fail to anticipate returns a bundle frame as if it were
    the author's line. Extending the list is chasing; identifying the user's frame positively
    ends it.
    */
    const unknownBundle = [
      'AssertionError: nope',
      '    at assert (https://their.site/app.bundle.js:912:9)',
      '    at https://their.site/inline-test:4:3',
    ].join('\n')
    expect(firstUserStackFrame(unknownBundle, TEST_SOURCE_URL)?.line).toBe(4)
    // …and without the tag it is wrong, which is what this repo shipped.
    expect(firstUserStackFrame(unknownBundle)?.line).toBe(912)
  })

  test('a tag that appears in NO frame reports nothing rather than guessing', () => {
    // WebKit reaches here routinely — it produces no locatable frame at all. Naming a bundle
    // frame here is precisely the defect: a wrong line sends you somewhere with confidence.
    const untagged = [
      'Error: boom',
      '    at x (https://site.test/iife.js?v=abc:131:9)',
    ].join('\n')
    expect(firstUserStackFrame(untagged, TEST_SOURCE_URL)).toBe(null)
  })
})
