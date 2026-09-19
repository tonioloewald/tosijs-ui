import { test, expect, describe } from 'bun:test'

/*
The EMITTED `.d.ts` is the product for a TypeScript adopter, and a doc comment there is one
edit away from silently detaching.

TypeScript attaches a doc comment to the declaration that FOLLOWS it. `liveExamples` was added
between `bundleEntry`'s JSDoc and `bundleEntry`, so the emitted `site-config.d.ts` shipped
`bundleEntry?: string;` with no comment at all — and what it lost was the #145 warning, the one
explaining why omitting the doc-system import yields a site that serves 200s and shows nothing.
Nothing failed: the source still had the prose, and reading the source is how you would check.

So assert against `dist/`, not `src/`. This is the same lesson as "read the sourcemap, do not
grep the bundle" — check the artifact, because the artifact is what ships.
*/
const DTS = `${import.meta.dir}/../../../dist/doc-system/site/site-config.d.ts`

describe('emitted site-config.d.ts keeps its documentation (F13)', () => {
  test('bundleEntry is preceded by a doc comment, not by another field', async () => {
    const dts = await Bun.file(DTS).text()
    const at = dts.indexOf('bundleEntry?: string;')
    expect(at).toBeGreaterThan(-1)
    const before = dts.slice(0, at).trimEnd()
    expect(
      before.endsWith('*/'),
      'bundleEntry lost its JSDoc in the emitted .d.ts — something was inserted between the ' +
        'comment and the field. See the note in site-config.ts.'
    ).toBe(true)
  })

  test('…and that comment is the #145 warning, not some other block', async () => {
    const dts = await Bun.file(DTS).text()
    const at = dts.indexOf('bundleEntry?: string;')
    // The comment immediately above it must be the one that names the failure mode.
    // Strip the ` * ` continuations and collapse whitespace first: the phrase is wrapped
    // across lines in the emitted file, so a naive substring match fails on correct output.
    const commentStart = dts.lastIndexOf('/**', at)
    const comment = dts
      .slice(commentStart, at)
      .replace(/^\s*\*/gm, ' ')
      .replace(/\s+/g, ' ')
    expect(comment).toContain('no header, no nav, no menu')
    expect(comment).toContain('145')
  })

  test('liveExamples still carries its own documentation', async () => {
    const dts = await Bun.file(DTS).text()
    const at = dts.indexOf("liveExamples?: 'auto' | 'opt-in';")
    expect(at).toBeGreaterThan(-1)
    const commentStart = dts.lastIndexOf('/**', at)
    expect(dts.slice(commentStart, at)).toContain('opt-in')
  })
})
