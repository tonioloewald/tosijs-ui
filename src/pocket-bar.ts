/*#
# pocket bar

A **pocket toolbar**: a single icon at rest that expands into a bar of your controls
on hover or tap, then tucks away again. It's translucent until you touch it, so it
stays out of the way when pinned over content.

Whatever you put inside is the toolbar — they're your light-DOM children, so *any*
control works: buttons, a checkbox, a segmented control. The component only supplies
the handle, the reveal, and the positioning.

Hover (or focus, or tap) peeks it open; **click the handle to keep it open**, and
click the handle again — or anywhere outside — to dismiss it.

```html
<div class="pocket-demo">
  <tosi-pocket-bar direction="e">
    <button title="Cut"><tosi-icon icon="scissors"></tosi-icon></button>
    <button title="Copy"><tosi-icon icon="copy"></tosi-icon></button>
    <button title="Paste"><tosi-icon icon="clipboard"></tosi-icon></button>
  </tosi-pocket-bar>

  <tosi-pocket-bar direction="s">
    <button title="Bold"><tosi-icon icon="bold"></tosi-icon></button>
    <button title="Italic"><tosi-icon icon="italic"></tosi-icon></button>
    <button title="Underline"><tosi-icon icon="underline"></tosi-icon></button>
  </tosi-pocket-bar>

  <tosi-pocket-bar direction="w">
    <button title="Zoom in"><tosi-icon icon="zoomIn"></tosi-icon></button>
    <button title="Zoom out"><tosi-icon icon="zoomOut"></tosi-icon></button>
  </tosi-pocket-bar>

  <tosi-pocket-bar direction="n" icon="settings">
    <label title="Snap to grid"><input type="checkbox" checked /><tosi-icon icon="grid"></tosi-icon></label>
    <button title="Undo"><tosi-icon icon="cornerUpLeft"></tosi-icon></button>
    <button title="Redo"><tosi-icon icon="cornerUpRight"></tosi-icon></button>
  </tosi-pocket-bar>
</div>
```
```css
.preview .pocket-demo {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 260px;
  padding: 60px 20px;
}
.preview .pocket-demo tosi-pocket-bar button,
.preview .pocket-demo tosi-pocket-bar label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.preview .pocket-demo tosi-pocket-bar button:hover,
.preview .pocket-demo tosi-pocket-bar label:hover {
  background: #8882;
}
```

Each handle above hints its axis — `⋯` for the horizontal bars (`e`, `w`), `⋮` for the
vertical ones (`n`, `s`) — and the fourth uses an explicit `settings` icon. Hover any of
them to see the bar grow in its `direction`.

## Attributes

- `icon` — the handle icon (any icon name or [composition](icon-composition)). By
  default it hints the growth axis: `moreHorizontal` (⋯) for a horizontal bar,
  `moreVertical` (⋮) for a vertical one.
- `direction` — where the bar grows, using the `FloatPosition` vocabulary
  (`n | e | s | w | ne | nw | se | sw | en | wn | es | ws | side | auto`). `auto`
  (the default) grows a **horizontal** bar toward the nearer edge of the screen.
  `e` / `w` (and `en` / `es` / `wn` / `ws`) grow a horizontal bar; `n` / `s` (and
  `ne` / `nw` / `se` / `sw`) grow a **vertical** one. The bar is placed
  edge-contiguous with the handle via [positionFloat](popFloat).
- `open` — reflects the open state. Hover / focus / tap peek it open; clicking the
  handle keeps it open until you click the handle again or click outside.

The handle is slightly translucent at rest (`--tosi-pocket-opacity`, default `0.75`)
and opaque while open; it keeps a blurred glass chip (`--tosi-pocket-bg`, a translucent
tint of `--tosi-bg`, so it follows the theme) so it stays legible over busy content.

### Styling hooks

- `--tosi-pocket-opacity` — resting opacity of the whole widget (default `0.75`).
- `--tosi-pocket-bg` — the glass background (a translucent tint of `--tosi-bg`).
- `--tosi-pocket-handle-color` — colour of just the collapsed handle icon, independent
  of the bar's controls (e.g. to flag status on the handle alone). Default `inherit`.

Slotted `<button>`s and `<label>`s get flat icon-button styling by default. A
checkbox-as-icon — a `<label>` wrapping an `<input type=checkbox>` and an icon — greys
and desaturates until checked, so a toggle needs no extra CSS.
*/

/*{ "parent": "Components" }*/

import {
  Component as WebComponent,
  elements,
  ElementCreator,
  PartsMap,
  vars,
  varDefault,
} from 'tosijs'
import { svgIcon, SvgIcon } from './icons.js'
import { positionFloat, FloatPosition } from './pop-float.js'

const { button, div, slot } = elements

interface PocketBarParts extends PartsMap {
  handle: HTMLButtonElement
  handleIcon: SvgIcon
  bar: HTMLDivElement
}

export class TosiPocketBar extends WebComponent<PocketBarParts> {
  static preferredTagName = 'tosi-pocket-bar'

  static initAttributes = {
    icon: '',
    direction: 'auto',
    open: false,
  }

  // Whether the bar is *pinned* open by a click (vs. a transient hover/focus peek).
  private pinned = false

  // n/s grow a vertical bar; everything else (auto, e/w, side) is horizontal.
  private get vertical(): boolean {
    return /^[ns]/.test(this.direction)
  }

  // Default handle hints the growth axis: ⋮ for a vertical bar, ⋯ for a horizontal
  // one. An explicit `icon` always wins.
  private get resolvedIcon(): string {
    return this.icon || (this.vertical ? 'moreVertical' : 'moreHorizontal')
  }

  // `auto` → positionFloat's `side` mode: a horizontal bar toward the nearer screen
  // edge. Everything else is a FloatPosition passed straight through.
  private get floatPosition(): FloatPosition {
    return (
      this.direction === 'auto' ? 'side' : this.direction
    ) as FloatPosition
  }

  reposition = (): void => {
    if (!this.hydrated) return
    positionFloat(
      this.parts.bar,
      this.parts.handle,
      this.floatPosition,
      'remain',
      'remain'
    )
  }

  // Open is driven authoritatively in JS (not CSS :hover), so an explicit close —
  // clicking the handle again, or clicking outside — always wins over a lingering
  // hover. Otherwise a click-to-open bar could never be dismissed while the pointer
  // stayed over it.
  private setOpen(open: boolean): void {
    if (this.open !== open) this.open = open
    if (open) this.reposition()
  }

  private handlePointerEnter = (): void => this.setOpen(true)
  private handlePointerLeave = (): void => {
    if (!this.pinned) this.setOpen(false)
  }
  private handleFocusIn = (): void => this.setOpen(true)
  private handleFocusOut = (): void => {
    // Close once focus has left the whole component (unless pinned) — next frame,
    // after focus has landed on its new target.
    requestAnimationFrame(() => {
      if (!this.pinned && !this.matches(':focus-within')) this.setOpen(false)
    })
  }

  toggle = (event?: Event): void => {
    event?.preventDefault()
    this.pinned = !this.pinned
    this.setOpen(this.pinned)
  }

  // A pointer-down anywhere outside a pinned bar dismisses it (composedPath so it
  // works across the shadow boundary and the position:fixed bar).
  private handleOutsidePointer = (event: Event): void => {
    if (!this.pinned) return
    const path = event.composedPath()
    if (!path.includes(this) && !path.includes(this.parts.bar)) {
      this.pinned = false
      this.setOpen(false)
    }
  }

  private handleScrollResize = (): void => {
    if (this.open) this.reposition()
  }

  content = () => [
    button(
      {
        part: 'handle',
        class: 'no-drag',
        title: 'toolbar',
        'aria-label': 'toolbar',
        'aria-expanded': 'false',
        onClick: this.toggle,
      },
      svgIcon({ part: 'handleIcon', icon: this.resolvedIcon })
    ),
    div(
      {
        part: 'bar',
        role: 'toolbar',
        // Set at construction (render() keeps it in sync if `direction` changes).
        style: { flexDirection: this.vertical ? 'column' : 'row' },
      },
      slot()
    ),
  ]

  static shadowStyleSpec = {
    ':host': {
      display: 'inline-flex',
      position: 'relative',
      // Slightly translucent at rest so it stays out of the way, fully opaque when
      // open. The handle keeps a blurred glass chip even at rest (below), so it
      // stays legible over busy content instead of a bare, hard-to-see icon.
      opacity: varDefault.tosiPocketOpacity('0.75'),
      transition: 'opacity 0.15s ease-out',
    },
    ':host([open])': {
      opacity: '1',
    },
    ':host [part="handle"]': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: vars.spacing50,
      border: '0',
      margin: '0',
      cursor: 'pointer',
      // The handle's colour is independently settable (the bar's controls stay
      // neutral), so a consumer can e.g. flag status on just the collapsed icon.
      color: varDefault.tosiPocketHandleColor('inherit'),
      // A blurred "glass" chip tinted from --tosi-bg (theme-aware, light or dark).
      // The backdrop blur keeps the icon readable over any background.
      background: varDefault.tosiPocketBg(
        'color-mix(in srgb, var(--tosi-bg, #fff) 85%, transparent)'
      ),
      backdropFilter: 'blur(12px)',
      borderRadius: vars.spacing,
      transition: 'background 0.15s ease-out',
    },
    ':host [part="bar"]': {
      position: 'fixed',
      display: 'flex',
      gap: vars.spacing25,
      padding: vars.spacing25,
      background: varDefault.tosiPocketBg(
        'color-mix(in srgb, var(--tosi-bg, #fff) 82%, transparent)'
      ),
      backdropFilter: 'blur(12px)',
      borderRadius: vars.spacing,
      boxShadow: `0 ${vars.spacing25} ${vars.spacing} #0003`,
      // Hidden and inert at rest; revealed when open.
      opacity: '0',
      pointerEvents: 'none',
      transform: 'scale(0.9)',
      transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
    },
    ':host([open]) [part="bar"]': {
      opacity: '1',
      pointerEvents: 'auto',
      transform: 'scale(1)',
    },

    // Sensible defaults for slotted controls so a bar of icon-buttons needs no
    // extra CSS: flat icon-buttons with a subtle hover tint. A checkbox-as-icon
    // (label wrapping an <input type=checkbox> + an icon) greys and desaturates
    // until it's checked — the easy way to build a toggle. Consumers override any
    // of this from the light DOM (higher specificity) or hide the native checkbox.
    '::slotted(button), ::slotted(label)': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: vars.spacing25,
      padding: vars.spacing50,
      margin: '0',
      border: '0',
      background: 'transparent',
      color: 'inherit',
      font: 'inherit',
      cursor: 'pointer',
      borderRadius: vars.spacing25,
      transition: 'background 0.15s ease-out, opacity 0.15s, filter 0.15s',
    },
    '::slotted(button:hover), ::slotted(label:hover)': {
      background: 'color-mix(in srgb, currentColor 15%, transparent)',
    },
    '::slotted(label:has(input[type="checkbox"]:not(:checked)))': {
      opacity: '0.45',
      filter: 'grayscale(1)',
    },
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerenter', this.handlePointerEnter)
    this.addEventListener('pointerleave', this.handlePointerLeave)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('focusout', this.handleFocusOut)
    document.addEventListener('pointerdown', this.handleOutsidePointer, true)
    window.addEventListener('scroll', this.handleScrollResize, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', this.handleScrollResize, { passive: true })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('pointerdown', this.handleOutsidePointer, true)
    window.removeEventListener('scroll', this.handleScrollResize, true)
    window.removeEventListener('resize', this.handleScrollResize)
  }

  render(): void {
    super.render()
    this.parts.handleIcon.icon = this.resolvedIcon
    this.parts.bar.style.flexDirection = this.vertical ? 'column' : 'row'
    this.parts.handle.setAttribute('aria-expanded', String(!!this.open))
    this.reposition()
  }
}

export const tosiPocketBar =
  TosiPocketBar.elementCreator() as ElementCreator<TosiPocketBar>
