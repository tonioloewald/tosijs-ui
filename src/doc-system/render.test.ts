import { test, expect } from 'bun:test'
import { renderDocMarkdown, unwrapLoneCustomElements } from './render.js'
import { wikilinkTargets } from './routing.js'

test('a ```lang#id fence stamps data-example-id and keeps the language clean', () => {
  const html = renderDocMarkdown('```js#my-demo\nconst x = 1\n```')
  expect(html).toContain('data-example-id="my-demo"')
  expect(html).toContain('class="language-js"')
  expect(html).not.toContain('language-js#') // id stripped from the class
})

test('a plain fence renders unchanged (no data-example-id)', () => {
  const html = renderDocMarkdown('```js\nconst y = 2\n```')
  expect(html).toContain('class="language-js"')
  expect(html).not.toContain('data-example-id')
})

test('a bare trailing # (no id) falls back to default rendering', () => {
  const html = renderDocMarkdown('```js#\nconst z = 3\n```')
  expect(html).not.toContain('data-example-id')
})

test('wikilinks: [[slug]] and [[slug|label]] resolve to /slug/', () => {
  const html = renderDocMarkdown('See [[the-coast]] and [[note-42|the map]].')
  expect(html).toContain('<a href="/the-coast/" class="wikilink">the-coast</a>')
  expect(html).toContain('<a href="/note-42/" class="wikilink">the map</a>')
})

test('wikilinks: given the corpus, a TITLE reaches its page and an unknown target is marked (#234)', () => {
  const wikilinks = wikilinkTargets([
    { filename: 'README.md', title: 'Home' },
    { filename: 'registry.md', title: 'The feature registry' },
    { filename: 'combat.md', title: 'Presets' },
    { filename: 'presets.md', title: 'Presets' },
  ])
  const html = renderDocMarkdown(
    '[[The feature registry]], [[registry|reg]], [[Presets]], [[Home]], [[presets-combat]]',
    { wikilinks }
  )
  expect(html).toContain(
    '<a href="/registry/" class="wikilink">The feature registry</a>'
  )
  expect(html).toContain('<a href="/registry/" class="wikilink">reg</a>')
  // A slug beats a title: `presets.md` is /presets/, though another page is titled Presets.
  expect(html).toContain('<a href="/presets/" class="wikilink">Presets</a>')
  // The home page is reached by its title, at the root.
  expect(html).toContain('<a href="/" class="wikilink">Home</a>')
  expect(html).toContain(
    '<a href="/presets-combat/" class="wikilink -missing" data-target="presets-combat">presets-combat</a>'
  )
})

test('wikilinkTargets: two pages sharing a title reach neither by it', () => {
  const targets = wikilinkTargets([
    { filename: 'a.md', title: 'Setup' },
    { filename: 'b.md', title: 'Setup' },
  ])
  expect(targets.has('setup')).toBe(false)
  expect(targets.get('a')).toBe('a')
})

test('wikilinks are NOT resolved inside code spans', () => {
  const html = renderDocMarkdown('Literal `[[in code]]` stays.')
  expect(html).toContain('<code>[[in code]]</code>')
  expect(html).not.toContain('wikilink')
})

test('footnotes: refs number by appearance and render as endnotes', () => {
  const html = renderDocMarkdown(
    'A note[^1] and another[^b].\n\n[^1]: First with *emphasis*.\n[^b]: Second.'
  )
  // ref superscripts, numbered 1,2 by first appearance
  expect(html).toContain(
    '<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>'
  )
  expect(html).toContain(
    '<sup class="footnote-ref"><a href="#fn-b" id="fnref-b">2</a></sup>'
  )
  // endnotes section with rendered definition markdown + backref
  expect(html).toContain('<section class="footnotes"')
  expect(html).toContain('<li id="fn-1"><p>First with <em>emphasis</em>.')
  expect(html).toContain('href="#fnref-1"')
})

test('a doc using neither footnotes nor wikilinks is unaffected', () => {
  const html = renderDocMarkdown('# T\n\nJust `code` and a [link](/x/).')
  expect(html).not.toContain('footnotes')
  expect(html).not.toContain('wikilink')
})

test('bakes: a matching source emits a hidden transpiled <script>; no bakes → unchanged', () => {
  const src = 'const n = 1\nvoid n'
  const bakes = new Map([[src, { dialect: 'tjs', js: 'const n=1;void n;' }]])
  const html = renderDocMarkdown('```tjs\n' + src + '\n```', { bakes })
  expect(html).toContain(
    '<script type="application/tosi-transpiled" data-dialect="tjs">'
  )
  // The JS is JSON-encoded so it round-trips through JSON.parse at hydration.
  expect(html).toContain(JSON.stringify('const n=1;void n;'))
  // A block whose source isn't in the map renders byte-identically to no-bakes.
  const other = renderDocMarkdown('```tjs\nconst z = 2\n```', { bakes })
  expect(other).not.toContain('tosi-transpiled')
  expect(other).toBe(renderDocMarkdown('```tjs\nconst z = 2\n```'))
})

test('bakes: a </script> in the transpiled JS cannot break out of the tag', () => {
  const src = 'x'
  const js = 'const s = "</script><img>"'
  const bakes = new Map([[src, { dialect: 'tjs', js }]])
  const html = renderDocMarkdown('```tjs\n' + src + '\n```', { bakes })
  // The raw closing tag must NOT appear before our own </script>; it's escaped.
  const open = html.indexOf('application/tosi-transpiled')
  const close = html.indexOf('</script>', open)
  expect(html.slice(open, close)).not.toContain('</script>')
  expect(html.slice(open, close)).toContain('\\u003c/script>')
  // And it decodes back to the exact JS.
  const json = html.slice(html.indexOf('>', open) + 1, close)
  expect(JSON.parse(json)).toBe(js)
})

test('a ```lang:mode fence stamps data-example-mode and keeps the language clean', () => {
  const html = renderDocMarkdown('```js:iframe\nconst x = 1\n```')
  expect(html).toContain('data-example-mode="iframe"')
  expect(html).toContain('class="language-js"') // language stays clean for grouping
  expect(html).not.toContain('js:iframe')
})

test('```lang:mode#id carries BOTH the mode and the anchor', () => {
  const html = renderDocMarkdown('```ts:ide#demo\nconst y = 2\n```')
  expect(html).toContain('data-example-id="demo"')
  expect(html).toContain('data-example-mode="ide"')
  expect(html).toContain('class="language-ts"')
})

test('```lang#id:mode works too — mode and id are order-free', () => {
  const html = renderDocMarkdown('```ts#demo:ide\nconst z = 3\n```')
  expect(html).toContain('data-example-id="demo"')
  expect(html).toContain('data-example-mode="ide"')
  expect(html).toContain('class="language-ts"')
})

/*
marked classifies raw HTML by tag name and cannot know whether an unknown tag is block or
inline, so a custom element alone on a line comes out inside a `<p>`. That paragraph is
auto-height, which defeats the one thing `layout: "full-screen"` exists to do: a page whose
whole content is an embedded app got an element whose `height: 100%` resolved against a 33px
box. Measured on the rendered page before the fix; 842 of 842 after.
*/
test('#115: unwraps a paragraph whose entire content is one custom element', () => {
  const html = renderDocMarkdown('<my-editor></my-editor>')
  expect(html).toContain('<my-editor></my-editor>')
  expect(html).not.toMatch(/<p>\s*<my-editor/)
})

test('#115: leaves real paragraphs alone', () => {
  /*
  The narrowness is the point — a heuristic here earns its own bugs. Only a tag name with a
  hyphen qualifies, because that is the one case marked provably cannot classify. An image or
  emphasis inside a paragraph is a paragraph the author asked for.
  */
  expect(unwrapLoneCustomElements('<p><img src="x.png"></p>')).toBe(
    '<p><img src="x.png"></p>'
  )
  expect(unwrapLoneCustomElements('<p><em>hi</em></p>')).toBe(
    '<p><em>hi</em></p>'
  )
})

test('#115: leaves a paragraph with surrounding text alone', () => {
  // Text beside the element means it IS prose, and the paragraph belongs there.
  const mixed = '<p>see <my-thing></my-thing> here</p>'
  expect(unwrapLoneCustomElements(mixed)).toBe(mixed)
})

test('#115: does not swallow a following paragraph', () => {
  // The lazy match could otherwise close on a later `</p>` and eat the text between.
  const two = '<p><my-thing></my-thing></p>\n<p>after</p>'
  const out = unwrapLoneCustomElements(two)
  expect(out).toContain('<p>after</p>')
  expect(out).toContain('<my-thing></my-thing>')
})

test('#115: handles attributes and whitespace', () => {
  const out = unwrapLoneCustomElements(
    '<p>\n  <my-app data-x="1" style="height:100%"></my-app>\n</p>'
  )
  expect(out).not.toContain('<p>')
  expect(out).toContain('data-x="1"')
})

// ── the accessibility mode (#3521) ───────────────────────────────────────────

const a11y = (text: string, title?: string) =>
  renderDocMarkdown(text, { accessible: true, title })

test('an image followed by an italic paragraph is a figure with that caption', () => {
  const html = a11y('![](cube.png)\n\n*A cube, lit from the left.*\n\nAfter.')
  expect(html).toContain(
    '<figure><img src="cube.png" alt=""><figcaption>A cube, lit from the left.</figcaption></figure>'
  )
  expect(html).toContain('<p>After.</p>')
})

test('the caption may sit on the very next line', () => {
  const html = a11y('![](cube.png)\n_A cube._')
  expect(html).toContain('<figcaption>A cube.</figcaption>')
  expect(html).not.toContain('<p>')
})

test('figures inside a blockquote, and the image alt is kept', () => {
  const html = a11y('> ![A cube](cube.png)\n>\n> *Figure 1*')
  expect(html).toContain('<blockquote>')
  expect(html).toContain(
    '<figure><img src="cube.png" alt="A cube"><figcaption>Figure 1</figcaption></figure>'
  )
})

test('not a figure: an image with prose, a lone image, a caption with more than italics', () => {
  for (const text of [
    'Look: ![](a.png)\n\n*caption*',
    '![](a.png)\n\nPlain text.',
    '![](a.png)\n\n*caption* and more',
    '![](a.png)',
  ])
    expect(a11y(text)).not.toContain('<figure>')
})

test('off by default: the same markdown renders as it always did', () => {
  const text = '## Part\n\n![](cube.png)\n\n*A cube.*'
  expect(renderDocMarkdown(text)).toBe(renderDocMarkdown(text, {}))
  expect(renderDocMarkdown(text)).not.toContain('<figure>')
  expect(renderDocMarkdown(text, { title: 'T' })).not.toContain('<h1')
})

test('a page with no # heading gets its title as the one <h1>', () => {
  const html = a11y('## Lights\n\ntext', 'Lighting <a scene>')
  expect(html).toMatch(
    /^<h1 id="lighting-a-scene">Lighting &lt;a scene&gt;<\/h1>\n<h2 id="lights">/
  )
})

test('a page whose title came from its first heading has that heading promoted, not repeated', () => {
  const html = a11y('## Three lights\n\n### Key\n\n### Fill', 'Three lights')
  expect(html).toBe(
    '<h1 id="three-lights">Three lights</h1>\n<h2 id="key">Key</h2>\n<h2 id="fill">Fill</h2>\n'
  )
})

test('a later # is demoted, and levels shift so the first below the title is ##', () => {
  const html = a11y('# Title\n\n### A\n\n#### B\n\n# Again', 'Title')
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(html).toContain('<h2 id="a">A</h2>')
  expect(html).toContain('<h3 id="b">B</h3>')
  expect(html).toContain('<h2 id="again">Again</h2>')
})

test('headings in a blockquote or list shift with the page, and never become the title (#3576)', () => {
  // Learn 3D's shape: sections at ###, a sidebar at > ####.
  const html = a11y(
    '### Why\n\n> #### Non-Destructive?\n\n- # In a list',
    'Why'
  )
  expect(html).toContain('<h1 id="why">Why</h1>')
  expect(html).toContain('<h2 id="non-destructive">Non-Destructive?</h2>')
  expect(html).toContain('<h2 id="in-a-list">In a list</h2>')
  expect(html.match(/<h1/g)).toHaveLength(1)
  const report = a11y('# T\n\n### A\n\n> #### Sidebar', 'T')
  expect(report).toContain('<h2 id="a">A</h2>')
  expect(report).toContain('<h3 id="sidebar">Sidebar</h3>')
})

test('a skipped level is left as written (the build reports it)', () => {
  const html = a11y('# T\n\n## A\n\n#### Deep')
  expect(html).toContain('<h4 id="deep">Deep</h4>')
})
