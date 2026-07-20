import { describe, expect, test } from 'bun:test'
import { insertExamples } from './insert-examples'

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
    const withProse = run(pre('tjs', 'SRC') + '<p>note</p>' + pre('test', 'TST'))
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
