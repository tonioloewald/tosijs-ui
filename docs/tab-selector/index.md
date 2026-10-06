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
  <button class="add" slot="after-tabs">
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
