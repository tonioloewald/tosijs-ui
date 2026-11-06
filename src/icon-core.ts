/*
The icon renderer, with no icon data of its own: components import this and register the
icons they draw (see icon-store.ts). `icons.ts` is the public module, and adds the whole set.
*/
import {
  elements,
  svgElements,
  ElementCreator,
  ElementPart,
  XinStyleRule,
  Color,
  vars,
  varDefault,
  withAttributes,
} from 'tosijs'
import { SVGIconMap, IconCreator } from './icon-types.js'
import {
  iconData,
  defineUserIcons,
  allIconsRegistered,
  loadAllIcons,
  registerIcons,
} from './icon-store.js'
import { splitSuffixes, suffixNumber } from './icon-suffixes.js'
import {
  iconRules,
  spinRule,
  matchRule,
  drawable,
  suffixedIcon,
} from './icon-rules.js'
export { iconRules, type IconRule } from './icon-rules.js'

export const defineIcons = (newIcons: { [key: string]: string }): void => {
  const data = iconData as Record<string, string>
  const isNew = Object.keys(newIcons).filter((name) => !data[name])
  defineUserIcons(newIcons)
  /*
  A defined icon always wins over a composition rule that would produce the same name, but
  the author may not know the rule exists. Say so once, here, where the name was chosen, and
  only for a NEW name that reads as the rule's: `checkTestShadow`, not `checkbox` or `unlink`
  (a lowercase run is a word, not a prefix plus an icon, so icon packs stay quiet).
  Overriding a name that already existed, a built-in such as `unlock` or `checkCircle`
  included, is a deliberate choice of that name and never warns, so neither does defining a
  name a second time.
  */
  for (const name of isNew) {
    const readsAsRule = iconRules.some((rule) => {
      const matched = matchRule(rule, name)
      if (matched == null || !drawable(matched.baseName)) return false
      return (
        typeof rule.prefix !== 'string' ||
        name.includes(':') ||
        /[A-Z]/.test(name[rule.prefix.length])
      )
    })
    if (readsAsRule) {
      console.warn(
        `icon ${name} is also a composition rule's name; your definition wins`
      )
    }
  }
}

// The icon return type and the built-in name union, beside the value import people already
// write: `import { icons, type IconElement } from 'tosijs-ui/icons'` (#176). IconElement widened
// from SVGElement in 1.15, and with no importable name adopters had to restate the union.
export type {
  IconElement,
  IconName,
  SVGIconMap,
  IconCreator,
} from './icon-types.js'

export const svg2DataUrl = (
  icon: Element,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): string => {
  // Handle composite icons (span wrappers) by finding the inner SVG(s)
  const svgs =
    icon instanceof SVGElement
      ? [icon]
      : Array.from(icon.querySelectorAll('svg'))

  if (svgs.length > 1) {
    const name = (icon as HTMLElement).dataset?.icon || 'unknown'
    console.error(
      `svg2DataUrl: composite icon "${name}" cannot be serialized as a data URL, rendering base icon only`
    )
  }

  const svg = svgs[0]
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  /*
  Bake inline `style` into presentation ATTRIBUTES first, then let the explicit arguments
  overwrite them.

  A data-URL image is its own document, so the icons' `var(--tosi-icon-*)` styling resolves
  to nothing inside it — the values have to be written on as attributes to survive.

  Both halves of that were wrong (tosijs-ui#68):

  - the names were camelCase. SVG presentation attributes are kebab-case, so `strokeWidth`
    is not an attribute at all; the browser ignored it and fell back to UA defaults — 1px
    strokes and mitred corners where the icon asked for 2px and round. Easy to miss because
    the icon still renders, just wrong.
  - this loop ran AFTER the explicit `fill`/`stroke`/`strokeWidth` arguments were applied, so
    it clobbered them. `stroke: '#f00'` came out `#000000`. Renaming alone would have made
    that worse rather than better: `stroke-width` from the style would then have overwritten
    an explicit `strokeWidth` too, breaking the one path that was working.

  Hence the order: computed styling is the baseline, the caller's arguments win over it.
  */
  const styled = svg.querySelectorAll('[style]')
  svg.removeAttribute('style')
  for (const item of [...styled] as HTMLElement[]) {
    const s = item.style
    if (s.fill) item.setAttribute('fill', Color.fromCss(s.fill).html)
    if (s.stroke) item.setAttribute('stroke', Color.fromCss(s.stroke).html)
    if (s.strokeWidth) item.setAttribute('stroke-width', s.strokeWidth)
    if (s.strokeLinecap) item.setAttribute('stroke-linecap', s.strokeLinecap)
    if (s.strokeLinejoin) item.setAttribute('stroke-linejoin', s.strokeLinejoin)
    item.removeAttribute('style')
  }

  for (const path of svg.querySelectorAll(
    'path, polygon, line, circle, rect, ellipse, polyline'
  )) {
    if (fill !== undefined) path.setAttribute('fill', fill)
    if (stroke !== undefined) path.setAttribute('stroke', stroke)
    if (strokeWidth !== undefined)
      path.setAttribute('stroke-width', String(strokeWidth))
  }

  const text = encodeURIComponent(svg.outerHTML)
  return `url(data:image/svg+xml;charset=UTF-8,${text})`
}

// Appends _ to names ending in digits to prevent suffix ambiguity
const safeIconSuffix = (name: string): string =>
  /\d$/.test(name) ? name + '_' : name

/*
The rule list and how names match it live in icon-rules.ts, shared with iconSvg. Spin
animates, so its renderer is installed here.

The rotation is a CSS animation on an HTML span, never on the svg (board #3508). WebKit runs
an animated transform on an SVG element on the main thread, whichever API starts it, so a
loader froze exactly while the page was busy: the one time a loader is on screen. It was also
started with `el.animate()`, which lives in script rather than in the markup, so a clone of
the icon (a list template, `cloneNode`) stood still.

The spinning element is a `<tosi-icon-spin>`, which on connecting adds one shared stylesheet
to whatever root it lands in. A document-level `@keyframes` does not reach an icon in a shadow
root in Chromium or Firefox (measured), and icons are drawn inside shadow-DOM components. A
`<style>` carried inside each icon did reach, but its CSS became part of the `textContent` of
every button holding a spinner, which is what `toHaveText` and caption matching read.

The suffix transform (`spin90Loader40s_30x`) moves to a span OUTSIDE the rotation, so the
icon still spins about its own centre, as it did when the rotation was appended to that
transform, instead of orbiting the offset. Both are `align-self: flex-start` so they stay the
svg's size: stretched by a taller flex container, the rotation's centre left the svg's and
the icon orbited.

Speed and direction are custom properties on the element, so the animation is a rule and
`prefers-reduced-motion` can stop it, as it stops the live-example spinner. The rules are in
`:where()`, so any rule of an adopter's that names `tosi-icon-spin` overrides them.
*/
const SPIN_CSS =
  '@keyframes tosi-icon-spin{to{transform:rotate(360deg)}}' +
  ':where(tosi-icon-spin){animation:tosi-icon-spin var(--tosi-icon-spin-duration) linear ' +
  'infinite var(--tosi-icon-spin-direction)}' +
  '@media (prefers-reduced-motion:reduce){:where(tosi-icon-spin){animation:none}}'

const spinStyled = new WeakSet<Node>()
let spinSheet: CSSStyleSheet | undefined

function addSpinStyles(root: Node): void {
  if (spinStyled.has(root)) return
  // A document or a shadow root; a detached subtree's root is neither and gets styled on
  // connecting.
  const isDocument = root.nodeType === Node.DOCUMENT_NODE
  if (!isDocument && !(root as ShadowRoot).host) return
  const target = root as Document | ShadowRoot
  spinStyled.add(root)
  try {
    if (!spinSheet) {
      spinSheet = new CSSStyleSheet()
      spinSheet.replaceSync(SPIN_CSS)
    }
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, spinSheet]
  } catch {
    // No constructable stylesheets (Safari before 16.4): a <style> in the root, not the icon.
    const style = document.createElement('style')
    style.textContent = SPIN_CSS
    ;(isDocument ? (target as Document).head : target).append(style)
  }
}

class TosiIconSpin extends HTMLElement {
  connectedCallback(): void {
    addSpinStyles(this.getRootNode())
  }
}
if (globalThis.customElements && !customElements.get('tosi-icon-spin')) {
  customElements.define('tosi-icon-spin', TosiIconSpin)
}

const spinBox = { display: 'inline-flex', alignSelf: 'flex-start' }

spinRule.apply = (baseName, match, parts) => {
  const dps = (match as RegExpMatchArray)[1].replace('_', '-')
  const duration = 360 / Math.abs(parseFloat(dps))
  const direction = dps.startsWith('-') ? 'reverse' : 'normal'
  // Resolve baseName with suffixes intact — they apply to the icon
  const icon = resolveIcon(baseName, []) as HTMLElement
  const { transform, transformOrigin } = icon.style
  icon.style.transform = ''
  icon.style.transformOrigin = ''
  let spun = document.createElement('tosi-icon-spin')
  Object.assign(spun.style, spinBox)
  spun.style.setProperty('--tosi-icon-spin-duration', `${duration}s`)
  spun.style.setProperty('--tosi-icon-spin-direction', direction)
  spun.append(icon)
  if (transform) {
    spun = elements.span(
      { style: { ...spinBox, transform, transformOrigin } },
      spun
    )
  }
  return wrapIcon(baseName, parts, spun)
}

let iconIdCounter = 0

function makeIcon(spec: string, parts: ElementPart[]): SVGElement {
  const div = elements.div()
  div.innerHTML = spec
  const sourceSvg = div.querySelector('svg') as SVGElement

  // Uniquify IDs (clipPath, mask, gradient, etc.) to prevent collisions
  const idEls = sourceSvg.querySelectorAll('[id]')
  if (idEls.length > 0) {
    const idMap = new Map<string, string>()
    for (const el of idEls) {
      const oldId = el.id
      const newId = `tosi_svg_id_${++iconIdCounter}`
      idMap.set(oldId, newId)
      el.id = newId
    }
    // Update all url(#...) and href references
    const html = sourceSvg.innerHTML
    let updated = html
    for (const [oldId, newId] of idMap) {
      const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      updated = updated
        .replace(new RegExp(`url\\(#${escaped}\\)`, 'g'), `url(#${newId})`)
        .replace(new RegExp(`href="#${escaped}"`, 'g'), `href="#${newId}"`)
    }
    if (updated !== html) {
      sourceSvg.innerHTML = updated
    }
  }

  const classes = new Set(sourceSvg.classList)
  classes.add('tosi-icon')
  const svg = svgElements.svg(
    {
      class: Array.from(classes).join(' '),
      viewBox: sourceSvg.getAttribute('viewBox'),
    },
    ...parts,
    ...sourceSvg.children
  )
  svg.style.strokeWidth = varDefault.tosiIconStrokeWidth('2px')
  if (classes.has('stroked') && classes.has('filled')) {
    /*
    An outline in the ink over a knockout in the colour behind it, as tosijs-3d draws them.
    `filled` alone used to win here, which removed every stroke. A path that should stay
    open carries its own `fill="none"` from the generator (tosijs-ui#249).
    */
    svg.style.stroke = varDefault.tosiIconStroke('currentColor')
    svg.style.fill = varDefault.tosiIconKnockout(varDefault.tosiBg('#fafafa'))
  } else if (classes.has('filled')) {
    svg.style.stroke = 'none'
    svg.style.fill = 'currentColor'
  } else if (classes.has('stroked')) {
    svg.style.stroke = varDefault.tosiIconStroke('currentColor')
    // Honor an explicit fill (default none) so a stroked icon can also be
    // filled — the modern single-icon model (e.g. a star that's outlined when
    // empty and solid when active).
    svg.style.fill = varDefault.tosiIconFill('none')
  } else {
    svg.style.stroke = varDefault.tosiIconStroke('currentColor')
    svg.style.fill = varDefault.tosiIconFill('currentColor')
  }
  svg.style.height = varDefault.tosiIconSize('16px')
  return svg
}

/** Wrap icon elements in a composite container (for custom function rules) */
export function wrapIcon(
  prop: string,
  parts: ElementPart[],
  ...children: Element[]
): HTMLSpanElement {
  const wrapper = elements.span(
    {
      class: 'tosi-icon-composite',
      dataIcon: prop,
      style: {
        display: 'inline-flex',
        position: 'relative',
        pointerEvents: 'none',
      },
    },
    ...children
  )
  // Merge any style parts without clobbering the wrapper's own styles
  for (const part of parts) {
    if (part && typeof part === 'object' && !('nodeType' in (part as any))) {
      const props = part as Record<string, any>
      if (props.style && typeof props.style === 'object') {
        Object.assign(wrapper.style, props.style)
      }
      if (props.class) {
        wrapper.classList.add(...String(props.class).split(' '))
      }
    }
  }
  return wrapper
}

function composeIcon(prop: string, parts: ElementPart[]): Element | null {
  for (const rule of iconRules) {
    const matched = matchRule(rule, prop)
    // Only apply if baseName draws (an icon, or another rule: `un:check:square`), and the
    // rule shortened the name: a prefix that matched nothing is not applying to anything.
    if (
      !matched ||
      matched.baseName.length >= prop.length ||
      !drawable(matched.baseName)
    )
      continue
    const result = rule.apply(
      safeIconSuffix(matched.baseName),
      matched.match,
      parts
    )
    if (typeof result === 'string') return resolveIcon(result, parts)
    if (result) return result
  }
  return null
}

// Redirect names being resolved right now, so a redirect cycle ends instead of recursing.
const expanding = new Set<string>()

// The suffix grammar lives in icon-suffixes.ts, shared with iconSvg.
function parseStyleSuffixes(name: string): {
  baseName: string
  style: Partial<CSSStyleDeclaration>
} | null {
  const split = splitSuffixes(name)
  if (!split) return null
  const { baseName } = split
  const data = iconData as Record<string, string>
  // Accept if baseName is in iconData, or matches a composition rule prefix
  if (!data[baseName]) {
    if (!iconRules.some((rule) => matchRule(rule, baseName))) return null
  }

  const style: Partial<CSSStyleDeclaration> = {}
  const suffixes = split.tokens
  const transforms: string[] = []
  for (const s of suffixes) {
    const code = s[s.length - 1]
    if (code === 'F' || code === 'S') {
      const raw = s.slice(1, -1)
      const isHex = /^[0-9a-fA-F]{3,8}$/.test(raw)
      const value = isHex ? '#' + raw : (vars as any)[raw]
      if (code === 'F') {
        style.fill = value
      } else {
        style.stroke = value
      }
    } else if (code === 'W') {
      style.strokeWidth = s.slice(0, -1)
    } else {
      const val = suffixNumber(s)
      switch (code) {
        case 'o':
          style.opacity = String(val / 100)
          break
        case 's':
          transforms.push(`scale(${val / 100})`)
          break
        case 'x':
          transforms.push(`translateX(${val}%)`)
          break
        case 'y':
          transforms.push(`translateY(${val}%)`)
          break
        case 'r':
          transforms.push(`rotate(${val}deg)`)
          break
        case 'f':
          transforms.push(val === 0 ? 'scaleX(-1)' : 'scaleY(-1)')
          break
      }
    }
  }
  if (transforms.length > 0) {
    style.transform = transforms.join(' ')
    style.transformOrigin = '50% 50%'
  }
  return { baseName, style }
}

/** Resolve an icon name through the full pipeline (redirects, suffixes, rules, stacking) */
export function resolveIcon(prop: string, parts: ElementPart[]): Element {
  if (prop.endsWith('_')) prop = prop.slice(0, -1)
  const data = iconData as Record<string, string>
  // Direct match or redirect chain
  let name = prop
  const seen = new Set<string>()
  for (let spec = data[name]; spec; spec = data[name]) {
    if (spec.startsWith('<')) return makeIcon(spec, parts)
    seen.add(name)
    name = spec
    if (seen.has(name)) {
      console.warn(`icon ${prop} redirects in a cycle`)
      return makeIcon(iconData.square, parts)
    }
  }
  if (name !== prop) {
    /*
    A redirect's target goes through the WHOLE pipeline, stacking included. Handling rules
    and suffixes here and leaving `$` to the checks below tested `prop`, which has no `$`, so
    every named composite drew the placeholder (#224). `expanding` stops a redirect that
    names itself (`a: 'a$b'`) from recursing forever.
    */
    if (!expanding.has(prop)) {
      expanding.add(prop)
      try {
        const icon = resolveIcon(name, parts)
        // A named composite answers to its name, not to the composition it stands for.
        if (icon.classList.contains('tosi-icon-composite')) {
          ;(icon as HTMLElement).dataset.icon = prop
        }
        return icon
      } finally {
        expanding.delete(prop)
      }
    }
    console.warn(`icon ${prop} redirects in a cycle`)
    return makeIcon(iconData.square, parts)
  }

  // Stack: foo$bar$baz → baz on bottom, bar on top, foo on top
  if (prop.includes('$')) {
    const segments = prop.split('$')
    // Last segment is the base (sets the size), rest are overlays
    const base = resolveIcon(segments[segments.length - 1], [])
    const overlays = segments
      .slice(0, -1)
      .reverse()
      .map((name) => {
        const icon = resolveIcon(name, [])
        Object.assign((icon as HTMLElement).style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
        })
        return icon
      })
    return wrapIcon(prop, parts, base as Element, ...(overlays as Element[]))
  }

  // Suffixes on a registered icon win over a rule (suffixedIcon, #3295). A rule still
  // applies when its suffixes are on an icon only the rule makes (`spin90Loader50o`).
  const parsed = parseStyleSuffixes(prop)
  if (!suffixedIcon(prop)) {
    const composed = composeIcon(prop, parts)
    if (composed) return composed
  }
  if (parsed) {
    const icon = resolveIcon(parsed.baseName, parts)
    Object.assign((icon as HTMLElement).style, parsed.style)
    return icon
  }

  // Not registered here: it may be a built-in this page has not loaded yet.
  if (prop && !allIconsRegistered()) return lateIcon(prop, parts)

  if (prop) {
    // Inside a redirect, also name what the caller asked for: a typo in a defineIcons
    // target is otherwise reported under a name that appears nowhere in their code.
    const via =
      expanding.size > 0 ? ` (requested as ${[...expanding].join(' → ')})` : ''
    console.warn(`icon ${prop} does not exist${via}`)
  }
  return makeIcon(iconData.square, parts)
}

/*
A name that is not registered yet draws an empty icon of the same size, then the whole set
loads and the real icon takes its place. Resolving again after the load gives the usual
answer, so a name that does not exist still warns and still draws the placeholder square.
An icon that has left the document by then has nowhere to go and stays empty.
*/
function lateIcon(prop: string, parts: ElementPart[]): Element {
  const pending = makeIcon(
    '<svg class="tosi-icon-pending" viewBox="0 0 24 24"></svg>',
    []
  )
  loadAllIcons().then(() => pending.replaceWith(resolveIcon(prop, parts)))
  return pending
}

/*
The creator behind each generated `tosijs-ui/icons/<name>` module. It registers the icon when
the module loads, which an ES module does once however many importers it has, so two
components drawing the same icon share one copy and one registration, and a bundler drops
every icon nobody imports. A redirect's module imports its target's, so `chevronDown` brings
`chevronRight` with it and no importer has to know.
*/
export function iconCreator(name: string, spec: string): IconCreator {
  registerIcons({ [name]: spec })
  return ((...parts: ElementPart[]) =>
    resolveIcon(name, parts)) as unknown as IconCreator
}

export const icons = new Proxy(iconData, {
  get(target, prop: string): ElementCreator {
    return (...parts: ElementPart[]) => resolveIcon(prop, parts)
  },
}) as unknown as SVGIconMap

export class SvgIcon extends withAttributes({
  icon: '',
  size: 0,
  fill: '',
  stroke: '',
  strokeWidth: 1,
}) {
  static preferredTagName = 'tosi-icon'
  static lightStyleSpec = {
    ':host': {
      // New --tosi-icon-* variables with legacy fallbacks
      '--tosi-icon-size': 'var(--xin-icon-size, 16px)',
      '--tosi-icon-stroke-width':
        'var(--xin-icon-stroke-width, var(--icon-stroke-width, 2px))',
      '--tosi-icon-stroke-linejoin': 'var(--icon-stroke-linejoin, round)',
      '--tosi-icon-stroke-linecap': 'var(--icon-stroke-linecap, round)',
      '--tosi-icon-fill': 'var(--xin-icon-fill, var(--icon-fill, none))',
      display: 'inline-flex',
      verticalAlign: 'text-bottom',
      stroke: 'currentColor',
      strokeWidth: varDefault.tosiIconStrokeWidth('2px'),
      strokeLinejoin: varDefault.tosiIconStrokeLinejoin('round'),
      strokeLinecap: varDefault.tosiIconStrokeLinecap('round'),
      fill: varDefault.tosiIconFill('none'),
      height: vars.tosiIconSize,
    },
    ':host svg, :host .tosi-icon-composite': {
      height: varDefault.tosiIconSize('16px'),
    },
  }

  render(): void {
    super.render()
    this.textContent = ''
    const style: XinStyleRule = {}
    if (this.size) {
      style.height = this.size + 'px'
      this.style.setProperty('--tosi-icon-size', `${this.size}px`)
      // Legacy alias
      this.style.setProperty('--xin-icon-size', `${this.size}px`)
    }
    if (this.stroke) {
      style.stroke = this.stroke
      style.strokeWidth = this.strokeWidth
    }
    if (this.fill) {
      style.fill = this.fill
    }
    this.append(icons[this.icon]({ style }))
  }
}

export const svgIcon = SvgIcon.elementCreator()
