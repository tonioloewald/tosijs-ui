import { expect, test, describe } from 'bun:test'
import {
  findFencedBlocks,
  groupExamples,
  rewriteExampleBlocks,
} from './save-to-source'

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

    const tsOut = rewriteExampleBlocks(DIALECTS, 1, { js: 'const y: number = 22' })!
    expect(tsOut).toContain('const y: number = 22')
    expect(tsOut).toContain('const z = 3') // js example untouched
  })
})
