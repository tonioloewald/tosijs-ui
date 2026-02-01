/*#
# tabs

`<xin-tabs>` creates a `tabpanel` for its children, creating a `tab` for each based on its
`name` attribute.

```js
[...preview.querySelectorAll('div[name]')].forEach(div => {
  div.style.color = `hsl(${(Math.random() * 360).toFixed(0)} 50% 50%)`
})

import { div, button } from 'tosijs'.elements
const tabSelector = preview.querySelector('xin-tabs')

tabSelector.onCloseTab = body => {
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
<xin-tabs>
  <div name="first">first body</div>
  <div name="second" data-close>
    <template role="tab">
      <xin-icon
        style="
          display: inline-block;
          width: 16px;
          height: 16px;
          transform: translateY(2px);
          margin-right: 4px;
          stroke: var(--brand-color);
        "
        icon="eye"
      ></xin-icon>
      <span>Ooooh!!!</span>
    </template>
    look at the html…
  </div>
  <div name="third">third body</div>
  <button class="add" slot="after-tabs">
    <xin-icon icon="plus"></xin-icon>
  </button>
</xin-tabs>
```
```css
  .preview xin-tabs {
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

The `<xin-tabs>`s `value` is the index of its active body.

A `<xin-tabs>` has `addTabBody(body: HTMLElement, select?: boolean)` and
`removeTabBody(body: number | HTMLElement)` methods for updating its content.

You can also just insert or remove tab bodies directly and call `setupTabs()`.

## Closeable Tabs

Adding the `data-close` attribute to a tab will make it closeable.

When a tab is closed, the `<xin-tabs>` element's `onCloseTab: (tabBody: Element) => boolean | undefined | void`
will be called. If you override this method and return `false`, the tab will
not be closed (e.g. if you want to implement save/cancel behavior).

## Custom Tab Content

You can specify the exact content of the tab for a given body by
adding a `<template role="tab">` to that body. The contents of that
template will be cloned into the tab.

## Localized Support

```html
<xin-tabs localized>
  <div name="localize"><h2>localize!</h2></div>
  <div name="tabs"><h2>tabs</h2></div>
</xin-tabs>
```

`<xin-tabs>` supports the `localized` attribute. It will automatically localize
tab names (but it won't override custom tab content, so localizing that is on you).
*/

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  vars,
  PartsMap,
} from 'tosijs'

import { xinLocalized, XinLocalized } from './localize'

import { icons } from '../src'

const { div, slot, span, button } = elements

type TabCloseHandler = (tabBody: Element) => boolean | undefined | void

interface TabsParts extends PartsMap {
  tabs: HTMLElement
  selected: HTMLElement
}

export class TabSelector extends WebComponent {
  value = 0
  localized = false

  makeTab(
    tabs: TabSelector,
    tabBody: HTMLElement,
    bodyId: string
  ): HTMLElement {
    const tabName = tabBody.getAttribute('name') as string
    const tabContent =
      (
        tabBody.querySelector('template[role="tab"]') as HTMLTemplateElement
      )?.content.cloneNode(true) ||
      (this.localized ? xinLocalized(tabName) : span(tabName))
    const tab = div(
      tabContent,
      {
        part: 'tab',
        tabindex: 0,
        role: 'tab',
        ariaControls: bodyId,
      },
      tabBody.hasAttribute('data-close')
        ? button(
            {
              title: 'close',
              class: 'close',
            },
            icons.x()
          )
        : {}
    )
    return tab
  }

  static styleSpec = {
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
    ':host .tabs': {
      display: 'flex',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    },
    ':host .tabs > div': {
      padding: `${vars.spacing50} ${vars.spacing}`,
      cursor: 'default',
      display: 'flex',
      alignItems: 'baseline',
    },
    ':host .tabs > [aria-selected="true"]': {
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
      transition: 'ease-out 0.2s',
    },
    ':host button.close': {
      border: 0,
      background: 'transparent',
      textAlign: 'center',
      marginLeft: vars.spacing50,
      padding: 0,
    },
    ':host button.close > svg': {
      height: '12px',
    },
  }

  onCloseTab: TabCloseHandler | null = null

  content = [
    div(
      { role: 'tabpanel', part: 'tabpanel' },
      div(
        { part: 'tabrow' },
        div({ class: 'tabs', part: 'tabs' }),
        div({ class: 'elastic' }),
        slot({ name: 'after-tabs' })
      ),
      div({ class: 'border' }, div({ class: 'selected', part: 'selected' }))
    ),
    slot(),
  ]

  constructor() {
    super()
    this.initAttributes('localized')
  }

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
    const isCloseEvent = target.closest('button.close') !== null
    const tab = target.closest('.tabs > div') as HTMLElement
    const tabIndex = [...tabs.children].indexOf(tab)
    if (isCloseEvent) {
      const body = this.bodies[tabIndex]
      if (!this.onCloseTab || this.onCloseTab(body) !== false) {
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
      const tab = this.makeTab(this, tabBody, bodyId)
      tabs.append(tab)
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    const { tabs } = this.parts
    tabs.addEventListener('click', this.pickTab)
    tabs.addEventListener('keydown', this.keyTab)
    this.setupTabs()
    XinLocalized.allInstances.add(this)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    XinLocalized.allInstances.delete(this)
  }

  localeChanged = () => {
    this.queueRender()
  }

  onResize(): void {
    this.queueRender()
  }

  render(): void {
    const { tabs, selected } = this.parts as TabsParts
    const tabBodies = this.bodies
    for (let i = 0; i < tabBodies.length; i++) {
      const tabBody = tabBodies[i]
      const tab = tabs.children[i] as HTMLElement
      if (this.value === Number(i)) {
        tab.setAttribute('aria-selected', 'true')
        selected.style!.marginLeft = `${tab.offsetLeft - tabs.offsetLeft}px`
        selected.style!.width = `${tab.offsetWidth}px`
        tabBody.toggleAttribute('hidden', false)
      } else {
        tab.toggleAttribute('aria-selected', false)
        tabBody.toggleAttribute('hidden', true)
      }
    }
  }
}

export const tabSelector = TabSelector.elementCreator({
  tag: 'xin-tabs',
}) as ElementCreator<TabSelector>
