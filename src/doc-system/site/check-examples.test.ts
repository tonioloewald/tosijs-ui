import { describe, expect, test } from 'bun:test'
import { checkExamples } from './check-examples'
import type { Doc } from './docs'

const doc = (filename: string, text: string): Doc => ({
  filename,
  title: filename,
  path: filename,
  text,
})

describe('checkExamples', () => {
  test('clean js example produces no problems', async () => {
    const { problems } = await checkExamples([
      doc(
        'ok.md',
        "# ok\n\n```js\nimport { elements } from 'tosijs'\nconst { div } = elements\n```\n"
      ),
    ])
    expect(problems).toHaveLength(0)
  })

  test('an unsupported (non-context) import WARNS, not fails — display-only, build survives', async () => {
    const { problems, warnings } = await checkExamples([
      doc('bad.md', "```js\nimport { x } from './relative'\n```\n"),
    ])
    // Not a code defect — the environment just can't provide the dep. Warn, don't
    // fail the build (this is the fragility fix: illustrative snippets don't break it).
    expect(problems).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].filename).toBe('bad.md')
    expect(warnings[0].lang).toBe('js')
    expect(warnings[0].error).toMatch(/unsupported import/)
  })

  test('a syntax error FAILS — real breakage stays fatal', async () => {
    const { problems, warnings } = await checkExamples([
      doc('syntax.md', '```js\nconst broken = (\n```\n'),
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0].lang).toBe('js')
    expect(warnings).toHaveLength(0)
  })

  test('the two are separated: a syntax error fails while an unsupported import only warns', async () => {
    const { problems, warnings } = await checkExamples([
      doc('syntax.md', '```js\nconst broken = (\n```\n'),
      doc('import.md', "```ts\nimport { x } from 'ngx-tosijs'\n```\n"),
    ])
    expect(problems.map((p) => p.filename)).toEqual(['syntax.md'])
    expect(warnings.map((w) => w.filename)).toEqual(['import.md'])
  })

  test('valid TypeScript (type annotations) transpiles clean — no false positive', async () => {
    const { problems } = await checkExamples([
      doc('ts.md', "```ts\nconst xs: string[] = ['a']\nvoid xs.length\n```\n"),
    ])
    expect(problems).toHaveLength(0)
  })

  test('display-only `typescript` and html/css blocks are not executed', async () => {
    const { problems } = await checkExamples([
      // `typescript` (not `ts`) is illustrative — a bare object fragment that
      // would never build as a statement is fine because it never runs.
      doc('display.md', '```typescript\nbook: { include: ["**"] }\n```\n'),
      doc(
        'markup.md',
        '```html\n<tosi-widget></tosi-widget>\n```\n```css\n.x { color: red }\n```\n'
      ),
    ])
    expect(problems).toHaveLength(0)
  })

  test('recurses into blockquotes (where fences hide from a line-anchored grep)', async () => {
    const { problems } = await checkExamples([
      doc('quote.md', '> intro\n>\n> ```js\n> const broken = (\n> ```\n'),
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0].filename).toBe('quote.md')
  })

  test('bakes a tjs block (keyed by source text) but not js/ts', async () => {
    const jsSrc = "import { elements } from 'tosijs'\nconst { div } = elements"
    const tjsSrc = 'const n = 1\nvoid n'
    const tsSrc = "const s: string = 'a'\nvoid s"
    const { problems, bakes } = await checkExamples([
      doc('js.md', '```js\n' + jsSrc + '\n```\n'),
      doc('tjs.md', '```tjs\n' + tjsSrc + '\n```\n'),
      doc('ts.md', '```ts\n' + tsSrc + '\n```\n'),
    ])
    expect(problems).toHaveLength(0)
    // Bakes are grouped per doc filename. Only tjs is baked (build and runtime share
    // its transform); js needs no transpiler and ts is left to the runtime compiler.
    expect(bakes.has('js.md')).toBe(false)
    expect(bakes.has('ts.md')).toBe(false)
    const bake = bakes.get('tjs.md')?.get(tjsSrc)
    expect(bake?.dialect).toBe('tjs')
    expect(bake?.js).toContain('const n = 1')
  })
})
