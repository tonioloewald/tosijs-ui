import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { TosiMd, tosiMd } from './markdown-viewer.js'

/*
`sanitize` (#179). virta's pre-release review found <tosi-md> assigned marked() output straight
to innerHTML — a stored XSS for any consumer rendering text it did not write, with a token in
localStorage as the payoff. `sanitize="on"` is opt-in in 1.15.x and becomes the default in 1.16;
until then an unset element renders as before and warns once per page.
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
    TosiMd.warnedUnsanitized = false
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

  test('markdown, safe links and custom elements survive', () => {
    const el = render(
      { sanitize: 'on' },
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

  test('unset warns exactly once per page, naming 1.16 and both settings', () => {
    render({}, '# one')
    render({}, '# two')
    expect(warnings.length).toBe(1)
    const message = String(warnings[0][0])
    expect(message).toContain('1.16')
    expect(message).toContain('sanitize="on"')
    expect(message).toContain('sanitize="off"')
  })

  test('sanitize="on" and sanitize="off" are both silent', () => {
    render({ sanitize: 'on' }, '# on')
    render({ sanitize: 'off' }, '# off')
    expect(warnings).toEqual([])
  })
})
