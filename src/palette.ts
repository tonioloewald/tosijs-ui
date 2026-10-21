/*#
# palette

`<tosi-palette>` looks like a small search field. Click it (or press its shortcut) and it
opens a centred modal: a query field on top, ranked results below, and the keys to drive it
along the bottom. It is the "command palette" pattern, for search, navigation, or anything else
you can turn a query into a list of things to pick.

Results come from **sources**: functions from the query to a list of results, or a promise of
one. A slow source shows a spinner and never holds up the fast ones; one that takes longer than
`timeout` milliseconds (10 seconds by default) is abandoned and says so. Each keystroke aborts
the previous search's sources through the `signal` they are given.

Rows can be different kinds of thing: a result's `kind` picks a **renderer** for it, and any
kind without one gets the default row (an icon, the title with the query highlighted, a
one-line description and a path). Results are ranked by `score` and grouped by `group`; set
`rank` to order them yourself. With nothing typed, `quickLinks` are listed instead.

Choosing a result fires `action` (with the result as `event.detail`) and calls the result's own
`action`, then closes the palette, unless that `action` returns `false`.

```js
import { tosiPalette, postNotification } from 'tosijs-ui'

const fruit = ['Apple', 'Apricot', 'Banana', 'Blackberry', 'Cherry', 'Grape', 'Mango', 'Orange']

const palette = tosiPalette({
  placeholder: 'Search fruit and colours',
  shortcut: 'mod+k',
  quickLinks: [
    { title: 'Apple', description: 'A quick link, shown before you type', icon: 'star' },
    { title: 'Cherry', icon: 'star' },
  ],
  sources: [
    // a plain function: answers at once
    (query) =>
      fruit
        .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
        .map((name) => ({
          title: name,
          description: `${name} is a fruit`,
          path: `fruit/${name.toLowerCase()}`,
          icon: 'heart',
          group: 'Fruit',
          score: name.toLowerCase().startsWith(query.toLowerCase()) ? 2 : 1,
        })),
    // an async function: the palette shows a spinner until it answers
    async (query, { signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      if (signal.aborted) return []
      return ['red', 'green', 'blue']
        .filter((colour) => colour.includes(query.toLowerCase()))
        .map((colour) => ({
          title: colour,
          kind: 'colour',
          group: 'Colours (slow source)',
          colour,
        }))
    },
  ],
  // a renderer for one kind of row
  renderers: {
    colour: (result) => {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:center;gap:8px'
      const swatch = document.createElement('span')
      swatch.style.cssText = `width:16px;height:16px;border-radius:4px;background:${result.colour}`
      row.append(swatch, result.title)
      return row
    },
  },
})
palette.addEventListener('action', (event) => {
  postNotification({ message: `You chose ${event.detail.title}`, duration: 2 })
})
preview.append(palette)
```
```test
test('opens a centred modal, ranks results and closes on a choice', async () => {
  const palette = preview.querySelector('tosi-palette')
  palette.open()
  const dialog = palette.querySelector('dialog')
  expect(dialog.open).toBe(true)
  palette.search('ap')
  const titles = [...palette.querySelectorAll('[role="option"]')].map((o) => o.textContent)
  expect(titles[0]).toContain('Apple')
  expect(titles.some((t) => t.includes('Grape'))).toBe(true)
  palette.close()
  expect(dialog.open).toBe(false)
})
```

## Properties

- `placeholder` — the hint in the field, and in the trigger.
- `shortcut` — a key that opens it from anywhere on the page, such as `mod+k` (`mod` is ⌘ on a
  Mac and Ctrl elsewhere). Empty by default: a page decides whether it wants a global shortcut.
- `multiline` — the query is a growing text box: Enter chooses, Shift+Enter starts a new line,
  and ↑/↓ move through results only from the first or last line. For a prompt rather than a
  search.
- `timeout` — milliseconds before a slow source is abandoned (default 10000).
- `sources`, `renderers`, `rank`, `quickLinks` — described above.
- `value` — the query.

- `trigger` — what shows on the page: `field` (default) the search-field pill, which shrinks
  to its icon when it has less than `compactWidth` pixels (160); `icon`, always just the icon;
  `none`, nothing at all, for a palette opened from code or its `shortcut`.

`open()`, `close()` and `search(query)` drive it from code, so any button can open it. Pressing Enter with no result
chosen fires `action` with `{ query }` as its detail, so a multiline prompt can be submitted.

```typescript
interface PaletteResult {
  title: string
  description?: string
  path?: string
  icon?: string | Element // an icon name, or an element
  kind?: string           // picks a renderer
  group?: string
  score?: number          // higher first
  action?: (result: PaletteResult, palette: TosiPalette) => void | boolean
}
```
*/

/*{ "parent": "Components" }*/

import {
  elements,
  vars,
  varDefault,
  ElementCreator,
  XinStyleSheet,
  withAttributes,
} from 'tosijs'
import { icons } from './icons.js'
import { findHighestZ } from './track-drag.js'

const { button, span, kbd, div, dialog, input, textarea, mark } = elements

export interface PaletteResult {
  title: string
  description?: string
  path?: string
  icon?: string | Element
  kind?: string
  group?: string
  score?: number
  action?: (result: PaletteResult, palette: TosiPalette) => void | boolean
  [key: string]: any
}

export type PaletteSource = (
  query: string,
  context: { signal: AbortSignal; palette: TosiPalette }
) =>
  | PaletteResult[]
  | null
  | undefined
  | Promise<PaletteResult[] | null | undefined>

export type PaletteRenderer = (result: PaletteResult, query: string) => Element

const isMac = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** Does this keydown match a shortcut such as `mod+k` or `ctrl+shift+p`? */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: string
): boolean {
  const parts = shortcut
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
  const key = parts.pop()
  if (!key || event.key.toLowerCase() !== key) return false
  const want = new Set(parts)
  const mod = want.has('mod')
  const meta = want.has('meta') || (mod && isMac())
  const ctrl = want.has('ctrl') || (mod && !isMac())
  return (
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.shiftKey === want.has('shift') &&
    event.altKey === want.has('alt')
  )
}

/** The shortcut as a person reads it: `mod+k` is ⌘K on a Mac, Ctrl K elsewhere. */
export function describeShortcut(shortcut: string): string {
  const mac = isMac()
  return shortcut
    .split('+')
    .map((p) => {
      const part = p.trim().toLowerCase()
      if (part === 'mod') return mac ? '⌘' : 'Ctrl'
      if (part === 'meta') return '⌘'
      if (part === 'ctrl') return mac ? '⌃' : 'Ctrl'
      if (part === 'shift') return mac ? '⇧' : 'Shift'
      if (part === 'alt') return mac ? '⌥' : 'Alt'
      return part.length === 1 ? part.toUpperCase() : part
    })
    .join(mac ? '' : ' ')
}

/** `text` with every occurrence of the query's words wrapped in <mark>, as nodes (no HTML). */
export function highlight(text: string, query: string): Node[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!tokens.length) return [document.createTextNode(text)]
  // split() with a capture group alternates text, match, text…: odd indices are matches.
  // Decide that BEFORE dropping empty pieces, or the parity shifts.
  return text
    .split(new RegExp(`(${tokens.join('|')})`, 'gi'))
    .map((part, i) =>
      part === ''
        ? null
        : i % 2 === 1
        ? mark(part)
        : document.createTextNode(part)
    )
    .filter((node) => node !== null) as Node[]
}

/** Group by `group`, groups in the order of their best result, best first within each. */
export function rankResults(results: PaletteResult[]): PaletteResult[] {
  const sorted = results
    .map((result, i) => ({ result, i }))
    .sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0) || a.i - b.i)
    .map(({ result }) => result)
  const groups = new Map<string, PaletteResult[]>()
  for (const result of sorted) {
    const key = result.group ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(result)
  }
  return [...groups.values()].flat()
}

const iconFor = (icon: string | Element | undefined): Element | null => {
  if (icon instanceof Element) return icon
  if (!icon) return null
  const make = (icons as any)[icon]
  return typeof make === 'function' ? make() : null
}

/** The row a result gets when its kind has no renderer of its own. */
export function defaultPaletteRow(
  result: PaletteResult,
  query: string
): Element {
  return div(
    { class: 'palette-row' },
    span({ class: 'palette-icon' }, iconFor(result.icon) ?? ''),
    div(
      { class: 'palette-text' },
      div({ class: 'palette-title' }, ...highlight(result.title, query)),
      result.description
        ? div({ class: 'palette-description' }, result.description)
        : '',
      result.path ? div({ class: 'palette-path' }, result.path) : ''
    )
  )
}

export class TosiPalette extends withAttributes({
  placeholder: 'Search',
  shortcut: '',
  multiline: false,
  timeout: 10000,
  quickLinksCaption: 'Quick links',
  trigger: 'field',
  compactWidth: 160,
  emptyCaption: 'No results',
}) {
  static preferredTagName = 'tosi-palette'

  static lightStyleSpec: XinStyleSheet = {
    ':host': {
      display: 'inline-flex',
    },
    ':host > .palette-trigger': {
      display: 'flex',
      alignItems: 'center',
      gap: vars.spacing50,
      width: '100%',
      font: 'inherit',
      color: varDefault.paletteTriggerColor('#0008'),
      background: varDefault.inputBg('#fff'),
      border: 'none',
      borderRadius: varDefault.searchFieldRadius(vars.spacing50),
      boxShadow: varDefault.inputBorderShadow('inset 0 0 2px #0006'),
      padding: `${vars.spacing25} ${vars.spacing50}`,
      cursor: 'pointer',
      textAlign: 'left',
    },
    // `trigger="icon"`, or a field squeezed narrower than `compactWidth`: just the icon.
    ':host.-icon > .palette-trigger': {
      justifyContent: 'center',
      width: 'auto',
      marginLeft: 'auto',
      background: 'transparent',
      boxShadow: 'none',
      color: 'inherit',
      padding: vars.spacing25,
    },
    ':host.-icon > .palette-trigger > .palette-trigger-label, :host.-icon > .palette-trigger > kbd':
      {
        display: 'none',
      },
    // `trigger="none"`: opened only from code or its shortcut. The host stays rendered, because
    // a modal <dialog> inside a display:none ancestor is not shown even in the top layer.
    ':host.-no-trigger > .palette-trigger': {
      display: 'none',
    },
    ':host > .palette-trigger > .palette-trigger-label': {
      flex: '1 1 auto',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    ':host kbd, :host > dialog kbd': {
      lineHeight: 'normal',
      alignSelf: 'center',
      font: 'inherit',
      fontSize: vars.fontSize75,
      padding: `0 ${vars.spacing25}`,
      borderRadius: vars.spacing25,
      boxShadow: 'inset 0 0 0 1px #0003',
      whiteSpace: 'nowrap',
    },
    ':host > dialog': {
      _paletteBg: varDefault.background('#fff'),
      _paletteColor: varDefault.textColor('#222'),
      _paletteAccent: varDefault.brandColor('#0064d2'),
      // A tint of the accent, so the active row follows the theme (pink on the doc site).
      _paletteActiveBg: `color-mix(in srgb, ${vars.paletteAccent} 12%, transparent)`,
      width: 'min(40em, calc(100vw - 32px))',
      maxHeight: 'min(36em, calc(100vh - 64px))',
      marginTop: '10vh',
      padding: 0,
      border: 'none',
      borderRadius: vars.spacing,
      background: vars.paletteBg,
      color: vars.paletteColor,
      boxShadow: '0 10px 40px #0005',
      overflow: 'hidden',
      flexDirection: 'column',
    },
    ':host > dialog[open]': {
      display: 'flex',
    },
    ':host > dialog::backdrop': {
      background: '#0004',
      backdropFilter: 'blur(2px)',
    },
    ':host > dialog .palette-header': {
      display: 'flex',
      alignItems: 'flex-start',
      gap: vars.spacing50,
      padding: vars.spacing,
      boxShadow: '0 1px 0 #0002',
      background: 'transparent',
      color: 'inherit',
    },
    ':host > dialog .palette-header > svg, :host > dialog .palette-header .palette-spinner':
      {
        flex: '0 0 auto',
        marginTop: vars.spacing25,
        opacity: 0.6,
      },
    ':host > dialog .palette-input': {
      flex: '1 1 auto',
      font: 'inherit',
      fontSize: vars.fontSize125,
      color: 'inherit',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      padding: 0,
      resize: 'none',
      boxShadow: 'none',
      borderRadius: 0,
      lineHeight: 1.4,
      maxHeight: '8em',
    },
    ':host > dialog .palette-clear': {
      flex: '0 0 auto',
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      padding: vars.spacing25,
      cursor: 'pointer',
      color: 'inherit',
      opacity: 0.6,
    },
    ':host > dialog .palette-list': {
      flex: '1 1 auto',
      overflowY: 'auto',
      padding: vars.spacing50,
      overscrollBehavior: 'contain',
    },
    ':host > dialog .palette-group': {
      padding: `${vars.spacing50} ${vars.spacing}`,
      fontSize: vars.fontSize90,
      opacity: 0.6,
    },
    ':host > dialog .palette-status': {
      padding: vars.spacing,
      opacity: 0.6,
    },
    ':host > dialog [role="option"]': {
      padding: `${vars.spacing50} ${vars.spacing}`,
      borderRadius: vars.spacing50,
      cursor: 'pointer',
      background: 'transparent',
      color: 'inherit',
    },
    ':host > dialog [role="option"].-active': {
      background: vars.paletteActiveBg,
    },
    ':host > dialog .palette-row': {
      display: 'flex',
      alignItems: 'center',
      gap: vars.spacing,
      minWidth: 0,
    },
    ':host > dialog .palette-icon': {
      flex: '0 0 auto',
      display: 'flex',
      opacity: 0.6,
    },
    ':host > dialog [role="option"].-active .palette-icon': {
      color: vars.paletteAccent,
      opacity: 1,
    },
    ':host > dialog .palette-text': {
      flex: '1 1 auto',
      minWidth: 0,
    },
    ':host > dialog .palette-title': {
      fontWeight: 600,
    },
    ':host > dialog .palette-title mark': {
      background: 'transparent',
      color: 'inherit',
      textDecoration: 'underline',
    },
    ':host > dialog .palette-description, :host > dialog .palette-path': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    ':host > dialog .palette-path': {
      fontSize: vars.fontSize90,
      opacity: 0.6,
    },
    ':host > dialog [role="option"].-active .palette-path': {
      color: vars.paletteAccent,
      opacity: 1,
    },
    ':host > dialog .palette-footer': {
      display: 'flex',
      alignItems: 'center',
      gap: vars.spacing50,
      padding: `${vars.spacing50} ${vars.spacing}`,
      fontSize: vars.fontSize90,
      boxShadow: '0 -1px 0 #0002',
    },
    ':host > dialog .palette-footer .elastic': {
      flex: '1 1 auto',
    },
    '@keyframes tosi-palette-spin': {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    ':host > dialog .palette-spinner': {
      display: 'inline-flex',
      animation: 'tosi-palette-spin 1s linear infinite',
    },
    ':host > dialog .palette-spinner[hidden]': {
      display: 'none',
    },
  }

  sources: PaletteSource[] = []
  renderers: Record<string, PaletteRenderer> = {}
  rank: ((results: PaletteResult[], query: string) => PaletteResult[]) | null =
    null
  quickLinks: PaletteResult[] = []
  value = ''

  /** What is listed now, in order. */
  results: PaletteResult[] = []
  private active = -1
  private searching: AbortController | null = null
  private generation = 0
  private pending = 0
  private problems: string[] = []
  private dialogElement: HTMLDialogElement | null = null
  private listElement: HTMLElement | null = null
  private spinner: HTMLElement | null = null
  private field: HTMLInputElement | HTMLTextAreaElement | null = null
  private listId = `tosi-palette-${Math.random().toString(36).slice(2, 8)}`

  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this.shortcut || !matchesShortcut(event, this.shortcut)) return
    event.preventDefault()
    if (this.dialogElement?.open) this.close()
    else this.open()
  }

  private onFieldInput = (): void => {
    this.grow()
    this.search(this.field!.value)
  }

  private onFieldKeydown = (event: KeyboardEvent): void => {
    const field = this.field!
    const atStart = field.selectionStart === 0 && field.selectionEnd === 0
    const atEnd = field.selectionStart === field.value.length
    const multiline = field instanceof HTMLTextAreaElement
    switch (event.key) {
      case 'ArrowDown':
        if (multiline && !atEnd && field.value.includes('\n')) return
        event.preventDefault()
        this.moveActive(1)
        break
      case 'ArrowUp':
        if (multiline && !atStart && field.value.includes('\n')) return
        event.preventDefault()
        this.moveActive(-1)
        break
      case 'Enter':
        if (event.shiftKey && multiline) return
        if (event.isComposing) return
        event.preventDefault()
        if (this.results[this.active]) this.choose(this.results[this.active])
        else this.submit()
        break
    }
  }

  private onListPointer = (event: Event): void => {
    const option = (event.target as Element).closest('[role="option"]')
    if (!option) return
    const index = Number((option as HTMLElement).dataset.index)
    if (event.type === 'click') this.choose(this.results[index])
    else if (index !== this.active) this.setActive(index)
  }

  private onDialogClick = (event: MouseEvent): void => {
    // A click on the backdrop lands on the <dialog> itself.
    if (event.target === this.dialogElement) this.close()
  }

  private onCancel = (event: Event): void => {
    event.preventDefault()
    this.close()
  }

  private clearField = (): void => {
    this.field!.value = ''
    this.grow()
    this.search('')
    this.field!.focus()
  }

  content = () => [
    button(
      {
        class: 'palette-trigger',
        part: 'trigger',
        type: 'button',
        ariaHaspopup: 'dialog',
        // Named from the start, not first at render(): a trigger with no name is a button a
        // screen reader announces as just "button".
        ariaLabel: this.placeholder,
        onClick: () => this.open(),
      },
      icons.search(),
      span({ class: 'palette-trigger-label', part: 'label' }, this.placeholder),
      kbd({ part: 'shortcut', hidden: true })
    ),
    dialog(
      {
        part: 'dialog',
        ariaLabel: 'Search',
        onCancel: this.onCancel,
        onClick: this.onDialogClick,
      },
      div(
        { class: 'palette-header' },
        icons.search(),
        span({ class: 'palette-spinner', hidden: true }, icons.loader()),
        div({ class: 'palette-field', style: { display: 'contents' } }),
        button(
          {
            class: 'palette-clear',
            type: 'button',
            title: 'Clear',
            ariaLabel: 'Clear',
            onClick: this.clearField,
          },
          icons.x()
        )
      ),
      div({
        class: 'palette-list',
        role: 'listbox',
        id: this.listId,
        onClick: this.onListPointer,
        onMousemove: this.onListPointer,
      }),
      div(
        { class: 'palette-footer' },
        kbd('↑'),
        kbd('↓'),
        span('Navigate'),
        kbd('↵'),
        span('Select'),
        span({ class: 'elastic' }),
        span('Close'),
        kbd('Esc')
      )
    ),
  ]

  /*
  A field trigger shrinks to its icon when the room it is given drops below `compactWidth`. The
  host's width comes from its container (give it a flex basis and `min-width`), not from its
  content: if hiding the label shrank the host, it would never grow back.
  */
  private resizeObserver: ResizeObserver | null = null
  private compact = false
  private onResize = (): void => {
    const compact = this.clientWidth < Number(this.compactWidth)
    if (compact !== this.compact) {
      this.compact = compact
      this.render()
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.onDocumentKeydown)
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(this.onResize)
      this.resizeObserver.observe(this)
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.onDocumentKeydown)
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  /** The query field: a text box when `multiline`, re-made when that changes. */
  private ensureField(): HTMLInputElement | HTMLTextAreaElement {
    const wantArea = Boolean(this.multiline)
    if (this.field && this.field instanceof HTMLTextAreaElement === wantArea)
      return this.field
    const props = {
      class: 'palette-input',
      part: 'input',
      role: 'combobox',
      autocomplete: 'off',
      spellcheck: false,
      ariaAutocomplete: 'list',
      ariaControls: this.listId,
      ariaExpanded: 'true',
      ariaLabel: this.placeholder,
      onInput: this.onFieldInput,
      onKeydown: this.onFieldKeydown,
    }
    const field = wantArea
      ? textarea({ ...props, rows: 1 })
      : input({ ...props, type: 'text' })
    if (this.field) this.field.replaceWith(field)
    else this.querySelector('.palette-field')!.append(field)
    field.value = this.value
    this.field = field
    return field
  }

  private grow(): void {
    const field = this.field
    if (!(field instanceof HTMLTextAreaElement)) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }

  open(): void {
    this.dialogElement = this.querySelector('dialog')
    this.listElement = this.querySelector('.palette-list')
    this.spinner = this.querySelector('.palette-spinner')
    const field = this.ensureField()
    field.placeholder = this.placeholder
    if (!this.dialogElement!.open) {
      this.style.zIndex = String(findHighestZ())
      this.dialogElement!.showModal()
    }
    field.focus()
    field.select()
    this.grow()
    this.search(field.value)
  }

  close(): void {
    this.searching?.abort()
    if (this.dialogElement?.open) this.dialogElement.close()
    this.querySelector<HTMLElement>('.palette-trigger')?.focus()
  }

  /** Run every source for `query`, listing results as each answers. */
  search(query: string): void {
    if (this.field && this.field.value !== query) this.field.value = query
    this.value = query
    this.searching?.abort()
    const controller = new AbortController()
    this.searching = controller
    const generation = ++this.generation
    this.problems = []
    this.active = -1
    const collected: PaletteResult[][] = this.sources.map(() => [])
    if (query.trim() === '') {
      this.pending = 0
      this.show(
        this.quickLinks.map((link) => ({
          ...link,
          group: link.group ?? this.quickLinksCaption,
        })),
        query
      )
      return
    }
    const update = () => {
      if (generation !== this.generation) return
      const all = collected.flat()
      this.show(this.rank ? this.rank(all, query) : rankResults(all), query)
    }
    this.pending = 0
    const timeoutMs = Number(this.timeout) || 10000
    this.sources.forEach((source, i) => {
      let answer: ReturnType<PaletteSource>
      try {
        answer = source(query, { signal: controller.signal, palette: this })
      } catch (error) {
        this.problems.push(String((error as Error).message ?? error))
        return
      }
      if (!(answer instanceof Promise)) {
        collected[i] = answer ?? []
        return
      }
      this.pending++
      let timer: ReturnType<typeof setTimeout> | undefined
      const timedOut = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), timeoutMs)
      })
      Promise.race([answer, timedOut])
        .then((result) => {
          if (generation !== this.generation) return
          if (result === 'timeout') {
            this.problems.push('A source took too long and was skipped')
          } else {
            collected[i] = result ?? []
          }
        })
        .catch((error) => {
          if (generation !== this.generation || controller.signal.aborted)
            return
          this.problems.push(String(error?.message ?? error))
        })
        .finally(() => {
          clearTimeout(timer)
          if (generation !== this.generation) return
          this.pending--
          update()
        })
    })
    update()
  }

  /** List `results`, keeping the first one active. */
  private show(results: PaletteResult[], query: string): void {
    this.results = results
    const list = this.listElement ?? this.querySelector('.palette-list')
    if (!list) return
    if (this.spinner) this.spinner.hidden = this.pending === 0
    const rows: Element[] = []
    let group: string | undefined
    results.forEach((result, index) => {
      if (
        (result.group ?? '') !== (group ?? '') ||
        (index === 0 && result.group)
      ) {
        group = result.group
        if (group)
          rows.push(
            div({ class: 'palette-group', role: 'presentation' }, group)
          )
      }
      const render =
        (result.kind && this.renderers[result.kind]) || defaultPaletteRow
      rows.push(
        div(
          {
            role: 'option',
            id: `${this.listId}-${index}`,
            ariaSelected: 'false',
            'data-index': String(index),
          },
          render(result, query)
        )
      )
    })
    if (
      !results.length &&
      query.trim() &&
      this.pending === 0 &&
      !this.problems.length
    ) {
      rows.push(div({ class: 'palette-status' }, this.emptyCaption))
    }
    for (const problem of this.problems)
      rows.push(div({ class: 'palette-status' }, problem))
    list.replaceChildren(...rows)
    this.setActive(results.length ? 0 : -1)
  }

  private setActive(index: number): void {
    const list = this.listElement
    if (!list) return
    list.querySelector('[role="option"].-active')?.classList.remove('-active')
    list
      .querySelectorAll('[role="option"][aria-selected="true"]')
      .forEach((option) => option.setAttribute('aria-selected', 'false'))
    this.active = index
    const option =
      index >= 0 ? list.querySelector(`#${this.listId}-${index}`) : null
    if (option) {
      option.classList.add('-active')
      option.setAttribute('aria-selected', 'true')
      option.scrollIntoView({ block: 'nearest' })
      this.field?.setAttribute('aria-activedescendant', option.id)
    } else {
      this.field?.removeAttribute('aria-activedescendant')
    }
  }

  private moveActive(step: number): void {
    if (!this.results.length) return
    const count = this.results.length
    this.setActive((this.active + step + count) % count)
  }

  /** Act on a result: the `action` event, then its own action, then close (unless it said not to). */
  choose(result: PaletteResult): void {
    if (!result) return
    this.dispatchEvent(
      new CustomEvent('action', { detail: result, bubbles: true })
    )
    const keepOpen = result.action?.(result, this) === false
    if (!keepOpen) this.close()
  }

  /** Enter with nothing chosen: hand the query itself to whoever listens. */
  private submit(): void {
    this.dispatchEvent(
      new CustomEvent('action', {
        detail: { query: this.value },
        bubbles: true,
      })
    )
  }

  render(): void {
    super.render()
    this.classList.toggle(
      '-icon',
      this.trigger === 'icon' || (this.trigger === 'field' && this.compact)
    )
    this.classList.toggle('-no-trigger', this.trigger === 'none')
    const label = this.querySelector<HTMLElement>('.palette-trigger-label')
    if (label) label.textContent = this.placeholder
    const hint = this.querySelector<HTMLElement>('.palette-trigger > kbd')
    if (hint) {
      hint.hidden = !this.shortcut
      hint.textContent = this.shortcut ? describeShortcut(this.shortcut) : ''
    }
    const trigger = this.querySelector<HTMLElement>('.palette-trigger')
    trigger?.setAttribute(
      'aria-label',
      this.shortcut
        ? `${this.placeholder} (${describeShortcut(this.shortcut)})`
        : this.placeholder
    )
    if (this.dialogElement?.open) this.ensureField()
  }
}

export const tosiPalette =
  TosiPalette.elementCreator() as ElementCreator<TosiPalette>
