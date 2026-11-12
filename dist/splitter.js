/*#
# splitter

`<tosi-splitter>` goes between two items of a flex container and lets the reader divide the
space they share: drag it, or focus it and use the arrow keys. It works in a row or a column,
reads which from the container, and changes its cursor and orientation to match.

```html
<div class="split-row">
  <section>Left</section>
  <tosi-splitter aria-label="Resize the left pane"></tosi-splitter>
  <section>Right</section>
</div>
<div class="split-column">
  <section>Top</section>
  <tosi-splitter></tosi-splitter>
  <section>Bottom</section>
</div>
```
```css
.preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
}
.split-row, .split-column {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  box-shadow: inset 0 0 0 1px #8884;
}
.split-column {
  flex-direction: column;
}
.preview section {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  padding: 10px;
  overflow: auto;
}
```
```test
const { TosiSplitter } = tosijsui
const splitter = preview.querySelector('.split-row tosi-splitter')
test('a splitter in a row is a vertical separator', () => {
  expect(splitter instanceof TosiSplitter).toBe(true)
  expect(splitter.getAttribute('role')).toBe('separator')
  expect(splitter.getAttribute('aria-orientation')).toBe('vertical')
  expect(
    preview.querySelector('.split-column tosi-splitter').getAttribute('aria-orientation')
  ).toBe('horizontal')
})
test('the arrow keys move it, and it reports a value', () => {
  const left = splitter.previousElementSibling
  const before = left.getBoundingClientRect().width
  splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  const after = left.getBoundingClientRect().width
  expect(Math.round(after - before)).toBe(splitter.step)
  expect(splitter.value > 0.5).toBe(true)
})
```

## Behaviour

- **The space stays shared.** The splitter sets the two neighbours' `flex` to the ratio you
  chose (with a zero basis), not to fixed sizes, so when the container resizes they keep that
  ratio, and a container that switches between row and column keeps it too.
- **Neither side gets too small.** A neighbour never goes below `min-size` (44px by default, a
  comfortable touch target), or below its own `min-width` / `min-height` if that is larger, or
  above its `max-width` / `max-height`. That holds as the container resizes too: when it
  shrinks, the split gives way to keep both neighbours at their minimums, and when it grows
  again the split goes back to where you put it. (A container too small for both minimums
  cannot be helped; the splitter leaves it alone.)
- **Keyboard.** It is focusable (`role="separator"`, with `aria-valuenow` as the first
  neighbour's share in percent). The arrow keys move it by `step` pixels (16 by default; four
  times that with Shift), and Home and End move it as far as it goes each way. Up and Left move
  it towards the start, so Left moves it left even in a right-to-left row.
- **Double-click** puts the neighbours back to the sizes their own styles give them.
- **`value`** is the first neighbour's share of the space the two have, from 0 to 1. Set it to
  divide them in code. A `change` event fires when the reader finishes moving it.

Give it an `aria-label` that says what it resizes; it is "Resize" otherwise.

The neighbours are its previous and next element siblings, so it must sit directly between
them. If they hold content that cannot shrink, give them `min-width: 0` (or `min-height: 0`
in a column): a flex item's automatic minimum is its content's, and the browser will not go
below it whatever the splitter asks.

## Styling

| variable | default | |
| --- | --- | --- |
| `--tosi-splitter-size` | `6px` | the width of the handle (its height, in a column) |
| `--tosi-splitter-color` | `#8884` | the line drawn down its middle |
| `--tosi-splitter-active-color` | the accent | the line while hovered, focused or dragged |

<tosi-css-var-editor element-selector="tosi-splitter"></tosi-css-var-editor>
*/
/*{ "headTitle": "<tosi-splitter> resizable split — tosijs-ui", "parent": "Components", "description": "<tosi-splitter> divides the space between two flex items: drag it or use the keyboard, in a row or a column, respecting each side's minimum size." }*/
import { varDefault, withAttributes, } from 'tosijs';
import { chainDuration } from './theme-chain.js';
/**
 * The limits on the first neighbour's size when two items sharing `total` pixels must each
 * stay within their own minimum and maximum. When they cannot both be satisfied, the range
 * collapses to the current size rather than inventing one.
 */
export function splitLimits(current, total, first, second) {
    const min = Math.max(first.min, total - second.max);
    const max = Math.min(first.max, total - second.min);
    return min > max ? { total, min: current, max: current } : { total, min, max };
}
const px = (value, fallback) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
};
export class TosiSplitter extends withAttributes({
    /** the smallest either neighbour may become, in pixels */
    minSize: 44,
    /** how far an arrow key moves it, in pixels (Shift: four times as far) */
    step: 16,
}) {
    static preferredTagName = 'tosi-splitter';
    static lightStyleSpec = {
        ':host': {
            display: 'block',
            flex: '0 0 auto',
            alignSelf: 'stretch',
            position: 'relative',
            boxSizing: 'border-box',
            touchAction: 'none',
            userSelect: 'none',
            outline: 'none',
        },
        ':host[aria-orientation="vertical"]': {
            width: varDefault.tosiSplitterSize('6px'),
            cursor: 'col-resize',
        },
        ':host[aria-orientation="horizontal"]': {
            height: varDefault.tosiSplitterSize('6px'),
            cursor: 'row-resize',
        },
        // The line down the middle: drawn, not a border, so it never changes the handle's size.
        // Centred without a transform, so it lands on whole pixels the same way in both orientations.
        ':host::after': {
            content: '""',
            position: 'absolute',
            background: varDefault.tosiSplitterColor('#8884'),
            transition: `background ${chainDuration(0.15)}`,
        },
        ':host[aria-orientation="vertical"]::after': {
            top: 0,
            bottom: 0,
            left: 'calc(50% - 1px)',
            width: 2,
        },
        ':host[aria-orientation="horizontal"]::after': {
            left: 0,
            right: 0,
            top: 'calc(50% - 1px)',
            height: 2,
        },
        ':host:hover::after, :host:focus-visible::after, :host.-dragging::after': {
            background: varDefault.tosiSplitterActiveColor(varDefault.tosiAccent('#d92270')),
        },
        ':host:focus-visible': {
            boxShadow: varDefault.tosiFocusRing('0 0 0 2px #0064d2'),
        },
    };
    axis() {
        const parent = this.parentElement;
        if (!parent)
            return { horizontal: true, sign: 1 };
        const { flexDirection, direction } = getComputedStyle(parent);
        const horizontal = !flexDirection.startsWith('column');
        const reversed = flexDirection.endsWith('-reverse');
        const rtl = horizontal && direction === 'rtl';
        return { horizontal, sign: reversed !== rtl ? -1 : 1 };
    }
    neighbours() {
        const first = this.previousElementSibling;
        const second = this.nextElementSibling;
        return first && second ? [first, second] : null;
    }
    sizeOf(element, horizontal) {
        const box = element.getBoundingClientRect();
        return horizontal ? box.width : box.height;
    }
    bounds(element, horizontal) {
        const style = getComputedStyle(element);
        return {
            min: Math.max(this.minSize, px(horizontal ? style.minWidth : style.minHeight, 0)),
            max: px(horizontal ? style.maxWidth : style.maxHeight, Infinity),
        };
    }
    /** The first neighbour's current size and the limits it may move within. */
    measure() {
        const pair = this.neighbours();
        if (!pair)
            return null;
        const { horizontal } = this.axis();
        const [first, second] = pair;
        const a = this.sizeOf(first, horizontal);
        const total = a + this.sizeOf(second, horizontal);
        if (total <= 0)
            return null;
        const limits = splitLimits(a, total, this.bounds(first, horizontal), this.bounds(second, horizontal));
        return { pair, a, limits };
    }
    /*
    Divide the pair's space as `a` : `total - a` through flex-grow on a zero basis, so the ratio
    holds as the container resizes. The pair's combined grow is kept, so their share of the
    container against any other growing siblings stays what it was.
    */
    apply(pair, a, total) {
        const [first, second] = pair;
        const { horizontal } = this.axis();
        const grow = px(getComputedStyle(first).flexGrow, 0) +
            px(getComputedStyle(second).flexGrow, 0) || 1;
        /*
        On a zero basis an item's padding and border are still there, and only the space beyond
        them is divided by flex-grow. So the ratio is of the space each gets beyond its own
        padding and border, or a 16px step lands as 11.
        */
        const fixedA = this.padding(first, horizontal);
        const fixedB = this.padding(second, horizontal);
        const growA = Math.max(0, a - fixedA);
        const growB = Math.max(0, total - a - fixedB);
        const share = growA + growB > 0 ? growA / (growA + growB) : 0.5;
        first.style.flex = `${grow * share} 1 0px`;
        second.style.flex = `${grow * (1 - share)} 1 0px`;
        this.updateAria();
    }
    padding(element, horizontal) {
        const style = getComputedStyle(element);
        const sides = horizontal ? ['Left', 'Right'] : ['Top', 'Bottom'];
        return sides.reduce((sum, side) => sum +
            px(style[`padding${side}`], 0) +
            px(style[`border${side}Width`], 0), 0);
    }
    /*
    The share the reader chose, kept apart from the share it has now: when the container shrinks
    far enough that a neighbour would drop below its minimum, the split gives way, and when the
    container grows again it goes back to what was chosen.
    */
    chosen;
    moveTo(a, choose = true) {
        const measured = this.measure();
        if (!measured)
            return false;
        const { pair, limits } = measured;
        const next = Math.min(limits.max, Math.max(limits.min, a));
        if (choose)
            this.chosen = next / limits.total;
        if (Math.abs(next - measured.a) < 0.5)
            return false;
        this.apply(pair, next, limits.total);
        return true;
    }
    /*
    Re-fit the chosen share to the space there is now. When the two minimums no longer fit at all,
    splitLimits pins the current size and nothing moves: the container is simply too small.
    */
    refit = () => {
        if (this.chosen !== undefined) {
            const measured = this.measure();
            if (measured)
                this.moveTo(this.chosen * measured.limits.total, false);
        }
        this.updateAria();
    };
    /** The first neighbour's share of the space the two share, from 0 to 1. */
    get value() {
        const measured = this.measure();
        return measured ? measured.a / measured.limits.total : 0.5;
    }
    set value(share) {
        const measured = this.measure();
        if (!measured || !Number.isFinite(share))
            return;
        this.moveTo(Math.min(1, Math.max(0, share)) * measured.limits.total);
    }
    /** Put both neighbours back to the sizes their own styles give them. */
    reset = () => {
        const pair = this.neighbours();
        if (!pair)
            return;
        for (const element of pair)
            element.style.flex = '';
        this.chosen = undefined;
        this.updateAria();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    };
    updateAria = () => {
        const { horizontal } = this.axis();
        this.setAttribute('aria-orientation', horizontal ? 'vertical' : 'horizontal');
        const measured = this.measure();
        if (!measured)
            return;
        const { a, limits } = measured;
        const percent = (n) => String(Math.round((n / limits.total) * 100));
        this.setAttribute('aria-valuenow', percent(a));
        this.setAttribute('aria-valuemin', percent(limits.min));
        this.setAttribute('aria-valuemax', percent(limits.max));
        const first = this.previousElementSibling;
        if (first?.id)
            this.setAttribute('aria-controls', first.id);
    };
    handleKey = (event) => {
        const measured = this.measure();
        if (!measured)
            return;
        const { sign } = this.axis();
        const step = this.step * (event.shiftKey ? 4 : 1);
        let target;
        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                target = measured.a - step * sign;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                target = measured.a + step * sign;
                break;
            case 'Home':
                target = measured.limits.min;
                break;
            case 'End':
                target = measured.limits.max;
                break;
            default:
                return;
        }
        event.preventDefault();
        if (this.moveTo(target)) {
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };
    /*
    Pointer capture rather than a full-page overlay: every move goes to the splitter wherever the
    pointer is, over an iframe included (a live example's preview can be one), and the cursor
    stays the splitter's.
    */
    handlePointerDown = (event) => {
        if (event.button !== 0)
            return;
        const measured = this.measure();
        if (!measured)
            return;
        // No text selection while dragging; that also suppresses focus, so focus it ourselves.
        event.preventDefault();
        this.focus({ preventScroll: true });
        const { horizontal, sign } = this.axis();
        const start = horizontal ? event.clientX : event.clientY;
        const startSize = measured.a;
        let moved = false;
        this.setPointerCapture(event.pointerId);
        this.classList.add('-dragging');
        const move = (moveEvent) => {
            const at = horizontal ? moveEvent.clientX : moveEvent.clientY;
            if (this.moveTo(startSize + (at - start) * sign))
                moved = true;
        };
        const end = () => {
            this.removeEventListener('pointermove', move);
            this.removeEventListener('pointerup', end);
            this.removeEventListener('pointercancel', end);
            this.classList.remove('-dragging');
            if (moved)
                this.dispatchEvent(new Event('change', { bubbles: true }));
        };
        this.addEventListener('pointermove', move);
        this.addEventListener('pointerup', end);
        this.addEventListener('pointercancel', end);
    };
    // The container can switch between row and column (a media query, a class), so follow it.
    resizeObserver;
    connectedCallback() {
        super.connectedCallback();
        this.setAttribute('role', 'separator');
        if (!this.hasAttribute('tabindex'))
            this.tabIndex = 0;
        if (!this.hasAttribute('aria-label'))
            this.setAttribute('aria-label', 'Resize');
        this.addEventListener('pointerdown', this.handlePointerDown);
        this.addEventListener('keydown', this.handleKey);
        this.addEventListener('dblclick', this.reset);
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.refit);
            this.resizeObserver.observe(this);
            if (this.parentElement)
                this.resizeObserver.observe(this.parentElement);
        }
        this.updateAria();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('pointerdown', this.handlePointerDown);
        this.removeEventListener('keydown', this.handleKey);
        this.removeEventListener('dblclick', this.reset);
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
    }
    render() {
        super.render();
        this.updateAria();
    }
}
export const tosiSplitter = TosiSplitter.elementCreator();
