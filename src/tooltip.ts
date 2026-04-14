/*#
# tooltip

Automatic tooltips for any element with `data-tooltip` or `title` attributes.
Call `initTooltips()` once to activate. By default, `title` attributes are
converted to `data-tooltip` on hover so the browser's native tooltip is
replaced.

Tooltip text is parsed as **markdown** (if `marked` is available), so you
can use `*bold*`, `` `code` ``, links, etc.

```js
import { elements } from 'tosijs'
import { initTooltips } from 'tosijs-ui'

const { button, div } = elements

initTooltips()

preview.append(
  div(
    { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } },
    button({ dataTooltip: 'Save your work' }, 'Save'),
    button({ dataTooltip: '**Bold** and `code` work' }, 'Markdown'),
    button({ title: 'This was a title attribute' }, 'Title → Tooltip'),
  )
)
```

## Options

```
initTooltips({
  convertTitles: true,  // convert title attrs to data-tooltip (default true)
  delay: 250,           // ms before showing (default 250)
  localize: false,      // pass tooltip text through localize() (default false)
})
```
*/

import { elements, StyleSheet, varDefault } from 'tosijs'
import { marked } from 'marked'
import { popFloat, FloatPosition } from './pop-float'
import { TosiFloat } from './float'
import { localize } from './localize'

const { span } = elements

export interface TooltipOptions {
  convertTitles?: boolean
  delay?: number
  localize?: boolean
}

let tooltipFloat: TosiFloat | null = null
let showTimeout: ReturnType<typeof setTimeout> | null = null
let currentTarget: HTMLElement | null = null

const TOOLTIP_CLASS = 'tosi-tooltip'

StyleSheet('tosi-tooltip', {
  [`.${TOOLTIP_CLASS}`]: {
    pointerEvents: 'none',
    padding: varDefault.tosiTooltipPadding('4px 10px'),
    borderRadius: varDefault.tosiTooltipRadius('6px'),
    background: varDefault.tosiTooltipBg('#333'),
    color: varDefault.tosiTooltipColor('#fff'),
    fontSize: varDefault.tosiTooltipFontSize('13px'),
    lineHeight: '1.4',
    maxWidth: varDefault.tosiTooltipMaxWidth('280px'),
    whiteSpace: 'pre-line',
    boxShadow: '0 2px 8px #0003',
    position: 'relative',
  },
  [`.${TOOLTIP_CLASS} p`]: {
    margin: '0',
  },
  [`.${TOOLTIP_CLASS} code`]: {
    background: '#fff2',
    padding: '0 4px',
    borderRadius: '3px',
    fontSize: '0.9em',
  },
  [`.${TOOLTIP_CLASS} a`]: {
    color: 'inherit',
  },
  [`.${TOOLTIP_CLASS}::before`]: {
    content: '""',
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: 'inherit',
    transform: 'rotate(45deg)',
  },
  [`.${TOOLTIP_CLASS}.tt-s::before`]: {
    top: '-4px',
    left: 'var(--tosi-tooltip-arrow)',
  },
  [`.${TOOLTIP_CLASS}.tt-n::before`]: {
    bottom: '-4px',
    left: 'var(--tosi-tooltip-arrow)',
  },
  [`.${TOOLTIP_CLASS}.tt-e::before`]: {
    left: '-4px',
    top: 'var(--tosi-tooltip-arrow)',
  },
  [`.${TOOLTIP_CLASS}.tt-w::before`]: {
    right: '-4px',
    top: 'var(--tosi-tooltip-arrow)',
  },
})

function hideTooltip(): void {
  if (showTimeout !== null) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  if (tooltipFloat !== null) {
    tooltipFloat.remove()
    tooltipFloat = null
  }
  currentTarget = null
}

function arrowClass(position: FloatPosition): string {
  if (position.startsWith('s')) return 'tt-s'
  if (position.startsWith('n')) return 'tt-n'
  if (position.startsWith('e')) return 'tt-e'
  if (position.startsWith('w')) return 'tt-w'
  return 'tt-s'
}

function positionArrow(
  tooltipEl: HTMLElement,
  target: HTMLElement,
  position: FloatPosition
): void {
  const targetRect = target.getBoundingClientRect()
  const tipRect = tooltipEl.getBoundingClientRect()
  const targetCx = targetRect.left + targetRect.width * 0.5
  const targetCy = targetRect.top + targetRect.height * 0.5

  let offset: number
  if (position.startsWith('s') || position.startsWith('n')) {
    offset =
      Math.max(8, Math.min(tipRect.width - 8, targetCx - tipRect.left)) - 4
  } else {
    offset =
      Math.max(8, Math.min(tipRect.height - 8, targetCy - tipRect.top)) - 4
  }
  tooltipEl.style.setProperty('--tosi-tooltip-arrow', offset + 'px')
}

function renderText(text: string, useLocalize: boolean): HTMLElement {
  if (useLocalize) {
    text = localize(text)
  }
  const el = span({ class: TOOLTIP_CLASS })
  el.innerHTML = marked.parseInline(text) as string
  return el
}

function showTooltip(
  target: HTMLElement,
  text: string,
  useLocalize: boolean
): void {
  hideTooltip()
  currentTarget = target

  const { top, left, width } = target.getBoundingClientRect()
  const cx = left + width * 0.5
  const h = window.innerHeight
  const w = window.innerWidth
  const position: FloatPosition = ((top > h * 0.5 ? 'n' : 's') +
    (cx > w * 0.5 ? 'w' : 'e')) as FloatPosition

  const content = renderText(text, useLocalize)
  content.classList.add(arrowClass(position))

  tooltipFloat = popFloat({
    content,
    target,
    position,
    remainOnScroll: 'remove',
    remainOnResize: 'remove',
  })

  requestAnimationFrame(() => {
    if (tooltipFloat && currentTarget) {
      positionArrow(content, target, position)
    }
  })
}

function findTooltipTarget(event: Event): HTMLElement | null {
  for (const node of event.composedPath()) {
    if (node instanceof HTMLElement && node.dataset.tooltip) {
      return node
    }
  }
  return null
}

export function initTooltips(options: TooltipOptions = {}): void {
  const {
    convertTitles = true,
    delay = 250,
    localize: useLocalize = false,
  } = options

  document.addEventListener('pointermove', (event: PointerEvent) => {
    if (convertTitles) {
      for (const node of event.composedPath()) {
        if (node instanceof HTMLElement && node.title && !node.dataset.tooltip) {
          node.dataset.tooltip = node.title
          node.removeAttribute('title')
          break
        }
      }
    }

    const target = findTooltipTarget(event)

    if (target === currentTarget) return

    hideTooltip()

    if (!target) return
    const text = target.dataset.tooltip || null
    if (!text) return

    showTimeout = setTimeout(
      () => showTooltip(target, text, useLocalize),
      delay,
    )
  })

  document.addEventListener('pointerleave', hideTooltip)

  document.addEventListener('pointerdown', hideTooltip)
  document.addEventListener('keydown', hideTooltip)
  window.addEventListener('scroll', hideTooltip, true)
}
