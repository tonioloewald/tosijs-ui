/*
The icons a page can draw, by name: the one table the renderer (`icon-core.ts`), the rules
(`icon-rules.ts`) and the DOM-free markup (`icon-svg.ts`) all read. DOM-free.

It starts empty. A component registers the few icons it draws, so `tosiTag` carries an `x`
and not all 320 (#3885); `tosijs-ui/icons`, and so the root barrel, registers the whole set.
A name nobody registered loads the whole set on first use (`loadAllIcons`) and the renderer
redraws it, so nothing an app could draw before stops drawing: it can arrive a moment late,
on a page that imported only components that carry their own icons.

`defineIcons()` writes through `defineUserIcons`, and a built-in registered later never
replaces an icon an app defined, whichever order the modules happen to load in.
*/

export const iconData: Record<string, string> = {}

const defined = new Set<string>()
let complete = false
let loading: Promise<void> | undefined

/** Register built-in icons. An icon the app defined keeps its definition. */
export function registerIcons(icons: Record<string, string>): void {
  for (const name of Object.keys(icons)) {
    if (!defined.has(name)) iconData[name] = icons[name]
  }
}

/** Register the whole built-in set: every name is now answerable without loading. */
export function registerAllIcons(icons: Record<string, string>): void {
  registerIcons(icons)
  complete = true
}

/** An app's own icons (`defineIcons`), which win over built-ins of the same name. */
export function defineUserIcons(icons: Record<string, string>): void {
  for (const name of Object.keys(icons)) {
    defined.add(name)
    iconData[name] = icons[name]
  }
}

export const allIconsRegistered = (): boolean => complete

/** Load and register the whole built-in set, once. */
export function loadAllIcons(): Promise<void> {
  if (complete) return Promise.resolve()
  loading ??= import('./icons/data/index.js').then((m) =>
    registerAllIcons(m.default)
  )
  return loading
}
