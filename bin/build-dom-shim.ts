/*
Minimal DOM globals so tosijs can be imported in a build (no-DOM) context.

tosijs defines `class Component extends HTMLElement` and calls `.elementCreator()`
(which touches `window`/`customElements`) at module load, so importing it under bun
throws without a DOM. The build only needs tosijs's pure helpers (css, Color, vars)
to serialize the doc-system stylesheet — it never renders a component — so a
lightweight happy-dom registration is enough.

Only DOM constructors/globals are copied; bun/node built-ins (fetch, URL,
URLSearchParams, etc.) are deliberately left untouched so other build steps keep
their native implementations. Import this BEFORE any tosijs import.
*/

import { Window } from 'happy-dom'

const window = new Window()
const g = globalThis as any

// happy-dom internals reference window.SyntaxError etc.
for (const name of ['SyntaxError', 'TypeError', 'RangeError'] as const) {
  if ((window as any)[name] === undefined) (window as any)[name] = g[name]
}

const domGlobals = [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'HTMLSpanElement',
  'HTMLDivElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'HTMLAnchorElement',
  'HTMLImageElement',
  'HTMLTableElement',
  'HTMLTemplateElement',
  'HTMLProgressElement',
  'HTMLDialogElement',
  'HTMLLabelElement',
  'HTMLSelectElement',
  'HTMLOptionElement',
  'HTMLTextAreaElement',
  'Element',
  'Node',
  'Text',
  'DocumentFragment',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'InputEvent',
  'FocusEvent',
  'MutationObserver',
  'ResizeObserver',
  'IntersectionObserver',
  'CSSStyleDeclaration',
  'SVGElement',
  'SVGSVGElement',
  'DOMParser',
  'XMLSerializer',
  'NodeList',
  'HTMLCollection',
]

for (const prop of domGlobals) {
  const value = (window as unknown as Record<string, unknown>)[prop]
  if (value !== undefined && g[prop] === undefined) g[prop] = value
}

if (g.getComputedStyle === undefined) {
  g.getComputedStyle = window.getComputedStyle.bind(window)
}
if (g.requestAnimationFrame === undefined) {
  g.requestAnimationFrame = window.requestAnimationFrame.bind(window)
}
