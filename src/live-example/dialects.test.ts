import { describe, expect, test, spyOn } from 'bun:test'
import {
  isDialectLanguage,
  isLiveFence,
  parseFenceInfo,
  registerLiveLanguage,
} from '../doc-system/example-policy.js'
import { renderDocMarkdown } from '../doc-system/render.js'
import {
  dialectDocs,
  dialectTransform,
  getDialect,
  registerDialect,
  showDialectResult,
} from './dialects.js'
import { insertExamples } from './insert-examples.js'
import { rewriteExampleBlocks } from './save-to-source.js'

// The registry is module state shared by every test file in the process, so these use
// dialect names nothing else registers.
registerDialect('shout', {
  label: 'Shout',
  transform: (source, options) => ({
    code: `/*${JSON.stringify(options)}*/ ${source.toUpperCase()}`,
  }),
})
registerDialect('vm', { run: (source) => `ran ${source}` })

describe('parseFenceInfo options (#184)', () => {
  test('a JSON object after the head is the options', () => {
    expect(parseFenceInfo('tjs {"runTests": "report"}')).toEqual({
      lang: 'tjs',
      mode: undefined,
      id: undefined,
      options: { runTests: 'report' },
    })
  })

  test('mode and id still parse beside options', () => {
    const info = parseFenceInfo('ts:iframe#demo {"debug": true}')
    expect(info.lang).toBe('ts')
    expect(info.mode).toBe('iframe')
    expect(info.id).toBe('demo')
    expect(info.options).toEqual({ debug: true })
  })

  test('a colon INSIDE the options is not read as a mode', () => {
    // `{"debug":true}` contains `:true`; the options are split off before the mode is read.
    expect(parseFenceInfo('js {"debug":true}').mode).toBeUndefined()
    expect(parseFenceInfo('js {"anchor":"#x"}').id).toBeUndefined()
  })

  test('malformed options are reported, not dropped', () => {
    const bad = parseFenceInfo('tjs {debug: true}')
    expect(bad.options).toBeUndefined()
    expect(bad.optionsError).toContain('not valid JSON')
    expect(parseFenceInfo('tjs {"a": 1')).toHaveProperty('optionsError')
  })

  test('a fence without options has none', () => {
    const info = parseFenceInfo('js:static')
    expect(info.options).toBeUndefined()
    expect(info.optionsError).toBeUndefined()
  })
})

describe('the dialect registry', () => {
  test('built-ins are dialect languages; html/css/test are not', () => {
    for (const lang of ['js', 'tjs', 'ts']) {
      expect(isDialectLanguage(lang)).toBe(true)
    }
    for (const lang of ['html', 'css', 'test', 'python']) {
      expect(isDialectLanguage(lang)).toBe(false)
    }
  })

  test('a registered dialect makes its fences live, under every rule a built-in follows', () => {
    expect(isDialectLanguage('shout')).toBe(true)
    expect(isLiveFence('shout', undefined)).toBe(true)
    expect(isLiveFence('shout', 'static')).toBe(false)
    expect(isLiveFence('shout', undefined, 'opt-in')).toBe(false)
    expect(isLiveFence('shout', 'inline', 'opt-in')).toBe(true)
    expect(isLiveFence('shout', undefined, 'none')).toBe(false)
  })

  test('a spec gives exactly one of transform or run', () => {
    expect(() => registerDialect('neither', {})).toThrow(/exactly one/)
    expect(() =>
      registerDialect('both', {
        transform: (code) => ({ code }),
        run: () => undefined,
      })
    ).toThrow(/exactly one/)
    expect(isDialectLanguage('neither')).toBe(false)
  })

  test('names the fence parser cannot read, and html/css/test, are refused', () => {
    expect(() => registerLiveLanguage('c++')).toThrow(/not a fence language/)
    expect(() => registerLiveLanguage('my-lang')).toThrow(
      /not a fence language/
    )
    expect(() =>
      registerDialect('html', { transform: (code) => ({ code }) })
    ).toThrow(/cannot be a dialect/)
  })

  test("a custom transform receives the example's options", async () => {
    const transform = await dialectTransform('shout', { loud: true })
    expect((await transform!('hi')).code).toBe('/*{"loud":true}*/ HI')
  })

  test('a run dialect has no transform; an unknown one runs as plain JavaScript', async () => {
    expect(await dialectTransform('vm')).toBeUndefined()
    const identity = await dialectTransform('nosuchdialect')
    expect((await identity!('x + 1')).code).toBe('x + 1')
  })

  test('the built-in js transform is untouched', async () => {
    const js = await dialectTransform('js')
    expect((await js!('a')).code).toBe('a')
    expect(getDialect('js')).toEqual({})
  })
})

describe('fence options reach the example', () => {
  test('render.ts carries them to the page as an attribute, escaped', () => {
    // (Not `\"` inside a string: CommonMark unescapes backslashes in a fence's info string.)
    const html = renderDocMarkdown('```shout {"say": "<c> & \'q\'"}\nhi\n```')
    expect(html).toContain('class="language-shout"')
    const attr = html.match(/data-example-options="([^"]*)"/)?.[1]
    expect(attr).toBeDefined()
    const decoded = attr!
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
    expect(JSON.parse(decoded)).toEqual({ say: "<c> & 'q'" })
  })

  test('a fence without options renders exactly as before', () => {
    expect(renderDocMarkdown('```js\nx\n```')).not.toContain('data-example')
  })

  function run(inner: string) {
    const root = document.createElement('div')
    root.innerHTML = inner
    const created: any[] = []
    const creator: any = () => {
      const el: any = document.createElement('div')
      el.showDefaultTab = () => {}
      el.snapshotAndRestoreLocalEdit = () => {}
      created.push(el)
      return el
    }
    insertExamples(root, {} as any, creator, 'live-example')
    return created
  }

  test('insertExamples groups a registered dialect and hands it its options', () => {
    const [example] = run(
      `<pre data-example-options='{"loud":true}'><code class="language-shout">hi</code></pre>` +
        `<pre><code class="language-html">&lt;b&gt;x&lt;/b&gt;</code></pre>`
    )
    expect(example.js).toBe('hi')
    expect(example.dialect).toBe('shout')
    expect(example.options).toEqual({ loud: true })
    expect(example.html).toBe('<b>x</b>')
  })

  test('an options error is reported, naming the example', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    try {
      const [example] = run(
        `<pre data-example-options-error="fence options are not valid JSON"><code class="language-vm">x</code></pre>`
      )
      expect(example.options).toEqual({})
      expect(error).toHaveBeenCalledTimes(1)
      expect(String(error.mock.calls[0][0])).toContain('example-1')
    } finally {
      error.mockRestore()
    }
  })

  test('two source blocks warn, whatever their dialects', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      run(
        `<pre><code class="language-js">a</code></pre>` +
          `<pre><code class="language-shout">b</code></pre>`
      )
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })
})

test('save-to-source writes an edit into a registered dialect block', () => {
  const src =
    'Intro\n\n```shout {"loud": true}\nhi\n```\n```html\n<b></b>\n```\n'
  const out = rewriteExampleBlocks(src, 0, { js: 'bye', html: '<b></b>' })
  expect(out).toBe(
    'Intro\n\n```shout {"loud": true}\nbye\n```\n```html\n<b></b>\n```\n'
  )
})

test('showDialectResult shows strings as written and values as JSON', () => {
  const preview = document.createElement('div')
  showDialectResult(preview, 'plain')
  showDialectResult(preview, { a: [1] })
  showDialectResult(preview, 10n)
  const shown = [...preview.querySelectorAll('pre.dialect-result')].map(
    (el) => el.textContent
  )
  expect(shown).toEqual(['plain', '{\n  "a": [\n    1\n  ]\n}', '10'])
})

describe('1.16.1 review regressions', () => {
  function runInsert(inner: string) {
    const root = document.createElement('div')
    root.innerHTML = inner
    const created: any[] = []
    const creator: any = () => {
      const el: any = document.createElement('div')
      el.showDefaultTab = () => {}
      el.snapshotAndRestoreLocalEdit = () => {}
      created.push(el)
      return el
    }
    insertExamples(root, {} as any, creator, 'live-example', 'doc.md')
    return { root, created }
  }

  test('B1: an uppercase fence stays static, keeps its content, and ordinals agree with save-to-source', () => {
    const { root, created } = runInsert(
      `<pre><code class="language-js">a</code></pre>` +
        `<p>prose</p>` +
        `<pre><code class="language-HTML">&lt;b&gt;kept&lt;/b&gt;</code></pre>` +
        `<p>prose</p>` +
        `<pre><code class="language-JS">static</code></pre>` +
        `<p>prose</p>` +
        `<pre><code class="language-js">b</code></pre>`
    )
    // 1.16.0 behaviour: uppercase fences are not live examples
    expect(created.map((e) => e.js)).toEqual(['a', 'b'])
    expect(root.querySelector('.language-HTML')?.textContent).toBe(
      '<b>kept</b>'
    )
    expect(root.querySelector('.language-JS')?.textContent).toBe('static')
    // save-to-source scans the raw markdown the same way: 2 groups, same order
    const src =
      '```js\na\n```\n\nprose\n\n```HTML\n<b>kept</b>\n```\n\nprose\n\n```JS\nstatic\n```\n\nprose\n\n```js\nb\n```\n'
    expect(
      rewriteExampleBlocks(src, 1, { js: 'B' })?.endsWith('```js\nB\n```\n')
    ).toBe(true)
    expect(isLiveFence('JS', undefined)).toBe(false)
    expect(isDialectLanguage('JS')).toBe(false)
  })

  test('a fence with trailing non-JSON info behaves as in 1.16.0', () => {
    const info = parseFenceInfo('js something else')
    expect(info.lang).toBe('js')
    expect(info.mode).toBeUndefined()
    expect(info.options).toBeUndefined()
    expect(info.optionsError).toBeUndefined()
    expect(renderDocMarkdown('```js something\nx\n```')).not.toContain(
      'data-example'
    )
  })
})

describe('SiteConfig.dialects on the page (#2463)', () => {
  function insert() {
    const root = document.createElement('div')
    root.innerHTML = `<pre><code class="language-js">x</code></pre>`
    const creator: any = () => {
      const el: any = document.createElement('div')
      el.showDefaultTab = () => {}
      el.snapshotAndRestoreLocalEdit = () => {}
      return el
    }
    insertExamples(root, {} as any, creator, 'live-example')
  }

  test('a declared dialect nobody registered is reported, by name, once', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    ;(globalThis as any).__TOSI_DIALECTS = ['neverregistered', 'shout']
    try {
      insert()
      insert()
      const messages = error.mock.calls.map((c) => String(c[0]))
      expect(
        messages.filter((m) => m.includes('"neverregistered"')).length
      ).toBe(1)
      expect(messages.some((m) => m.includes('"shout"'))).toBe(false) // registered above
    } finally {
      delete (globalThis as any).__TOSI_DIALECTS
      error.mockRestore()
    }
  })

  test('a declared built-in that was not replaced is reported', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    ;(globalThis as any).__TOSI_DIALECTS = ['ts']
    try {
      insert()
      expect(error.mock.calls.some((c) => String(c[0]).includes('"ts"'))).toBe(
        true
      )
    } finally {
      delete (globalThis as any).__TOSI_DIALECTS
      error.mockRestore()
    }
  })
})

describe('the Docs tab source (#184 part 3)', () => {
  test("a dialect's docs hook supplies the markdown, with the fence options", async () => {
    registerDialect('documented', {
      run: () => undefined,
      docs: (source, options) => `## ${source}\n\nfuel: ${options.fuel}`,
    })
    expect(await dialectDocs('documented', 'agent', { fuel: 10 })).toBe(
      '## agent\n\nfuel: 10'
    )
  })

  test('no hook, no docs: plain js, an unknown dialect, and a dialect without one', async () => {
    expect(await dialectDocs('js', 'x')).toBe('')
    expect(await dialectDocs('nosuch', 'x')).toBe('')
    expect(await dialectDocs('shout', 'x')).toBe('')
  })
})
