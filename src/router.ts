/*#
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

defineRoutes([
  { pattern: '', targets: [{ component: home }] },
  { pattern: 'about', targets: [{ component: about }] },
  { pattern: 'greet/:name', targets: [{ component: greeting }] },
])

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

defineRoutes([
  {
    pattern: 'photos/:id/edit',
    targets: [
      { view: 'main', component: mainContent },
      { view: 'tools', component: sidebar },
    ],
  },
])

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
*/

import { Component, ElementCreator, tosi } from 'tosijs'

// ============================================================================
// Types
// ============================================================================

export interface RouteParams {
  [key: string]: string
}

export interface RouteTarget {
  view?: string
  component: (params: RouteParams) => HTMLElement
}

export interface RouteDefinition {
  pattern: string
  targets: RouteTarget[]
  fallback?: boolean
}

export interface RouterOptions {
  hashRouting?: boolean
}

interface CompiledRoute {
  regex: RegExp
  paramNames: string[]
  targets: RouteTarget[]
  fallback: boolean
}

// ============================================================================
// Router State
// ============================================================================

export const { router } = tosi({
  router: {
    path: '',
    hash: '',
    pattern: '',
  },
})

let routerParams: RouteParams = {}

export function getRouterParams(): RouteParams {
  return { ...routerParams }
}

// ============================================================================
// Route Registry
// ============================================================================

let compiledRoutes: CompiledRoute[] = []
let useHashRouting = false
const viewRegistry = new Set<TosiRouteView>()

// ============================================================================
// Pattern Compilation
// ============================================================================

function compilePattern(pattern: string): {
  regex: RegExp
  paramNames: string[]
} {
  const paramNames: string[] = []

  if (pattern === '') {
    return { regex: /^\/?$/, paramNames }
  }

  const regexParts = pattern.split('/').map((segment) => {
    if (segment.startsWith(':')) {
      paramNames.push(segment.slice(1))
      return '([^/]+)'
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })

  const regex = new RegExp('^/?' + regexParts.join('/') + '/?$')
  return { regex, paramNames }
}

// ============================================================================
// Route Matching
// ============================================================================

function matchRoute(path: string): {
  route: CompiledRoute
  params: RouteParams
} | null {
  const cleanPath = path.split('?')[0].split('#')[0]

  for (const route of compiledRoutes) {
    if (route.fallback) continue
    const match = cleanPath.match(route.regex)
    if (match) {
      const params: RouteParams = {}
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1])
      })
      return { route, params }
    }
  }

  // Try fallback route
  const fallback = compiledRoutes.find((r) => r.fallback)
  if (fallback) {
    return { route: fallback, params: {} }
  }

  return null
}

// ============================================================================
// Rendering
// ============================================================================

function renderRoute(): void {
  const path = useHashRouting
    ? window.location.hash.replace(/^#\/?/, '')
    : window.location.pathname

  router.path.value = path
  router.hash.value = window.location.hash

  const match = matchRoute(path)

  if (match) {
    routerParams = match.params
    router.pattern.value = match.route.regex.source

    const targetsByView = new Map<string, RouteTarget>()
    for (const target of match.route.targets) {
      targetsByView.set(target.view ?? 'default', target)
    }

    for (const view of viewRegistry) {
      const viewName = view.name || 'default'
      const target = targetsByView.get(viewName)
      if (target) {
        view.replaceChildren(target.component(match.params))
      } else {
        view.replaceChildren()
      }
    }
  } else {
    routerParams = {}
    router.pattern.value = ''
    for (const view of viewRegistry) {
      view.replaceChildren()
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

let initialized = false

function ensureListeners(): void {
  if (initialized) return
  initialized = true

  window.addEventListener('popstate', renderRoute)
  window.addEventListener('hashchange', renderRoute)
}

export function defineRoutes(
  routes: RouteDefinition[],
  options: RouterOptions = {}
): void {
  useHashRouting = options.hashRouting ?? false

  compiledRoutes = routes.map((def) => {
    const { regex, paramNames } = compilePattern(def.pattern)
    return {
      regex,
      paramNames,
      targets: def.targets,
      fallback: def.fallback ?? false,
    }
  })

  ensureListeners()
  renderRoute()
}

export function navigate(path: string): void {
  ensureListeners()

  if (useHashRouting) {
    window.location.hash = '#/' + path.replace(/^\//, '')
  } else {
    window.history.pushState({}, '', '/' + path.replace(/^\//, ''))
  }

  renderRoute()
}

// ============================================================================
// Route View Component
// ============================================================================

export class TosiRouteView extends Component {
  static preferredTagName = 'tosi-route-view'

  static initAttributes = {
    name: 'default',
  }

  content = null

  connectedCallback(): void {
    super.connectedCallback()
    viewRegistry.add(this)
    // Re-render if routes are already defined
    if (compiledRoutes.length > 0) {
      renderRoute()
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    viewRegistry.delete(this)
  }
}

export const tosiRouteView =
  TosiRouteView.elementCreator() as ElementCreator<TosiRouteView>
