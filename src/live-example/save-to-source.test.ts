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

/*
The oracle for #4343: the page's own grouping. Render the doc with the page's renderer, group it
with the page's `insertExamples`, and check that example N here is example N there, block for
block. A regex scanner disagreed with the page on the shapes below and wrote edits into the
wrong example.
*/
import { renderDocMarkdown } from '../doc-system/render.js'
import { insertExamples } from './insert-examples.js'
import { readFileSync } from 'fs'

function pageExamples(markdown: string) {
  const root = document.createElement('div')
  root.innerHTML = renderDocMarkdown(markdown)
  const created: any[] = []
  const creator: any = () => {
    const el: any = document.createElement('div')
    el.showDefaultTab = () => {}
    el.snapshotAndRestoreLocalEdit = () => {}
    created.push(el)
    return el
  }
  insertExamples(root, {} as any, creator, 'live-example')
  // The page's code is the block's text, which ends in a newline; the source body doesn't.
  const trim = (v: unknown) => (typeof v === 'string' ? v.trimEnd() : undefined)
  return created.map((el) => ({
    js: trim(el.js),
    html: trim(el.html),
    css: trim(el.css),
    test: trim(el.test),
  }))
}

function sourceExamples(src: string, file?: string) {
  const dedent = (text: string, indent: string) =>
    text
      .split('\n')
      .map((line) =>
        line.startsWith(indent) ? line.slice(indent.length) : line
      )
      .join('\n')
  return groupExamples(src, findFencedBlocks(src, file)).map((group) => {
    const out: Record<string, string> = {}
    for (const b of group) {
      const slot = ['html', 'css', 'test'].includes(b.lang) ? b.lang : 'js'
      out[slot] = b.writable
        ? dedent(src.slice(b.codeStart, b.codeEnd), b.indent)
        : '(unwritable)'
    }
    return out
  })
}

const fence = (lang: string, code: string, marker = '```') =>
  `${marker}${lang}\n${code}\n${marker}`

describe('example ordinals match the page (#4343)', () => {
  const tail = [
    '',
    'prose',
    '',
    fence('js', 'const first = 1'),
    '',
    'prose',
    '',
    fence('js', 'const second = 2'),
    '',
  ].join('\n')
  const shapes: Record<string, string> = {
    'a four-space-indented illustration of a fence':
      '    ```js\n    illustration\n    ```\n',
    'a blockquoted fence': '> ```js\n> quoted\n> ```\n',
    'a space before the language': '``` js\nspaced\n```\n',
    'a tilde fence': '~~~js\ntilde\n~~~\n',
    'a four-backtick fence illustrating a fence':
      '````md\n```js\ninner\n```\n````\n',
    'a fence in a list item': '- item\n\n  ```js\n  listed\n  ```\n',
  }
  for (const [name, lead] of Object.entries(shapes)) {
    test(`${name}, then two examples: saving the second writes the second`, () => {
      const src = `# Doc\n\n${lead}${tail}`
      const page = pageExamples(src)
      const ours = sourceExamples(src)
      expect(ours.length).toBe(page.length)
      const last = page.length - 1
      expect(page[last].js).toBe('const second = 2')
      const out = rewriteExampleBlocks(src, last, { js: 'const EDITED = 3' })!
      expect(out).toContain('const EDITED = 3')
      expect(out).toContain('const first = 1')
      expect(out).not.toContain('const second = 2')
      expect(out.replace('const EDITED = 3', 'const second = 2')).toBe(src)
    })
  }

  test('an example inside a blockquote counts, but is never written', () => {
    const src = `${shapes['a blockquoted fence']}\nprose\n\n${fence('js', 'after')}\n`
    expect(pageExamples(src).length).toBe(2)
    expect(rewriteExampleBlocks(src, 0, { js: 'x' })).toBe(null)
    expect(rewriteExampleBlocks(src, 1, { js: 'x' })).toContain('```js\nx\n```')
  })

  test('a source file: fences in its code are not examples, and adjacent doc blocks join', () => {
    const src = [
      "const pattern = '```js\\nnot a doc\\n```'",
      '/*#',
      '# Doc',
      '',
      fence('js', 'const a = 1'),
      '*/',
      'export const x = 1',
      '/*#',
      fence('css', '.a {}'),
      '*/',
      '',
    ].join('\n')
    const joined = [
      '# Doc\n\n' + fence('js', 'const a = 1'),
      fence('css', '.a {}'),
    ].join('\n\n')
    expect(pageExamples(joined)).toEqual([
      { js: 'const a = 1', html: undefined, css: '.a {}', test: undefined },
    ])
    expect(sourceExamples(src, 'widget.ts')).toEqual([
      { js: 'const a = 1', css: '.a {}' },
    ])
    const out = rewriteExampleBlocks(
      src,
      0,
      { css: '.b {}' },
      'auto',
      'widget.ts'
    )!
    expect(out).toBe(src.replace('.a {}', '.b {}'))
  })

  test('a CRLF file keeps its line endings', () => {
    const src = `# Doc\r\n\r\n${fence('js', 'const a = 1').replace(/\n/g, '\r\n')}\r\n`
    const out = rewriteExampleBlocks(src, 0, {
      js: 'const a = 2\nconst b = 3',
    })!
    expect(out).toBe(src.replace('const a = 1', 'const a = 2\r\nconst b = 3'))
  })

  test('a fence with no body line takes an edit without swallowing its closing fence', () => {
    const src = '```js\n```\n'
    expect(rewriteExampleBlocks(src, 0, { js: 'x' })).toBe('```js\nx\n```\n')
  })

  test('every doc in demo/docs.json numbers its examples the way its page does', () => {
    const docs = JSON.parse(
      readFileSync(new URL('../../demo/docs.json', import.meta.url), 'utf8')
    ) as Array<{ text: string; filename: string }>
    for (const doc of docs) {
      const page = pageExamples(doc.text).map((e) =>
        Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined))
      )
      const ours = sourceExamples(doc.text)
      expect({ file: doc.filename, examples: ours.length }).toEqual({
        file: doc.filename,
        examples: page.length,
      })
      for (let i = 0; i < page.length; i += 1) {
        for (const slot of Object.keys(page[i])) {
          if (ours[i][slot] === '(unwritable)') continue
          expect({
            file: doc.filename,
            i,
            slot,
            code: ours[i][slot]?.trimEnd() as string | undefined,
          }).toEqual({
            file: doc.filename,
            i,
            slot,
            code: page[i][slot]?.trimEnd() as string | undefined,
          })
        }
      }
    }
  })
})

/*
1.20.0 review, M2: the page's footnote extension renders a definition as nothing, so the fences on
either side are one example there. Plain `marked.lexer` read it as a paragraph and split them, so
an edit to the page's second example was written into the first.
*/
describe('footnote definitions between fences (review M2)', () => {
  const src = [
    '# Doc',
    '',
    fence('html', '<p>A</p>'),
    '[^1]: a note',
    fence('js', 'const a = 1'),
    '',
    'prose[^1]',
    '',
    fence('html', '<p>B</p>'),
    '',
  ].join('\n')

  test('the grouping is the page grouping', () => {
    expect(sourceExamples(src).length).toBe(pageExamples(src).length)
    expect(pageExamples(src).length).toBe(2)
  })

  test('saving the second example writes the second example', () => {
    const out = rewriteExampleBlocks(src, 1, { html: '<p>EDITED</p>' })!
    expect(out).toContain('<p>EDITED</p>')
    expect(out).toContain('const a = 1')
    expect(out).toContain('<p>A</p>')
    expect(out).not.toContain('<p>B</p>')
  })

  test('a closing fence indented four spaces is code, not a closer', () => {
    const body = 'const t = `\n    ```\n`'
    const doc = fence('js', body) + '\n'
    const out = rewriteExampleBlocks(doc, 0, { js: 'replaced' })
    // marked reads the indented ``` as part of the body; so must the rewrite
    expect(pageExamples(doc)[0].js).toBe(body)
    expect(out).toBe('```js\nreplaced\n```\n')
  })
})

/*
The same oracle, over each doc's SOURCE FILE with its path, which is what a save actually reads
(a .ts file's doc is its /*# blocks). Docs assembled from insets are refused by the editor, so
they are skipped here too.
*/
test('every doc in demo/docs.json numbers its examples the way its page does, read from its source file', async () => {
  const { existsSync } = await import('fs')
  const { mayHaveSingleSourceDirective } =
    await import('../doc-system/book-target.js')
  const docs = JSON.parse(
    readFileSync(new URL('../../demo/docs.json', import.meta.url), 'utf8')
  ) as Array<{ text: string; filename: string; path?: string }>
  let checked = 0
  for (const doc of docs) {
    if (!doc.path || !existsSync(doc.path)) continue
    const raw = readFileSync(doc.path, 'utf8')
    if (mayHaveSingleSourceDirective(raw)) continue
    const page = pageExamples(doc.text)
    const ours = sourceExamples(raw.replace(/\r\n/g, '\n'), doc.path)
    expect({ file: doc.path, examples: ours.length }).toEqual({
      file: doc.path,
      examples: page.length,
    })
    checked += 1
  }
  expect(checked).toBeGreaterThan(50)
})
