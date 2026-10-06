# router

A lightweight client-side router for single-page applications. Supports
pattern matching with named parameters, hash-based routing, and multiple
named route views (slots).

## Basic Usage

```js
import { defineRoutes, navigate, router, tosiRouteView } from 'tosijs-ui'

const home = () => {
  const el = document.createElement('div')
  el.textContent = 'Home page'
  return el
}

const about = () => {
  const el = document.createElement('div')
  el.textContent = 'About page'
  return el
}

const greeting = (params) => {
  const el = document.createElement('div')
  el.textContent = `Hello, ${params.name}!`
  return el
}

defineRoutes(
  [
    { pattern: '', targets: [{ component: home }] },
    { pattern: 'about', targets: [{ component: about }] },
    { pattern: 'greet/:name', targets: [{ component: greeting }] },
  ],
  { hashRouting: true }
)

preview.append(
  tosiRouteView(),
)

// Navigate programmatically
navigate('greet/World')
```

## Named Views

Routes can target multiple named views simultaneously. This is useful
for layouts where a route change should update several areas of the page.

```js
import { defineRoutes, navigate, tosiRouteView } from 'tosijs-ui'

const mainContent = (params) => {
  const el = document.createElement('div')
  el.textContent = `Editing photo ${params.id}`
  el.style.padding = '12px'
  el.style.background = '#f0f0f0'
  return el
}

const sidebar = () => {
  const el = document.createElement('div')
  el.textContent = 'Color palette tools'
  el.style.padding = '12px'
  el.style.background = '#e0e0ff'
  return el
}

defineRoutes(
  [
    {
      pattern: 'photos/:id/edit',
      targets: [
        { view: 'main', component: mainContent },
        { view: 'tools', component: sidebar },
      ],
    },
  ],
  { hashRouting: true }
)

const container = document.createElement('div')
container.style.display = 'flex'
container.style.gap = '8px'
container.append(
  tosiRouteView({ name: 'main', style: { flex: '1' } }),
  tosiRouteView({ name: 'tools', style: { width: '200px' } }),
)
preview.append(container)

navigate('photos/42/edit')
```

## Hash Routing

Set `hashRouting: true` when defining routes to use hash-based URLs
(`#/path`) instead of History API paths. This is useful when your app
is served from a static file server that doesn't support URL rewriting.

```js
import { defineRoutes, navigate, tosiRouteView } from 'tosijs-ui'

defineRoutes(
  [
    {
      pattern: 'page/:id',
      targets: [{
        component: (p) => {
          const el = document.createElement('div')
          el.textContent = `Page ${p.id}`
          return el
        },
      }],
    },
  ],
  { hashRouting: true }
)

preview.append(tosiRouteView())
navigate('page/1')
```
