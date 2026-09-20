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

  /*
  This happened TWICE in one release, which is why it is a loop over a list rather than a
  second bespoke test.

  The second instance was introduced while FIXING the first: a non-exported helper was added
  between `bundleRegistrations`'s JSDoc and the exported function, and the comment — which had
  just been rewritten to correct a false soundness claim — disappeared from
  `host-preset.d.ts` entirely. Source looked perfect both times. Only the artifact shows it.

  Add a symbol here whenever an exported declaration's doc comment is load-bearing for an
  adopter.
  */
  const DOCUMENTED: Array<{ file: string; decl: string; must: string }> = [
    {
      file: 'doc-system/site/host-preset.d.ts',
      decl: 'export declare function bundleRegistrations',
      must: 'necessary',
    },
  ]

  for (const { file, decl, must } of DOCUMENTED) {
    test(`${file} documents ${decl.split(' ').pop()}`, async () => {
      const dts = await Bun.file(
        `${import.meta.dir}/../../../dist/${file}`
      ).text()
      const at = dts.indexOf(decl)
      expect(at, `${decl} not found in ${file}`).toBeGreaterThan(-1)
      expect(
        dts.slice(0, at).trimEnd().endsWith('*/'),
        `${decl} lost its JSDoc in the emitted .d.ts — something was inserted between the ` +
          `comment and the declaration.`
      ).toBe(true)
      const comment = dts
        .slice(dts.lastIndexOf('/**', at), at)
        .replace(/^\s*\*/gm, ' ')
        .replace(/\s+/g, ' ')
      expect(comment).toContain(must)
    })
  }

  test('liveExamples still carries its own documentation', async () => {
    const dts = await Bun.file(DTS).text()
    const at = dts.indexOf("liveExamples?: 'auto' | 'opt-in';")
    expect(at).toBeGreaterThan(-1)
    const commentStart = dts.lastIndexOf('/**', at)
    expect(dts.slice(commentStart, at)).toContain('opt-in')
  })
})
