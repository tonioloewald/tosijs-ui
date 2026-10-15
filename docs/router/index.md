# router

A lightweight client-side router for single-page applications. Supports
pattern matching with named parameters, hash-based routing, and multiple
named route views (slots).

## Basic Usage

```js
import { defineRoutes, navigate, router, tosiRouteView } from 'tosijs-ui'
import { elements } from 'tosijs'

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

const routes = [
  { pattern: '', targets: [{ component: home }] },
  { pattern: 'about', targets: [{ component: about }] },
  { pattern: 'greet/:name', targets: [{ component: greeting }] },
]

// An app calls defineRoutes once. This page has several router examples sharing the
// one router, so each link here defines its routes again before it navigates.
const go = (path) => () => {
  defineRoutes(routes, { hashRouting: true })
  navigate(path)
}

const { button, nav } = elements
preview.append(
  nav(
    button({ onClick: go('') }, 'Home'),
    button({ onClick: go('about') }, 'About'),
    button({ onClick: go('greet/World') }, 'Greet World')
  ),
  tosiRouteView(),
)

// Navigate programmatically
go('greet/World')()
```
```test
test('the first example holds the router when the page loads', async () => {
  for (let i = 0; i < 50 && !preview.textContent.includes('Hello, World!'); i++) {
    await waitMs(20)
  }
  expect(preview.textContent).toContain('Hello, World!')
})
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

const show = () => {
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
  navigate('photos/42/edit')
}

const container = document.createElement('div')
container.style.display = 'flex'
container.style.gap = '8px'
container.append(
  tosiRouteView({ name: 'main', style: { flex: '1' } }),
  tosiRouteView({ name: 'tools', style: { width: '200px' } }),
)
// An app has one router, and so does this page: the example above holds it, so this one
// routes when you ask it to.
const note = document.createElement('p')
note.textContent = 'One router serves the page; the example above holds it until you press:'
const showButton = document.createElement('button')
showButton.textContent = 'Edit photo 42'
showButton.addEventListener('click', show)
preview.append(note, showButton, container)
```

## Hash Routing

Set `hashRouting: true` when defining routes to use hash-based URLs
(`#/path`) instead of History API paths. This is useful when your app
is served from a static file server that doesn't support URL rewriting.
The examples above all use it.

```js:static
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
