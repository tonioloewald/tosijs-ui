/*#
# affix

`<tosi-affix>` fixes a **fixture** — a toolbar, a badge, a caption — to one edge of its
**content**. Put the content in the default slot and the fixture in `slot="fixture"`:

```html
<div class="affix-demo">
  <tosi-affix position="en">
    <div class="affix-content">Content</div>
    <button slot="fixture" title="Edit"><tosi-icon icon="edit"></tosi-icon></button>
    <button slot="fixture" title="Copy"><tosi-icon icon="copy"></tosi-icon></button>
    <button slot="fixture" title="Delete"><tosi-icon icon="trash"></tosi-icon></button>
  </tosi-affix>

  <tosi-affix position="s">
    <div class="affix-content">Content</div>
    <span slot="fixture">a caption, centred below</span>
  </tosi-affix>

  <tosi-affix position="ne" inside>
    <div class="affix-content">Content</div>
    <button slot="fixture" title="Close"><tosi-icon icon="x"></tosi-icon></button>
  </tosi-affix>
</div>
```
```css
.preview .affix-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  align-items: flex-start;
}
.preview .affix-content {
  display: grid;
  place-items: center;
  width: 160px;
  height: 120px;
  background: #8882;
}
.preview .affix-demo button {
  border: 0;
  padding: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
```

An **outside** fixture (the default) is laid out, not floated: the affix is a three-by-three
grid with the content in the middle, and the fixture takes the cell on its edge. So it can
never cover the content, and an ancestor's `overflow: hidden` cannot clip it. An **inside**
fixture shares the content's cell and sits over it.

## Position

`position` uses the [`FloatPosition`](/pop-float/) vocabulary: the first letter is the
**edge**, the second the **alignment** along it.

| position | edge | aligned |
|---|---|---|
| `n` `s` `e` `w` | that edge | centred |
| `nw` `ne` | top | left / right |
| `sw` `se` | bottom | left / right |
| `en` `es` | right | top / bottom |
| `wn` `ws` | left | top / bottom |

The default is `nw`. Add `inside` to put the fixture inside the content's bounds.

## Fallback

A fixture that is longer than the edge it sits on does not fit there: a column of five
buttons beside a preview forty pixels tall. `fallback` names where it goes instead, with
`inside` if it should go inside (`fallback="s inside"`). It goes back as soon as it fits.

## Where it actually is

**Setting `position` or `inside` sets where you WANT the fixture; reading them tells you where
it IS** — the fallback, when the wanted place does not fit. Whenever that changes the affix
fires a `reposition` event, whose `detail` is `{ position, inside }`, and it reflects the
placement as the `placed` attribute (`placed="s inside"`) for styling.

```html
<tosi-affix class="affix-resizable" position="en" fallback="s inside">
  <div class="affix-content">Drag the corner to shrink me</div>
  <button slot="fixture" title="Edit"><tosi-icon icon="edit"></tosi-icon></button>
  <button slot="fixture" title="Copy"><tosi-icon icon="copy"></tosi-icon></button>
  <button slot="fixture" title="Cut"><tosi-icon icon="scissors"></tosi-icon></button>
  <button slot="fixture" title="Delete"><tosi-icon icon="trash"></tosi-icon></button>
</tosi-affix>
<p class="affix-readout"></p>
```
```css
.preview .affix-resizable .affix-content {
  display: grid;
  place-items: center;
  width: 240px;
  height: 160px;
  min-height: 40px;
  resize: vertical;
  overflow: hidden;
  background: #8882;
}
.preview .affix-resizable button {
  border: 0;
  padding: 4px;
  background: transparent;
  color: inherit;
}
```
```js
const affix = preview.querySelector('.affix-resizable')
const readout = preview.querySelector('.affix-readout')
const show = () => {
  readout.textContent = `position: ${affix.position}, inside: ${affix.inside}`
}
affix.addEventListener('reposition', show)
show()
```

## Styling

The fixture slot is a flex box — a column on a side edge, a row on the top or bottom — with
the theme's inset background, spacing, and its outer corners rounded, so a few buttons look
right with no work. Override it with these variables:

- `--tosi-affix-bg` (default `--tosi-bg-inset`)
- `--tosi-affix-gap` and `--tosi-affix-padding` (default `--tosi-spacing-xs`)
- `--tosi-affix-radius` (default `--tosi-border-radius`)

or restyle it entirely with `tosi-affix::part(fixture)`; the content's cell is
`::part(content)`. A fixture that is a single wrapper element can follow the axis with
`flex-direction: var(--tosi-affix-direction)`, which the affix sets to `column` or `row`.
*/

import { Component, ElementCreator, elements, PartsMap } from 'tosijs'

const { slot } = elements

export type AffixPosition =
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw'
  | 'en'
  | 'wn'
  | 'es'
  | 'ws'

export interface AffixPlacement {
  position: AffixPosition
  inside: boolean
}

const POSITIONS = new Set<string>([
  'n',
  's',
  'e',
  'w',
  'ne',
  'nw',
  'se',
  'sw',
  'en',
  'wn',
  'es',
  'ws',
])

const DEFAULT_POSITION: AffixPosition = 'nw'

/** `position` as written, or the default when it is not one. */
export function affixPosition(value: unknown): AffixPosition {
  const position = String(value ?? '')
    .trim()
    .toLowerCase()
  return POSITIONS.has(position)
    ? (position as AffixPosition)
    : DEFAULT_POSITION
}

/** `"s inside"` → `{position: 's', inside: true}`; '' → null (no fallback). */
export function parsePlacement(value: unknown): AffixPlacement | null {
  const words = String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return null
  return {
    position: affixPosition(words.find((w) => POSITIONS.has(w))),
    inside: words.includes('inside'),
  }
}

/** `{position: 's', inside: true}` → `"s inside"`. */
export const describePlacement = ({ position, inside }: AffixPlacement) =>
  inside ? `${position} inside` : position

type Track = 1 | 2 | 3
type Align = 'start' | 'center' | 'end'

/**
 * The grid cell and alignment for a placement. Outside, the fixture takes the cell on its
 * edge, hugging the content; inside, it shares the content's cell, against that edge.
 */
export function affixCell({ position, inside }: AffixPlacement) {
  const edge = position[0] as 'n' | 's' | 'e' | 'w'
  const side = edge === 'e' || edge === 'w'
  const along: Align =
    position.length === 1
      ? 'center'
      : position[1] === 'n' || position[1] === 'w'
      ? 'start'
      : 'end'
  const toward: Align = edge === 'n' || edge === 'w' ? 'start' : 'end'
  // outside, it faces the content: on the north edge it sits at the END of its cell
  const across: Align = inside ? toward : toward === 'start' ? 'end' : 'start'
  const outer: Track = toward === 'start' ? 1 : 3
  const row: Track = inside || side ? 2 : outer
  const column: Track = inside || !side ? 2 : outer
  return {
    row,
    column,
    alignSelf: side ? along : across,
    justifySelf: side ? across : along,
    direction: side ? 'column' : 'row',
    edge,
  }
}

const same = (a: AffixPlacement | null, b: AffixPlacement) =>
  a !== null && a.position === b.position && a.inside === b.inside

/** The corners away from the edge the fixture is fixed to, as a border-radius. */
function outerCorners(edge: string, inside: boolean, r: string): string {
  // top-left, top-right, bottom-right, bottom-left
  const away: Record<string, boolean[]> = {
    n: [true, true, false, false],
    s: [false, false, true, true],
    e: [false, true, true, false],
    w: [true, false, false, true],
  }
  // inside, the edge the fixture touches is the content's, so its free corners face inward
  const flip = { n: 's', s: 'n', e: 'w', w: 'e' } as Record<string, string>
  return away[inside ? flip[edge] : edge]
    .map((round) => (round ? r : '0'))
    .join(' ')
}

interface AffixParts extends PartsMap {
  content: HTMLSlotElement
  fixture: HTMLSlotElement
}

/*
`static initAttributes`, not `withAttributes()`: through `withAttributes`, a
`Component.computed()` attribute fails `tsc --declaration` with TS2742 (the marker type
cannot be named from outside tosijs), which is the build's declaration step.
*/
export class TosiAffix extends Component<AffixParts> {
  static initAttributes: Record<string, unknown> = {
    position: Component.computed(''),
    inside: Component.computed(false),
    fallback: '',
  }

  /** Where the fixture goes when the wanted place does not fit: `"s inside"`, or '' for nowhere. */
  declare fallback: string

  static preferredTagName = 'tosi-affix'

  static shadowStyleSpec = {
    ':host': {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
      gridTemplateRows: 'auto minmax(0, 1fr) auto',
      '--tosi-affix-direction': 'column',
    },
    // `:host { display }` beats the user agent's [hidden] rule, so restate it
    ':host([hidden])': {
      display: 'none',
    },
    ':host > [part="content"]': {
      display: 'block',
      gridArea: '2 / 2',
      minWidth: '0',
      minHeight: '0',
      // a positioned child of the content is placed against the content, not the fixture
      position: 'relative',
    },
    ':host > [part="fixture"]': {
      display: 'flex',
      flexDirection: 'var(--tosi-affix-direction)',
      alignItems: 'center',
      zIndex: '1',
      gap: 'var(--tosi-affix-gap, var(--tosi-spacing-xs, 4px))',
      padding: 'var(--tosi-affix-padding, var(--tosi-spacing-xs, 4px))',
      background: 'var(--tosi-affix-bg, var(--tosi-bg-inset, #8882))',
      color: 'var(--tosi-text, inherit)',
    },
    ':host > [part="fixture"][hidden]': {
      display: 'none',
    },
  }

  content = () => [
    slot({ part: 'content' }),
    slot({
      name: 'fixture',
      part: 'fixture',
      hidden: true,
    }),
  ]

  private _wanted: AffixPlacement = {
    position: DEFAULT_POSITION,
    inside: false,
  }
  private _placed: AffixPlacement | null = null
  /*
  How long the fixture was along the wanted edge, last time it was laid out there. Once it has
  fallen back it is laid out along a different axis and cannot be measured for the wanted edge,
  so this is what decides when it fits again.
  */
  private _wantedLength = 0
  private _observer: ResizeObserver | null = null

  /** Where the fixture is (set: where it should be). */
  get position(): AffixPosition {
    return (this._placed ?? this._wanted).position
  }
  set position(value: string) {
    this._wanted = { ...this._wanted, position: affixPosition(value) }
    this._wantedLength = 0
    this.place()
  }

  /** Whether the fixture is inside the content (set: whether it should be). */
  get inside(): boolean {
    return (this._placed ?? this._wanted).inside
  }
  set inside(value: boolean | string) {
    this._wanted = {
      ...this._wanted,
      inside: value !== false && value !== null && value !== 'false',
    }
    this._wantedLength = 0
    this.place()
  }

  /** Where the fixture should be, whatever fits. */
  get wanted(): AffixPlacement {
    return { ...this._wanted }
  }

  /** An empty fixture slot is hidden, so it takes no room and draws no background. */
  private syncEmpty(): void {
    const fixture = this.parts.fixture
    const empty = fixture
      .assignedNodes()
      .every(
        (node) =>
          node.nodeType !== Node.ELEMENT_NODE && !node.textContent?.trim()
      )
    if (fixture.hidden !== empty) {
      fixture.hidden = empty
      this._wantedLength = 0
    }
  }

  handleSlotChange = (): void => {
    this.syncEmpty()
    this.place()
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.parts.fixture.addEventListener('slotchange', this.handleSlotChange)
    this.parts.content.addEventListener('slotchange', this.observeContent)
    this._observer = new ResizeObserver(() => this.place())
    this._observer.observe(this)
    this._observer.observe(this.parts.fixture)
    this.observeContent()
  }

  /*
  Watch the content's own elements, not its slot. The slot is stretched to its grid cell, so it
  does not resize when the content does: a live example's preview is added after the affix
  is laid out, and the affix measured an empty cell, fell back, and never looked again.
  */
  private _observed = new Set<Element>()
  observeContent = (): void => {
    const observer = this._observer
    if (!observer) return
    const now = new Set(this.parts.content.assignedElements())
    for (const el of this._observed) if (!now.has(el)) observer.unobserve(el)
    for (const el of now) if (!this._observed.has(el)) observer.observe(el)
    this._observed = now
    this.place()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.parts.fixture.removeEventListener('slotchange', this.handleSlotChange)
    this.parts.content.removeEventListener('slotchange', this.observeContent)
    this._observer?.disconnect()
    this._observer = null
    this._observed.clear()
  }

  /** The fixture's and the content's lengths along `edge`, as laid out now. */
  private lengths(edge: string) {
    const side = edge === 'e' || edge === 'w'
    const fixture = this.parts.fixture.getBoundingClientRect()
    /*
    The content's own boxes, not its slot: the slot is stretched to its grid row, and an
    outside fixture on a side edge is in that row, so the slot is always at least as tall as
    the fixture and everything would "fit".
    */
    const boxes = this.parts.content
      .assignedElements()
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width || r.height)
    const content = boxes.length
      ? side
        ? Math.max(...boxes.map((r) => r.bottom)) -
          Math.min(...boxes.map((r) => r.top))
        : Math.max(...boxes.map((r) => r.right)) -
          Math.min(...boxes.map((r) => r.left))
      : 0
    return { fixture: side ? fixture.height : fixture.width, content }
  }

  /** Choose where the fixture goes, lay it out there, and announce a change. */
  place = (): void => {
    if (!this.hydrated) return
    this.syncEmpty()
    const wanted = this._wanted
    const fallback = parsePlacement(this.fallback)
    if (!fallback || this.parts.fixture.hidden || !this.isConnected) {
      this.layout(wanted)
      return
    }
    /*
    Measure the fixture where it is wanted whenever it is there, or has never been: lay it out
    there and read it back in the same task (a forced layout, never painted), rather than wait
    for the ResizeObserver to come round. WebKit sometimes delivered that observation before
    the first layout and never again, and the fixture stayed where it did not fit.
    */
    const edge = wanted.position[0]
    if (this._wantedLength === 0 || same(this._placed, wanted)) {
      this.apply(wanted)
      this._wantedLength = this.lengths(edge).fixture
    }
    // half a pixel of slack: lengths are fractional and a tie fits
    const fits = this._wantedLength <= this.lengths(edge).content + 0.5
    this.layout(fits ? wanted : fallback)
  }

  /** Lay the fixture out at `placement`, and announce it if that is a change. */
  private layout(placement: AffixPlacement) {
    this.apply(placement)
    if (same(this._placed, placement)) return
    this._placed = { ...placement }
    this.setAttribute('placed', describePlacement(placement))
    this.dispatchEvent(
      new CustomEvent('reposition', { detail: { ...placement } })
    )
  }

  private apply(placement: AffixPlacement) {
    const cell = affixCell(placement)
    Object.assign(this.parts.fixture.style, {
      gridArea: `${cell.row} / ${cell.column}`,
      alignSelf: cell.alignSelf,
      justifySelf: cell.justifySelf,
      borderRadius: outerCorners(
        cell.edge,
        placement.inside,
        'var(--tosi-affix-radius, var(--tosi-border-radius, 4px))'
      ),
    })
    this.style.setProperty('--tosi-affix-direction', cell.direction)
  }

  render(): void {
    super.render()
    this.place()
  }
}

export const tosiAffix = TosiAffix.elementCreator() as ElementCreator<TosiAffix>
