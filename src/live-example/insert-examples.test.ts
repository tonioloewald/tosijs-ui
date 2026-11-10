import { afterEach, describe, expect, test } from 'bun:test'
import { insertExamples, setExamplePolicy } from './insert-examples.js'

// A minimal stand-in for the live-example element: insertExamples only sets
// js/html/css/test/dialect + id on it and calls two lifecycle no-ops, so a plain
// element with those methods faithfully exercises the grouping logic.
function makeCreator() {
  const created: any[] = []
  const creator: any = () => {
    const el: any = document.createElement('div')
    el.showDefaultTab = () => {}
    el.snapshotAndRestoreLocalEdit = () => {}
    created.push(el)
    return el
  }
  return { creator, created }
}

function pre(lang: string, code: string, mode?: string): string {
  const attr = mode ? ` data-example-mode="${mode}"` : ''
  return `<pre${attr}><code class="language-${lang}">${code}</code></pre>`
}

function run(inner: string) {
  const root = document.createElement('div')
  root.innerHTML = inner
  const { creator, created } = makeCreator()
  insertExamples(root, {} as any, creator, 'live-example')
  return created
}

const TRANSPILED =
  '<script type="application/tosi-transpiled" data-dialect="tjs">"x"</script>'

describe('insertExamples grouping across the baked <script>', () => {
  test('a tjs+test pair groups into ONE example when a transpiled script sits between them', () => {
    const created = run(pre('tjs', 'SRC') + TRANSPILED + pre('test', 'TST'))
    expect(created).toHaveLength(1)
    expect(created[0].js).toBe('SRC')
    expect(created[0].dialect).toBe('tjs')
    expect(created[0].test).toBe('TST')
    // The baked <script> (JSON "x") is read onto the example as compiledJs.
    expect(created[0].compiledJs).toBe('x')
  })

  test('same pair groups identically with no script present (behavior unchanged)', () => {
    const created = run(pre('tjs', 'SRC') + pre('test', 'TST'))
    expect(created).toHaveLength(1)
    expect(created[0].js).toBe('SRC')
    expect(created[0].test).toBe('TST')
    // No bake present → compiledJs stays unset (SPA-nav / older-build fallback).
    expect(created[0].compiledJs).toBeUndefined()
  })

  test('the skip is narrow: a plain <script> or prose between blocks still SPLITS them', () => {
    const withPlainScript = run(
      pre('tjs', 'SRC') + '<script>void 0</script>' + pre('test', 'TST')
    )
    expect(withPlainScript).toHaveLength(2)
    const withProse = run(
      pre('tjs', 'SRC') + '<p>note</p>' + pre('test', 'TST')
    )
    expect(withProse).toHaveLength(2)
  })
})

describe('insertExamples fenced execution mode (:mode)', () => {
  test('the group takes the first fenced mode', () => {
    const created = run(pre('css', '.x{}', 'iframe') + pre('js', 'SRC'))
    expect(created).toHaveLength(1)
    expect(created[0].getAttribute('mode')).toBe('iframe')
  })

  test('no mode → the example gets no mode attribute (inline default)', () => {
    const created = run(pre('js', 'SRC'))
    expect(created[0].getAttribute('mode')).toBe(null)
  })

  test('contradictory modes: console.error, but obey the FIRST', () => {
    const orig = console.error
    let msg = ''
    console.error = (m: string) => {
      msg = String(m)
    }
    try {
      const created = run(pre('js', 'SRC', 'iframe') + pre('test', 'T', 'ide'))
      expect(created[0].getAttribute('mode')).toBe('iframe') // first wins
      expect(msg).toMatch(/contradictory modes/)
      expect(msg).toMatch(/iframe/)
    } finally {
      console.error = orig
    }
  })
})

/*
#139: `js`/`tjs`/`ts` all write the same single-valued slot, so a second executable fence
silently overwrote the first — the earlier block vanished from the page, the example ran as the
later dialect, and nothing said so.

Silent content loss in the direction the author cannot see: the page renders and the example
works, so only the source shows what was meant. Warning, not refusing — the page is still
usable and failing a doc build over a fence would cost more than the loss it prevents.

Uses the same STUB creator as the tests above, deliberately. An earlier version of this file
reached for the real `liveExample`, which transpiles a `ts` fence and therefore fetches the
TypeScript compiler; the rejection leaked across test-file boundaries and printed
`ENOENT reading "https://esm.sh/typescript@5"` under an unrelated file's header. The grouping
logic is what is under test, and the stub exercises it faithfully.
*/
describe('executable fence collisions (#139)', () => {
  const warn = (inner: string) => {
    const root = document.createElement('div')
    root.innerHTML = inner
    const { creator } = makeCreator()
    const lines: string[] = []
    const real = console.warn
    console.warn = (m?: unknown) => void lines.push(String(m))
    try {
      insertExamples(root, {} as any, creator, 'live-example', 'probe.md')
    } finally {
      console.warn = real
    }
    return lines.join('\n')
  }

  test('two executable blocks warn, naming the file and what was kept', () => {
    const out = warn(pre('tjs', 'TJS') + pre('ts', 'TS'))
    expect(out).toContain('probe.md')
    expect(out).toContain('2 executable blocks')
    expect(out).toContain('Keeping: ts')
  })

  test('ONE executable block is silent — the normal case must not warn', () => {
    expect(warn(pre('js', 'JS'))).toBe('')
  })

  test('html + css + one executable is the documented shape, and stays silent', () => {
    expect(
      warn(pre('html', '<b>x</b>') + pre('js', 'JS') + pre('css', 'b{}'))
    ).toBe('')
  })

  test('a display-only ```typescript fence is not executable and does not collide', () => {
    expect(warn(pre('js', 'JS') + pre('typescript', 'SHOWN'))).toBe('')
  })
})

/*
Which fences run, and how a consumer turns that off (#140, #146).

A static code sample in an executable language was impossible: the only workaround was to
mislabel the fence (`xml` for HTML), which changes the highlighting to a language it isn't.
Two escapes, and the DEFAULT MUST NOT MOVE — every corpus written before 1.15 assumes `auto`.
*/
describe('#140: example policy', () => {
  afterEach(() => setExamplePolicy('auto'))

  test('DEFAULT is unchanged — executable fences still run', () => {
    // Every corpus written before 1.15 assumes this. Prose splits them into two examples.
    expect(run(pre('js', 'A') + '<p>x</p>' + pre('css', 'B')).length).toBe(2)
  })

  test('`:static` opts ONE fence out, under the default policy', () => {
    expect(
      run(pre('js', 'A') + '<p>x</p>' + pre('css', 'B', 'static')).length
    ).toBe(1)
  })

  test('opt-in: nothing runs unless the fence asks', () => {
    setExamplePolicy('opt-in')
    expect(
      run(
        pre('js', 'A') +
          '<p>x</p>' +
          pre('css', 'B') +
          '<p>x</p>' +
          pre('html', 'C')
      ).length
    ).toBe(0)
  })

  test('opt-in: a fence that asks still runs', () => {
    setExamplePolicy('opt-in')
    expect(
      run(pre('js', 'A', 'inline') + '<p>x</p>' + pre('css', 'B')).length
    ).toBe(1)
  })

  test('`:static` still wins under opt-in — one corpus can target both policies', () => {
    setExamplePolicy('opt-in')
    expect(run(pre('js', 'A', 'static')).length).toBe(0)
  })
})

describe('#3820: only a fence is a source block', () => {
  test("Prism's nested `token language-css` spans in a markup sample make no examples", () => {
    // What Prism leaves in a static ```xml fence holding a <style> body and a style="…"
    const markup =
      '<pre><code class="language-xml">' +
      '<span class="token tag">&lt;style&gt;</span>' +
      '<span class="token style"><span class="token language-css">p { color: red }</span></span>' +
      '<span class="token tag">&lt;p <span class="token special-attr"><span class="token value css language-css">color: blue</span></span>&gt;</span>' +
      '</code></pre>'
    expect(run(markup)).toHaveLength(0)
    // and a real css fence beside it still runs
    const created = run(markup + '<p>prose</p>' + pre('css', 'p {}'))
    expect(created).toHaveLength(1)
    expect(created[0].css).toBe('p {}')
  })
})
