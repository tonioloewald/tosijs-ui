import { expect, test, describe } from 'bun:test'
import {
  findFencedBlocks,
  groupExamples,
  rewriteExampleBlocks,
} from './save-to-source.js'

const SRC = `# demo

intro prose

\`\`\`js
const a = 1
\`\`\`
\`\`\`css
.a { color: red }
\`\`\`

more prose

\`\`\`html
<div>two</div>
\`\`\`
\`\`\`test
test('x', () => expect(1).toBe(1))
\`\`\`

\`\`\`typescript
// display-only, not an example
\`\`\`
\`\`\`js
const three = 3
\`\`\`
`

describe('save-to-source', () => {
  test('finds every fenced block in order', () => {
    const langs = findFencedBlocks(SRC).map((b) => b.lang)
    expect(langs).toEqual(['js', 'css', 'html', 'test', 'typescript', 'js'])
  })

  test('groups consecutive executable blocks; prose and non-exec blocks split', () => {
    const groups = groupExamples(SRC, findFencedBlocks(SRC))
    // [js+css], [html+test], [js] — the typescript block breaks the last js off
    expect(groups.map((g) => g.map((b) => b.lang))).toEqual([
      ['js', 'css'],
      ['html', 'test'],
      ['js'],
    ])
  })

  test('rewrites only the targeted block of the targeted example', () => {
    const out = rewriteExampleBlocks(SRC, 0, { js: 'const a = 999' })
    expect(out).not.toBeNull()
    expect(out).toContain('const a = 999')
    expect(out).toContain('.a { color: red }') // sibling css untouched
    expect(out).toContain('const three = 3') // other example untouched
    // the original js body is gone
    expect(out!.includes('const a = 1\n')).toBe(false)
  })

  test('targets the right example by ordinal', () => {
    const out = rewriteExampleBlocks(SRC, 2, { js: 'const three = 333' })!
    expect(out).toContain('const three = 333')
    expect(out).toContain('const a = 1') // example 0 untouched
  })

  test('returns null for unknown ordinal or no-op edit', () => {
    expect(rewriteExampleBlocks(SRC, 9, { js: 'x' })).toBeNull()
    expect(rewriteExampleBlocks(SRC, 0, { js: 'const a = 1' })).toBeNull() // unchanged
  })

  test('trailing-whitespace-only differences do not churn untouched blocks', () => {
    // editor values: js genuinely edited, css differs only by a trailing newline
    const out = rewriteExampleBlocks(SRC, 0, {
      js: 'const a = 2',
      css: '.a { color: red }\n',
    })!
    expect(out).toContain('const a = 2')
    // css block is byte-identical to the original (no trailing-newline churn)
    expect(out).toContain('```css\n.a { color: red }\n```')
  })

  test('ignores block types the example does not have', () => {
    // example 2 is js-only; a css edit is dropped, js edit applies
    const out = rewriteExampleBlocks(SRC, 2, {
      js: 'const three = 33',
      css: '.nope {}',
    })!
    expect(out).toContain('const three = 33')
    expect(out).not.toContain('.nope {}')
  })
})

const DIALECTS = `# dialects

\`\`\`tjs
const x == 1
\`\`\`
\`\`\`css
.a { color: red }
\`\`\`

prose

\`\`\`ts
const y: number = 2
\`\`\`

\`\`\`typescript
// display-only
\`\`\`
\`\`\`js
const z = 3
\`\`\`
`

describe('save-to-source dialects (tjs/ts)', () => {
  test('tjs and ts count as source blocks for grouping/ordinals', () => {
    const groups = groupExamples(DIALECTS, findFencedBlocks(DIALECTS))
    // [tjs+css], [ts], [js] — typescript stays display-only and breaks the run
    expect(groups.map((g) => g.map((b) => b.lang))).toEqual([
      ['tjs', 'css'],
      ['ts'],
      ['js'],
    ])
  })

  test('the source edit maps to the example’s tjs/ts block', () => {
    const tjsOut = rewriteExampleBlocks(DIALECTS, 0, { js: 'const x == 999' })!
    expect(tjsOut).toContain('const x == 999')
    expect(tjsOut).toContain('.a { color: red }') // sibling css untouched

    const tsOut = rewriteExampleBlocks(DIALECTS, 1, {
      js: 'const y: number = 22',
    })!
    expect(tsOut).toContain('const y: number = 22')
    expect(tsOut).toContain('const z = 3') // js example untouched
  })

  // A doc comment is often indented in the source (code style), so its
  // fences are too. The extractor dedents them (examples render fine), but a raw
  // scan must still find them — else save-to-source fails with "no matching block".
  const INDENTED = [
    '  # Doc',
    '',
    '  ```js',
    '  const a = 1',
    '  const b = 2',
    '  ```',
  ].join('\n')

  test('finds indented fences (indented doc comment)', () => {
    const blocks = findFencedBlocks(INDENTED)
    expect(blocks.length).toBe(1)
    expect(blocks[0].indent).toBe('  ')
    expect(groupExamples(INDENTED, blocks).length).toBe(1)
  })

  test('round-trips an indented example: compares dedented, writes re-indented', () => {
    // the editor value is dedented; a real change must save and keep the indent
    const out = rewriteExampleBlocks(INDENTED, 0, {
      js: 'const a = 1\nconst c = 3',
    })
    expect(out).not.toBe(null)
    expect(out).toContain('  const a = 1\n  const c = 3') // re-indented
    // an unchanged (dedented) value is a no-op, not a spurious rewrite
    expect(
      rewriteExampleBlocks(INDENTED, 0, { js: 'const a = 1\nconst b = 2' })
    ).toBe(null)
  })
})

/*
Ordinals are a SHARED COORDINATE SYSTEM with `insert-examples`, and they agree only if both
modules ask the same question about which fences are live examples.

They stopped agreeing when `:static` shipped. This module carried its own flat six-language
set and its own fence-info regex that captured the language as `[\w-]*` — which stops at the
colon, so `js:static` read as plain `js` and the mode was invisible here while being
load-bearing in `insert-examples`. Every ordinal after a `:static` fence pointed one group too
far, and an edit was written into a different block than the one edited.

Silently, which is the part that makes it a blocker rather than a bug: the "couldn't locate
this example" guard only fires on an out-of-range ordinal, and here a group existed at that
index — the wrong one. Under `liveExamples: 'opt-in'` every ordinal on a prose site shifts.
*/
describe('ordinals agree with insert-examples (#dx-B1)', () => {
  const doc = [
    '# Doc',
    '',
    '```js:static',
    'const illustration = 1',
    '```',
    '',
    'Prose, so these are separate examples.',
    '',
    '```js',
    'const live = 2',
    '```',
    '',
  ].join('\n')

  test('a `:static` fence is not counted as an example', () => {
    const groups = groupExamples(doc, findFencedBlocks(doc))
    expect(groups.length).toBe(1)
    const only = groups[0][0]
    expect(doc.slice(only.codeStart, only.codeEnd)).toBe('const live = 2')
  })

  test('the fence MODE survives parsing — it used to be swallowed by the language regex', () => {
    const blocks = findFencedBlocks(doc)
    expect(blocks.map((b) => b.lang)).toEqual(['js', 'js'])
    expect(blocks.map((b) => b.mode)).toEqual(['static', undefined])
  })

  test('editing ordinal 0 writes the LIVE block, not the illustration ahead of it', () => {
    const out = rewriteExampleBlocks(doc, 0, { js: 'const EDITED = 99' })
    expect(out).not.toBe(null)
    // The live block was updated …
    expect(out).toContain('const EDITED = 99')
    // … and the display-only one was NOT touched. This is the assertion that fails under
    // the defect: it used to be the illustration that got overwritten.
    expect(out).toContain('const illustration = 1')
    expect(out).not.toContain('const live = 2')
  })

  test('under `opt-in`, a bare fence is not an example and ordinals shift accordingly', () => {
    // `opt-in` is the prose/book setting, where nearly every fence is illustration. A fence
    // has to ASK to run, so the bare ```js above is display-only and there is no example 0.
    const optIn = groupExamples(doc, findFencedBlocks(doc), 'opt-in')
    expect(optIn.length).toBe(0)
    expect(rewriteExampleBlocks(doc, 0, { js: 'x' }, 'opt-in')).toBe(null)
  })

  test('`#id` and `:mode` in either order, and neither swallows the language', () => {
    const src = [
      '```ts:ide#demo',
      'const a = 1',
      '```',
      '',
      'prose',
      '',
      '```css#anchor',
      '.x { color: red }',
      '```',
    ].join('\n')
    const blocks = findFencedBlocks(src)
    expect(blocks.map((b) => b.lang)).toEqual(['ts', 'css'])
    expect(blocks.map((b) => b.mode)).toEqual(['ide', undefined])
  })
})
