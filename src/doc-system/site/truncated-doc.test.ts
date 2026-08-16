import { test, expect } from 'bun:test'
import { truncationWarnings, formatTruncationWarnings } from './truncated-doc'

// Built at runtime so this file contains no delimiter that would truncate itself —
// which is the bug under test, and it would be embarrassing to hit it here.
const CLOSE = '*' + '/'
const OPEN = '/' + '*'

test('REGRESSION: a nested block comment is flagged', () => {
  /*
  The real case: a block comment written inside a doc demo. The language ended the doc at the
  INNER close, the demo's object literal lost its later keys, and the build reported seven
  parse errors — all pointing at markdown prose, none at the delimiter responsible.
  */
  // This is what extraction ACTUALLY yields: the doc ends AT the nested comment's close,
  // so everything after it — including the fence — is gone. Writing the "whole" demo here
  // would have tested a string the extractor can never produce.
  const block = `# Demo\n\n\`\`\`js\nconst opts = {\n  ${OPEN} tuning ${CLOSE}`
  const [warning] = truncationWarnings('b3d-terrain.ts', block)
  expect(warning).toBeDefined()
  expect(warning.reason).toContain('fence')
})

test('REGRESSION: an unclosed code fence is flagged', () => {
  // How a truncation looks when the delimiter came from something innocuous, e.g. a glob
  // containing a star-slash. The doc simply stops in the middle of an example.
  const block = '# Demo\n\n```js\nconst x = 1\n'
  const [warning] = truncationWarnings('thing.ts', block)
  expect(warning).toBeDefined()
  expect(warning.reason).toContain('fence')
})

test('a healthy doc block warns about nothing', () => {
  const block = '# Title\n\nProse.\n\n```js\nconst x = 1\n```\n\nMore prose.\n'
  expect(truncationWarnings('ok.ts', block)).toEqual([])
})

test('several balanced fences are fine', () => {
  const block = '# T\n\n```js\na\n```\n\n```css\nb\n```\n\n```html\nc\n```\n'
  expect(truncationWarnings('ok.ts', block)).toEqual([])
})

test('prose that merely trails off is NOT flagged', () => {
  // A checker that guesses gets ignored, and an ignored warning is worse than none.
  expect(
    truncationWarnings('ok.ts', '# T\n\nA sentence that just ends')
  ).toEqual([])
})

test('an indented fence still counts', () => {
  // Fences inside list items are indented; missing them would under-report.
  expect(truncationWarnings('x.ts', '# T\n\n  ```js\n  a\n')).toHaveLength(1)
})

test('a doc that DOCUMENTS the syntax is not flagged', () => {
  // Real pages in this repo show an indented `/*#` example that never closes. Structurally
  // that is indistinguishable from a truncation, which is why the opener heuristic was
  // dropped — flagging these would have trained everyone to ignore the warning.
  const block = `# Doc system\n\nWrite one like this:\n\n    ${OPEN}#\n    # My Component\n\nAnd it is extracted.\n`
  expect(truncationWarnings('docs.ts', block)).toEqual([])
})

test('the message names the file and says what to do', () => {
  const msg = formatTruncationWarnings(
    truncationWarnings('b3d-terrain.ts', '# T\n\n```js\nx\n')
  )
  expect(msg).toContain('b3d-terrain.ts')
  expect(msg).toContain('TRUNCATED')
  // The symptom that sends people the wrong way, named explicitly.
  expect(msg).toContain('prose')
})
