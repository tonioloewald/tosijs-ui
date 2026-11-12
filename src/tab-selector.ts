/*#
# tabs

`<tosi-tabs>` creates a `tabpanel` for its children, creating a `tab` for each based on its
`name` attribute.

```js
[...preview.querySelectorAll('div[name]')].forEach(div => {
  div.style.color = `hsl(${(Math.random() * 360).toFixed(0)} 50% 50%)`
})

import { div, button } from 'tosijs'.elements
const tabSelector = preview.querySelector('tosi-tabs')

tabSelector.handleCloseTab = body => {
  if (!confirm(`Are you sure you want to close the ${body.getAttribute('name')} tab?`)) {
    return false
  }
}

let bodycount = 0
preview.querySelector('.add').addEventListener('click', () => {
  const name = `new tab ${++bodycount}`
  const body = div(
    {name, dataClose: true},
    name,
  )
  tabSelector.addTabBody(body, true)
})
```
```html
<tosi-tabs>
  <div name="first">first body</div>
  <div name="second" data-close>
    <template role="tab">
      <tosi-icon
        style="
          display: inline-block;
          width: 16px;
          height: 16px;
          transform: translateY(2px);
          margin-right: 4px;
          stroke: var(--brand-color);
        "
        icon="eye"
      ></tosi-icon>
      <span>Ooooh!!!</span>
    </template>
    look at the html…
  </div>
  <div name="third">third body</div>
  <button class="add" slot="after-tabs" title="add a tab">
    <tosi-icon icon="plus"></tosi-icon>
  </button>
</tosi-tabs>
```
```css
  .preview tosi-tabs {
    height: 100%;
  }

  .preview div[name] {
    padding: 20px;
    text-align: center;
    height: 100%;
    font-size: 200%;
  }

  .preview .add {
    width: 38px;
    line-height: 38px;
    height: 38px;
    padding: 0;
  }
```

The `<tosi-tabs>`s `value` is the index of its active body.

A `<tosi-tabs>` has `addTabBody(body: HTMLElement, select?: boolean)` and
`removeTabBody(body: number | HTMLElement)` methods for updating its content.

You can also just insert or remove tab bodies directly and call `setupTabs()`.

## Controls beside the tabs

Anything with `slot="after-tabs"` (the add button above) sits at the end of the tab row. When
there are more tabs than fit, the tab names scroll (a swipe, a trackpad, or the mouse wheel over
them) and the controls stay where they are. Selecting a tab scrolls it into view.

## Closeable Tabs

Adding the `data-close` attribute to a tab will make it closeable.

When a tab is closed, the `<tosi-tabs>` element's `handleCloseTab: (tabBody: Element) => boolean | undefined | void`
will be called (the old `onCloseTab` name still works but is deprecated). If you set this and return `false`, the tab will
not be closed (e.g. if you want to implement save/cancel behavior).

## Custom Tab Content

You can specify the exact content of the tab for a given body by
adding a `<template role="tab">` to that body. The contents of that
template will be cloned into the tab.

## Localized Support

```html
<tosi-tabs localized>
  <div name="localize"><h2>localize!</h2></div>
  <div name="tabs"><h2>tabs</h2></div>
</tosi-tabs>
```

`<tosi-tabs>` supports the `localized` attribute. It will automatically localize
tab names (but it won't override custom tab content, so localizing that is on you).

## Tab Tooltips

Add `data-tooltip` to a tab body and it will be shown on its tab button
(requires `initTooltips()`).

```js
import { initTooltips } from 'tosijs-ui'

initTooltips()
```
```html
<tosi-tabs>
  <div name="Overview" data-tooltip="Project summary and status">Overview content</div>
  <div name="Details" data-tooltip="Configuration and **advanced** settings">Details content</div>
  <div name="Log" data-tooltip="Recent activity and events">Log content</div>
</tosi-tabs>
```
```css
.preview tosi-tabs {
  height: 100%;
}
.preview div[name] {
  padding: 20px;
  text-align: center;
}
```
*/

/*{ "parent": "Components", "headTitle": "<tosi-tabs> tab panel — tosijs-ui", "description": "<tosi-tabs> builds a tab panel from its children's name attributes, with closeable tabs and methods to add or remove tabs." }*/

import {
  ElementCreator,
  elements,
  vars,
  PartsMap,
  withAttributes,
} from 'tosijs'

import { tosiLocalized, TosiLocalized } from './localize.js'
import { chainDuration, chainEasing } from './theme-chain.js'

import { x as xIcon } from './icons/x.js'

const { div, slot, span } = elements

type TabCloseHandler = (tabBody: Element) => boolean | undefined | void

interface TabsParts extends PartsMap {
  tabs: HTMLElement
  selected: HTMLElement
}

export class TosiTabs extends withAttributes({
  localized: false,
}) {
  static preferredTagName = 'tosi-tabs'

  value = 0

  makeTab(tabs: TosiTabs, tabBody: HTMLElement, _bodyId: string): HTMLElement {
    const tabName = tabBody.getAttribute('name') as string
    const tabContent =
      (
        tabBody.querySelector('template[role="tab"]') as HTMLTemplateElement
      )?.content.cloneNode(true) ||
      (this.localized ? tosiLocalized(tabName) : span(tabName))
    const tab = div(
      tabContent,
      {
        part: 'tab',
        tabindex: 0,
        role: 'tab',
      },
      /*
      A tab may hold no control of its own (#3572), so the close button is for the pointer
      only: Delete or Backspace closes the focused tab from the keyboard (keyTab).
      */
      tabBody.hasAttribute('data-close')
        ? span(
            {
              title: 'close',
              class: 'close',
              ariaHidden: 'true',
            },
            xIcon()
          )
        : {}
    )
    /*
    The panel is in the light DOM and the tab in the shadow root, where an id cannot reach, so
    `aria-controls="<id>"` named nothing. Element reflection crosses the boundary.
    */
    if ('ariaControlsElements' in tab) {
      ;(tab as any).ariaControlsElements = [tabBody]
    }
    const tooltip = tabBody.dataset.tooltip
    if (tooltip) {
      tab.dataset.tooltip = tooltip
    }
    return tab
  }

  static shadowStyleSpec = {
    ':host': {
      // New --tosi-tabs-* variables with legacy fallbacks
      '--tosi-tabs-selected-color':
        'var(--xin-tabs-selected-color, var(--tosi-accent, currentColor))',
      '--tosi-tabs-bar-color': 'var(--xin-tabs-bar-color, #ccc)',
      '--tosi-tabs-bar-height': 'var(--xin-tabs-bar-height, 2px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'none !important',
    },
    slot: {
      position: 'relative',
      display: 'block',
      flex: '1',
      overflow: 'hidden',
      overflowY: 'auto',
    },
    'slot[name="after-tabs"]': {
      flex: '0 0 auto',
    },
    '::slotted([hidden])': {
      display: 'none !important',
    },
    ':host::part(tabpanel)': {
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'auto',
    },
    ':host::part(tabrow)': {
      display: 'flex',
    },
    // The tab names scroll when there are more than fit; the after-tabs controls stay put.
    ':host .tabs': {
      display: 'flex',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      minWidth: '0',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    },
    ':host .tabs::-webkit-scrollbar': {
      display: 'none',
    },
    ':host .tabs > div': {
      padding: `${vars.spacing50} ${vars.spacing}`,
      cursor: 'default',
      display: 'flex',
      alignItems: 'baseline',
    },
    ':host .tabs > [aria-selected]': {
      '--text-color': vars.tosiTabsSelectedColor,
      color: vars.textColor,
    },
    ':host .elastic': {
      flex: '1',
    },
    ':host .border': {
      background: vars.tosiTabsBarColor,
    },
    ':host .border > .selected': {
      content: ' ',
      width: 0,
      height: vars.tosiTabsBarHeight,
      background: vars.tosiTabsSelectedColor,
      transition: `${chainDuration()} ${chainEasing}`,
    },
    ':host .close': {
      border: 0,
      background: 'transparent',
      textAlign: 'center',
      // A 24px target (WCAG 2.5.8) around a 12px glyph, taking no more room than the glyph.
      padding: '6px',
      margin: `-6px -6px -6px calc(${vars.spacing50} - 6px)`,
      lineHeight: '0',
      cursor: 'pointer',
    },
    ':host .close > svg': {
      height: '12px',
    },
  }

  handleCloseTab: TabCloseHandler | null = null

  /**
   * @deprecated Use `handleCloseTab`. The `on<Event>` prefix is reserved for the
   * elements-factory event-handler sugar (`tosiTabs({ onCloseTab })` would attach a
   * dead `closetab` listener instead of setting the callback), and tosijs warns when a
   * component defines such a property. This alias keeps existing `el.onCloseTab = fn`
   * code working; migrate to `handleCloseTab`.
   */
  get onCloseTab(): TabCloseHandler | null {
    return this.handleCloseTab
  }
  set onCloseTab(handler: TabCloseHandler | null) {
    this.handleCloseTab = handler
  }

  content = [
    div(
      { part: 'tabpanel' },
      div(
        { part: 'tabrow' },
        div({ class: 'tabs', part: 'tabs', role: 'tablist' }),
        div({ class: 'elastic' }),
        slot({ name: 'after-tabs' })
      ),
      div({ class: 'border' }, div({ class: 'selected', part: 'selected' }))
    ),
    slot(),
  ]

  addTabBody(body: HTMLElement, selectTab = false): void {
    if (!body.hasAttribute('name')) {
      console.error('element has no name attribute', body)
      throw new Error('element has no name attribute')
    }
    this.append(body)
    this.setupTabs()
    if (selectTab) {
      this.value = this.bodies.length - 1
    }
    this.queueRender()
  }

  removeTabBody(body: HTMLElement): void {
    body.remove()
    this.setupTabs()
    this.queueRender()
  }

  keyTab = (event: Event): void => {
    const { tabs } = this.parts
    const tabIndex = [...tabs.children].indexOf(event.target as HTMLElement)
    switch ((event as KeyboardEvent).key) {
      case 'ArrowLeft':
        this.value =
          (tabIndex + Number(tabs.children.length) - 1) % tabs.children.length
        ;(tabs.children[this.value] as HTMLElement).focus()
        event.preventDefault()
        break
      case 'ArrowRight':
        this.value = (tabIndex + 1) % tabs.children.length
        ;(tabs.children[this.value] as HTMLElement).focus()
        event.preventDefault()
        break
      case ' ':
        this.pickTab(event)
        event.preventDefault()
        break
      case 'Delete':
      case 'Backspace': {
        const body = this.bodies[tabIndex] as HTMLElement | undefined
        if (body?.hasAttribute('data-close')) {
          event.preventDefault()
          if (!this.handleCloseTab || this.handleCloseTab(body) !== false) {
            this.removeTabBody(body)
          }
        }
        break
      }
      default:
      // console.log(event.key)
    }
  }

  get bodies(): Element[] {
    return [...this.children].filter((elt) => elt.hasAttribute('name'))
  }

  pickTab = (event: Event): void => {
    const { tabs } = this.parts
    const target = event.target as HTMLElement
    const isCloseEvent = target.closest('.close') !== null
    const tab = target.closest('.tabs > div') as HTMLElement
    const tabIndex = [...tabs.children].indexOf(tab)
    if (isCloseEvent) {
      const body = this.bodies[tabIndex]
      if (!this.handleCloseTab || this.handleCloseTab(body) !== false) {
        this.removeTabBody(this.bodies[tabIndex] as HTMLElement)
      }
    } else {
      if (tabIndex > -1) {
        this.value = tabIndex
      }
    }
  }

  setupTabs = (): void => {
    const { tabs } = this.parts
    const tabBodies = [...this.children].filter(
      (child) => !child.hasAttribute('slot') && child.hasAttribute('name')
    )
    tabs.textContent = ''
    if (this.value >= tabBodies.length) {
      this.value = tabBodies.length - 1
    }
    for (const index in tabBodies) {
      const tabBody = tabBodies[index] as HTMLElement
      const bodyId = `${this.instanceId}-${index}`
      tabBody.id = bodyId
      if (!tabBody.hasAttribute('role'))
        tabBody.setAttribute('role', 'tabpanel')
      const tab = this.makeTab(this, tabBody, bodyId)
      tabs.append(tab)
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    const { tabs } = this.parts
    tabs.addEventListener('click', this.pickTab)
    tabs.addEventListener('keydown', this.keyTab)
    tabs.addEventListener('scroll', this.stripScrolled, { passive: true })
    tabs.addEventListener('wheel', this.wheelTabs, { passive: false })
    this.setupTabs()
    TosiLocalized.allInstances.add(this)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    TosiLocalized.allInstances.delete(this)
  }

  localeChanged = () => {
    this.queueRender()
  }

  handleResize(): void {
    this.queueRender()
  }

  render(): void {
    const { tabs, selected } = this.parts as TabsParts
    const tabBodies = this.bodies
    for (let i = 0; i < tabBodies.length; i++) {
      const tabBody = tabBodies[i]
      const tab = tabs.children[i] as HTMLElement
      const isSelected = this.value === Number(i)
      // "true" or absent: an empty aria-selected is not a valid value.
      if (isSelected) tab.setAttribute('aria-selected', 'true')
      else tab.removeAttribute('aria-selected')
      tabBody.toggleAttribute('hidden', !isSelected)
    }
    // A newly selected tab that is scrolled out of the strip is brought into it.
    const tab = tabs.children[this.value] as HTMLElement | undefined
    if (tab && this.value !== this.revealed) {
      this.revealed = this.value
      const left = tab.offsetLeft - tabs.offsetLeft
      if (left < tabs.scrollLeft) tabs.scrollLeft = left
      else if (left + tab.offsetWidth > tabs.scrollLeft + tabs.clientWidth)
        tabs.scrollLeft = left + tab.offsetWidth - tabs.clientWidth
    }
    // Changing tabs slides the underline; scrolling (stripScrolled) moves it with the names.
    selected.style.transition = ''
    this.placeUnderline()
  }

  private revealed = -1

  stripScrolled = (): void => {
    if (!this.hydrated) return
    ;(this.parts as TabsParts).selected.style.transition = 'none'
    this.placeUnderline()
  }

  /*
  The underline follows the selected tab as the strip scrolls, and is clipped to the strip: a tab
  scrolled half out shows half an underline, not one drawn under the after-tabs controls.
  */
  placeUnderline = (): void => {
    if (!this.hydrated) return
    const { tabs, selected } = this.parts as TabsParts
    const tab = tabs.children[this.value] as HTMLElement | undefined
    if (!tab) return
    const start = tab.offsetLeft - tabs.offsetLeft - tabs.scrollLeft
    // Clamped at both ends: a tab scrolled right out of view must not push a zero-width
    // underline past the strip (it would make the tab panel scroll sideways).
    const left = Math.min(tabs.clientWidth, Math.max(0, start))
    const right = Math.min(tabs.clientWidth, start + tab.offsetWidth)
    selected.style.marginLeft = `${left}px`
    selected.style.width = `${Math.max(0, right - left)}px`
  }

  // A mouse wheel scrolls vertically; over a strip that overflows, it scrolls the tab names.
  wheelTabs = (event: Event): void => {
    const { deltaX, deltaY } = event as WheelEvent
    const { tabs } = this.parts as TabsParts
    if (tabs.scrollWidth <= tabs.clientWidth || deltaX !== 0) return
    event.preventDefault()
    tabs.scrollLeft += deltaY
  }
}

/** @deprecated Use TosiTabs instead */
export type TabSelector = TosiTabs
/** @deprecated Use TosiTabs instead */
export const TabSelector: typeof TosiTabs = TosiTabs

export const tosiTabs = TosiTabs.elementCreator() as ElementCreator<TosiTabs>

/** @deprecated Use tosiTabs instead */
export const tabSelector = tosiTabs

/** @deprecated Use tosiTabs instead */
export const xinTabs = tosiTabs
