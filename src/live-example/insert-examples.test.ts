import { test, expect, describe } from 'bun:test'
import { insertExamples } from './insert-examples.js'
import { liveExample } from '../live-example.js'

/*
#139: `js`/`tjs`/`ts` all write the same single-valued slot, so a second executable fence
silently overwrote the first — the earlier block vanished from the page, the example ran as the
later dialect, and nothing said so.

Silent content loss in the direction the author cannot see: the page renders and the example
works, so only the source shows what was meant. Warning, not refusing — the page is still
usable and failing a doc build over a fence would cost more than the loss it prevents.
*/
const mount = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  const warnings: string[] = []
  const real = console.warn
  console.warn = (m?: unknown) => void warnings.push(String(m))
  try {
    insertExamples(
      host,
      {} as any,
      liveExample as any,
      'tosi-example',
      'probe.md'
    )
  } finally {
    console.warn = real
  }
  const examples = [...host.querySelectorAll('tosi-example')] as any[]
  host.remove()
  return { examples, warnings: warnings.join('\n') }
}
const fence = (lang: string, code: string) =>
  `<pre><code class="language-${lang}">${code}</code></pre>`

describe('executable fence collisions (#139)', () => {
  test('two executable blocks warn, and name the file and what was kept', () => {
    const { examples, warnings } = mount(
      fence('tjs', 'TJS') + fence('ts', 'TS')
    )
    expect(examples.length).toBe(1)
    // The pre-existing behaviour is unchanged — last one still wins.
    expect(examples[0].js).toBe('TS')
    expect(warnings).toContain('probe.md')
    expect(warnings).toContain('2 executable blocks')
    expect(warnings).toContain('Keeping: ts')
  })

  test('ONE executable block is silent — the normal case must not warn', () => {
    const { examples, warnings } = mount(fence('js', 'JS'))
    expect(examples[0].js).toBe('JS')
    expect(warnings).toBe('')
  })

  test('html + css + one executable is the documented shape, and stays silent', () => {
    const { warnings } = mount(
      fence('html', '<b>x</b>') + fence('js', 'JS') + fence('css', 'b{}')
    )
    expect(warnings).toBe('')
  })

  test('a display-only ```typescript fence is not executable and does not collide', () => {
    const { examples, warnings } = mount(
      fence('js', 'JS') + fence('typescript', 'SHOWN')
    )
    expect(examples[0].js).toBe('JS')
    expect(warnings).toBe('')
  })
})
