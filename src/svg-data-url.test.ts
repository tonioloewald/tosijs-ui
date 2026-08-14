import { test, expect } from 'bun:test'
import { svg2DataUrl, icons } from './icons'

/*
`svg2DataUrl` bakes inline `style` into presentation ATTRIBUTES, because a data-URL image is
its own document and cannot resolve the outer page's CSS variables. SVG presentation
attributes are kebab-case; a camelCase name is simply not an SVG attribute, so the browser
ignores it and the icon silently falls back to UA defaults — 1px strokes and mitred corners
where the icon asked for 2px and round. (tosijs-ui#68)

Decoded rather than pattern-matched against the raw URL, so these read the same thing a
browser would.
*/
function attributes(dataUrl: string): string {
  const inner = dataUrl.replace(/^url\(data:image\/svg\+xml;charset=UTF-8,/, '')
  return decodeURIComponent(inner.replace(/\)$/, ''))
}

test('REGRESSION: stroke attributes are baked in kebab-case, not camelCase', () => {
  // The icons proxy styles strokes inline via CSS vars, which is exactly the input that
  // reaches the `[style]` normalisation loop.
  const markup = attributes(svg2DataUrl(icons.tosi()))

  expect(markup).toContain('stroke-width')
  expect(markup).toContain('stroke-linecap')
  expect(markup).toContain('stroke-linejoin')

  // camelCase names are not SVG attributes; emitting them is the bug, and it is invisible
  // because the icon still renders — just wrong.
  expect(markup).not.toContain('strokeWidth')
  expect(markup).not.toContain('strokeLinecap')
  expect(markup).not.toContain('strokeLinejoin')
})

test('no `style` attribute survives serialization', () => {
  // The whole reason the attributes are baked: inline style referencing `var(--tosi-icon-*)`
  // resolves to nothing inside a data URL.
  const markup = attributes(svg2DataUrl(icons.tosi()))
  expect(markup).not.toContain('style=')
  expect(markup).not.toContain('var(--')
})

test('REGRESSION: explicit arguments beat the baked-in style', () => {
  /*
  The second half of #68, which the issue's suggested fix would have made worse. The
  `[style]` normalisation used to run AFTER these arguments were applied and overwrote them
  — `stroke: '#f00'` came out `#000000`. `stroke-width` escaped only because the style loop
  wrote it under a camelCase name that SVG ignores, so renaming alone would have broken the
  one path that worked.
  */
  const markup = attributes(svg2DataUrl(icons.tosi(), '#0f0', '#f00', 4))
  expect(markup).toContain('stroke="#f00"')
  expect(markup).toContain('fill="#0f0"')
  expect(markup).toContain('stroke-width="4"')
  // Nothing keeps the baked width — the override is total, not partial.
  expect(markup).not.toContain('stroke-width="2"')
  expect(markup).not.toContain('stroke="#000000"')
})

test('without explicit arguments the icon keeps its own styling', () => {
  // The baked style is the baseline, not something the arguments are required to supply.
  const markup = attributes(svg2DataUrl(icons.tosi()))
  // `2`, not `2px` — the CSSOM normalises the unit away before it is baked.
  expect(markup).toContain('stroke-width="2"')
  expect(markup).toContain('stroke-linecap="round"')
})

test('the result is a usable css url() with an svg payload', () => {
  const url = svg2DataUrl(icons.tosi())
  expect(url.startsWith('url(data:image/svg+xml;charset=UTF-8,')).toBe(true)
  expect(url.endsWith(')')).toBe(true)
  expect(attributes(url)).toContain('<svg')
})
