import { test, expect, describe } from 'bun:test'
import { hasTestBlock } from './doc-browser.js'

/*
The background runner decides which pages to load and EXECUTE from this predicate.

It used to be `doc.text.includes('```test')` — a substring match anywhere in the document — so
a page that merely wrote about the test tier qualified. `doc-site-system.md` documents the
runner itself, so it was loaded and its examples executed on every run, and a failure in one of
its examples was reported through the doc-test tier despite the page having no tests.

Worse, only sometimes: whether the failure arrived before that page's deadline depended on how
fast the TypeScript compiler loaded. A standalone run reported "62 passed" against a build the
full suite failed on.
*/
const FENCE = '```' + 'test'

describe('hasTestBlock', () => {
  test('a real fence counts', () => {
    expect(
      hasTestBlock(`# Doc\n\n${FENCE}\ntest('x', () => {})\n\`\`\`\n`)
    ).toBe(true)
  })

  test('an indented fence counts — they appear inside list items', () => {
    expect(
      hasTestBlock(`- item\n\n  ${FENCE}\n  test('x', () => {})\n  \`\`\`\n`)
    ).toBe(true)
  })

  test('a PROSE MENTION does not — this is the bug', () => {
    // Exactly how doc-site-system.md refers to the tier.
    expect(
      hasTestBlock(
        'Every ` ' + FENCE + ' ` block is compiled during the build.'
      )
    ).toBe(false)
  })

  test('an inline code span does not', () => {
    expect(hasTestBlock('Use `' + FENCE + '` for browser tests.')).toBe(false)
  })

  test('other fences do not', () => {
    expect(hasTestBlock('```js\nconst x = 1\n```\n')).toBe(false)
    expect(hasTestBlock('```typescript\nconst x = 1\n```\n')).toBe(false)
    // ```ts is executable but is NOT a test block
    expect(hasTestBlock('```ts\nconst x = 1\n```\n')).toBe(false)
  })

  test('undefined text is not a page with tests', () => {
    expect(hasTestBlock(undefined)).toBe(false)
  })
})
