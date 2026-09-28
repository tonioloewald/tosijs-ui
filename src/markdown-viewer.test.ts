import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { updates } from 'tosijs'
import { TosiMd, tosiMd } from './markdown-viewer.js'

/*
`sanitize` (#179). virta's pre-release review found <tosi-md> assigned marked() output straight
to innerHTML — a stored XSS for any consumer rendering text it did not write, with a token in
localStorage as the payoff. `sanitize="on"` was opt-in in 1.15.x (unset warned once per page);
since 1.16 it is the default, and only `sanitize="off"` renders raw HTML.
*/

const HOSTILE = [
  '<img src=x onerror="window.__pwned = 1">',
  '<script>window.__pwned = 2</script>',
  '[click](javascript:window.__pwned=3)',
  '<a href="data:text/html,<script>window.__pwned=4</script>">data link</a>',
  '<svg onload="window.__pwned = 5"></svg>',
  '<iframe src="javascript:window.__pwned=6"></iframe>',
  '<a href="JaVaScRiPt:window.__pwned=7">mixed case</a>',
  // kilpi admits raster data: for an <img src>; a LINK must never carry one
  '<a href="data:image/png;base64,AAAA">image link</a>',
].join('\n\n')

function render(props: Record<string, unknown>, value: string): TosiMd {
  const el = tosiMd(props)
  document.body.append(el)
  el.value = value
  el.render()
  return el
}

/** Every way the corpus above could still execute, as a list of what survived. */
function residue(root: Element): string[] {
  const found: string[] = []
  for (const el of root.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'script' || tag === 'iframe') found.push(`<${tag}>`)
    for (const attr of el.attributes) {
      const value = attr.value.trim().toLowerCase()
      if (attr.name.startsWith('on')) found.push(`${tag}[${attr.name}]`)
      if (
        (attr.name === 'href' &&
          (value.startsWith('javascript:') || value.startsWith('data:'))) ||
        (attr.name === 'src' &&
          (value.startsWith('javascript:') || value.startsWith('data:text')))
      ) {
        found.push(`${tag}[${attr.name}=${value.slice(0, 20)}]`)
      }
    }
  }
  return found
}

describe('<tosi-md sanitize> (#179)', () => {
  let warnings: unknown[][]
  const originalWarn = console.warn

  beforeEach(() => {
    warnings = []
    console.warn = (...args: unknown[]) => warnings.push(args)
  })

  afterEach(() => {
    console.warn = originalWarn
    document.querySelectorAll('tosi-md').forEach((el) => el.remove())
  })

  test('sanitize="on" leaves no executable residue', () => {
    const el = render({ sanitize: 'on' }, HOSTILE)
    expect(residue(el)).toEqual([])
  })

  test('the same corpus unsanitized DOES leave residue — the test can see it', () => {
    const el = render({ sanitize: 'off' }, HOSTILE)
    expect(residue(el).length).toBeGreaterThan(0)
  })

  test('elements mode is sanitized too', () => {
    const el = render(
      { sanitize: 'on', elements: true },
      '<img src=x onerror="window.__pwned = 1">\n## heading'
    )
    expect(residue(el)).toEqual([])
    expect(el.querySelector('h2')?.textContent).toBe('heading')
  })

  test('markdown, safe links and ALLOWED custom elements survive', () => {
    const el = render(
      { sanitize: 'on', allowedElements: 'tosi-icon' },
      '## title\n\n**bold** [site](https://example.com)\n\n<tosi-icon icon="user"></tosi-icon>'
    )
    expect(el.querySelector('h2')?.textContent).toBe('title')
    expect(el.querySelector('strong')?.textContent).toBe('bold')
    expect(el.querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com'
    )
    expect(el.querySelector('tosi-icon')).not.toBeNull()
  })

  test('ordinary links are NOT stripped: relative, anchor, mailto', () => {
    const el = render(
      { sanitize: 'on' },
      '[a](/docs/) [b](#top) [c](../up/) [d](mailto:x@y.z)'
    )
    expect(
      [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    ).toEqual(['/docs/', '#top', '../up/', 'mailto:x@y.z'])
  })

  test('a bare `sanitize` attribute means on', () => {
    const el = tosiMd()
    el.setAttribute('sanitize', '')
    document.body.append(el)
    el.value = HOSTILE
    el.render()
    expect(residue(el)).toEqual([])
    expect(warnings).toEqual([])
  })

  test('unset SANITIZES (the default since 1.16), silently', () => {
    const el = render({}, HOSTILE)
    expect(residue(el)).toEqual([])
    expect(warnings).toEqual([])
  })

  test('only an explicit sanitize="off" renders raw HTML', () => {
    expect(
      residue(render({ sanitize: 'off' }, HOSTILE)).length
    ).toBeGreaterThan(0)
    // anything that is not exactly "off" sanitizes, typos included
    expect(residue(render({ sanitize: 'of' }, HOSTILE))).toEqual([])
  })

  test('sanitize="on" and sanitize="off" are both silent', () => {
    render({ sanitize: 'on' }, '# on')
    render({ sanitize: 'off' }, '# off')
    expect(warnings).toEqual([])
  })
})

/*
B1 of the 1.16.0 pre-release review: sanitizing kept UNKNOWN CUSTOM ELEMENTS (kilpi keeps them
by design), and some of ours execute or inject their own content. A nested
`<tosi-md sanitize="off">` survived, connected, decoded its textContent and assigned it as raw
innerHTML — a live `<img onerror>` in a "sanitized" render. The class, not the instance: in
sanitized mode a custom element is unwrapped (its sanitized content kept, the element dropped)
unless the host allows it by name.
*/
describe('sanitized <tosi-md> cannot be escaped through a custom element (B1)', () => {
  afterEach(() => {
    document.querySelectorAll('tosi-md').forEach((el) => el.remove())
  })

  /** Render, then let any nested <tosi-md> render too — that is when it would inject. */
  function renderDeep(props: Record<string, unknown>, value: string): TosiMd {
    const el = render(props, value)
    el.querySelectorAll('tosi-md').forEach((inner) =>
      (inner as TosiMd).render()
    )
    return el
  }

  test('a nested <tosi-md sanitize="off"> leaves no executable residue', () => {
    const el = renderDeep(
      {},
      'hello\n\n<tosi-md sanitize="off">&lt;img src=x onerror="window.__pwned=1"&gt;</tosi-md>'
    )
    expect(residue(el)).toEqual([])
    expect(el.querySelector('tosi-md')).toBeNull()
  })

  test('a <tosi-example> cannot be instantiated from untrusted markdown', () => {
    const el = render(
      {},
      '<tosi-example><pre><code class="language-js">window.__pwned = 9</code></pre></tosi-example>'
    )
    expect(el.querySelector('tosi-example')).toBeNull()
    // its content survives as inert text
    expect(el.textContent).toContain('window.__pwned = 9')
  })

  test('a custom element the host allows by name survives', () => {
    const el = render(
      { allowedElements: 'tosi-tag' },
      '<tosi-tag caption="ok"></tosi-tag> <tosi-example>x</tosi-example>'
    )
    expect(el.querySelector('tosi-tag')).not.toBeNull()
    expect(el.querySelector('tosi-example')).toBeNull()
  })

  test('allowedElements set AFTER the first render re-renders by itself (re-review M1)', async () => {
    const el = tosiMd()
    document.body.append(el)
    el.value = '<tosi-tag caption="ok"></tosi-tag>'
    el.render()
    expect(el.querySelector('tosi-tag')).toBeNull()
    el.allowedElements = 'tosi-tag' // the documented migration: no manual render()
    await updates()
    await new Promise((r) => setTimeout(r, 50))
    expect(el.querySelector('tosi-tag')).not.toBeNull()
  })

  test('the allowed-elements ATTRIBUTE works, space- or comma-separated', () => {
    const el = tosiMd()
    el.setAttribute('allowed-elements', 'tosi-tag, tosi-icon')
    document.body.append(el)
    el.value =
      '<tosi-tag caption="a"></tosi-tag><tosi-icon icon="user"></tosi-icon>'
    el.render()
    expect(el.querySelector('tosi-tag')).not.toBeNull()
    expect(el.querySelector('tosi-icon')).not.toBeNull()
  })

  test('tosi-md and tosi-example stay unwrapped even when allowed (fail closed)', () => {
    const el = render(
      { allowedElements: 'tosi-md tosi-example tosi-doc-system' },
      '<tosi-md sanitize="off">&lt;img src=x onerror="window.__pwned=1"&gt;</tosi-md><tosi-example>x</tosi-example><tosi-doc-system></tosi-doc-system>'
    )
    expect(el.querySelector('tosi-md')).toBeNull()
    expect(el.querySelector('tosi-example')).toBeNull()
    expect(el.querySelector('tosi-doc-system')).toBeNull()
    expect(residue(el)).toEqual([])
  })

  test('sanitize="off" (trusted markdown) keeps custom elements, as before', () => {
    const el = render({ sanitize: 'off' }, '<tosi-tag caption="ok"></tosi-tag>')
    expect(el.querySelector('tosi-tag')).not.toBeNull()
  })
})
